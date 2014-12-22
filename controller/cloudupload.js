'use strict';

var path = require('path'),
	async = require('async'),
	fs = require('fs-extra'),
	formidable = require('formidable'),
	pkgcloud = require('pkgcloud'),
	Utilities = require('periodicjs.core.utilities'),
	ControllerHelper = require('periodicjs.core.controller'),
	Extensions = require('periodicjs.core.extensions'),
	extend = require('util-extend'),
	cloudprovider,
	cloudproviderfilepath,
	cloudstorageclient,
	cloudStorageClientError,
	cloudStorageContainer,
	cloudStoragePublicPath,
	CoreExtension,
	CoreUtilities,
	CoreController,
	appSettings,
	mongoose,
	MediaAsset,
	logger;

/**
 * upload a document from a form upload, store it in your cloud provider storage, remove from server after moved to cloud service
 * @param  {object} req 
 * @param  {object} res 
 * @return {Function} next() callback
 */
var upload = function (req, res, next) {
	if (cloudStorageClientError) {
		CoreController.handleDocumentQueryErrorResponse({
			err: cloudStorageClientError,
			res: res,
			req: req
		});
	}
	else {
		var form = new formidable.IncomingForm(),
			files = [],
			returnFile,
			returnFileObj = {},
			formfields,
			formfiles,
			d = new Date(),
			clouddir = 'clouduploads/files/' + d.getUTCFullYear() + '/' + d.getUTCMonth() + '/' + d.getUTCDate(),
			uploadDirectory = '/public/' + clouddir,
			fullUploadDir = path.join(process.cwd(), uploadDirectory);
		req.controllerData = (req.controllerData) ? req.controllerData : {};

		fs.ensureDir(fullUploadDir, function (err) {
			if (err) {
				CoreController.handleDocumentQueryErrorResponse({
					err: err,
					res: res,
					req: req
				});
			}
			else {
				form.keepExtensions = true;
				form.uploadDir = fullUploadDir;
				form.parse(req, function (err, fields, files) {
					formfields = fields;
					formfiles = files;
					// console.log(err, fields, files);
				});
				form.on('error', function (err) {
					logger.error(err);
					CoreController.handleDocumentQueryErrorResponse({
						err: err,
						res: res,
						req: req
					});
				});
				form.on('file', function (field, file) {
					returnFile = file;
					files.push(file);
				});
				form.on('end', function () {
					var namespacewithusername = (req.user && req.user._id)? req.user._id.toString() + '-' : '',
						newfilename = namespacewithusername + CoreUtilities.makeNiceName(path.basename(returnFile.name, path.extname(returnFile.name))) + path.extname(returnFile.name),
						newfilepath = path.join(clouddir, newfilename);

					var localuploadfile = fs.createReadStream(returnFile.path);

					var deletelocalfile = function(){ 
						fs.remove(returnFile.path, function (err) {
							if (err) {
								logger.error(err);
							}
							else {
								logger.silly('removing temp file', returnFile.path);
							}
						});
					};
					try{
						var cloudupload =	cloudstorageclient.upload({
							container: cloudStorageContainer,
							remote: newfilepath,
							local: returnFile.path,
					    ACL: 'public-read',
							headers: { 
							// optionally provide raw headers to send to cloud files
								'Cache-Control': 'max-age=86400'
							}
						});

						// cloudupload.on('data',function(data){
						// 	console.log('cloudupload data',data);
						// });

						cloudupload.on('error',function(err){
							console.log('cloudupload error',err);
							logger.error(err);
							CoreController.handleDocumentQueryErrorResponse({
								err: err,
								res: res,
								req: req
							});
							deletelocalfile();
						});

						cloudupload.on('success',function(file){
							returnFileObj.attributes = cloudStoragePublicPath;
							returnFileObj.size = returnFile.size;
							returnFileObj.filename = returnFile.name;
							returnFileObj.assettype = returnFile.type;
							returnFileObj.path = newfilepath;
							returnFileObj.locationtype = cloudprovider.provider;
							// returnFileObj.attributes.periodicDirectory = uploadDirectory;
							// returnFileObj.attributes.periodicPath = path.join(cloudStoragePublicPath.cdnUri,newfilepath);
							returnFileObj.fileurl = cloudStoragePublicPath.cdnUri + '/' + newfilepath;
							returnFileObj.attributes.periodicFilename = newfilename;
							returnFileObj.attributes.cloudfilepath = newfilepath;
							returnFileObj.attributes.cloudcontainername = cloudStorageContainer.name || cloudStorageContainer;

							// console.log('cloudupload file',file)
							// console.log('returnFileObj', returnFileObj);

							// req.controllerData.fileData = returnFileObj;
							req.controllerData.fileData = extend(returnFileObj,formfields);

							next();
							deletelocalfile();
						});

						cloudupload.on('end',function(){
							console.log('cloudupload ended');
						});

						localuploadfile.pipe(cloudupload);
					}
					catch(e){
						logger.error(e);
						CoreController.handleDocumentQueryErrorResponse({
							err: e,
							res: res,
							req: req
						});
						deletelocalfile();
					}

				});
			}
		});
		
	}
};

/**
 * deletes file from cloud and removes document from mongo database
 * @param  {object} req 
 * @param  {object} res 
 */
var remove = function (req, res, next) {
	var asset = req.controllerData.asset;
	// console.log('asset', asset);
	if (asset.locationtype === 'rackspace' || asset.locationtype === 'amazon') {
		async.parallel({
			deletefile: function (callback) {
				cloudstorageclient.removeFile(asset.attributes.cloudcontainername, asset.attributes.cloudfilepath, callback);
			},
			removeasset: function (callback) {
				CoreController.deleteModel({
					model: MediaAsset,
					deleteid: asset._id,
					req: req,
					res: res,
					callback: callback
				});
			}
		}, function (err
			//, results
		) {
			if (err) {
				CoreController.handleDocumentQueryErrorResponse({
					err: err,
					res: res,
					req: req
				});
			}
			else {
				CoreController.handleDocumentQueryRender({
					req: req,
					res: res,
					redirecturl: '/p-admin/assets',
					responseData: {
						result: 'success',
						data: asset
					}
				});
			}
		});
	}
	else{
		next();
	}
};

/**
 * create storage container from configuration in provider.json
 * @param  {object} req 
 * @param  {object} res 
 * @return {Function} next() callback
 */
var createStorageContainer = function () {
	fs.readJson(cloudproviderfilepath, function (err, data) {
		if (err) {
			cloudStorageClientError = err;
			logger.error('createStorageContainer readJson cloudproviderfilepath',cloudproviderfilepath);
			logger.error(err);
		}
		else {
			try {
				cloudprovider = data[appSettings.application.environment];
				cloudstorageclient = pkgcloud.storage.createClient(cloudprovider);
				var storageContainerOptions = {
						name: (cloudprovider.containername) ? cloudprovider.containername : 'periodicjs',
						type: 'public',
						metadata: {
							env: appSettings.application.environment,
							name: appSettings.name
						}
					};
				if(cloudprovider.provider ==='amazon'){

					cloudStorageContainer = cloudprovider.containername || cloudprovider.Bucket ||  cloudprovider.bucket;
					cloudStoragePublicPath = {
						cdnUri: 'http://'+cloudstorageclient.s3.config.endpoint+'/'+cloudStorageContainer,
						cdnSslUri: cloudstorageclient.s3.endpoint.href+cloudStorageContainer,
						endpoint:cloudstorageclient.s3.endpoint
					};
				}
				// console.log('cloudstorageclient',cloudstorageclient);
				// console.log('cloudprovider',cloudprovider);
				// // console.log('storageContainerOptions',storageContainerOptions);

				else if(cloudprovider.provider ==='rackspace'){
					cloudstorageclient.createContainer(
						storageContainerOptions,
						function (err, container) {
							if (err) {
								console.log('failed on storage client',err);
								console.log(err.stack);
								cloudStorageClientError = err;
								throw Error(err);
							}
							else {
								console.log('created container');
								cloudStorageContainer = container;
								if (cloudprovider.provider === 'rackspace') {
									cloudstorageclient.setCdnEnabled(cloudStorageContainer, true, function (error, cont) {
										if (error) {
											cloudStorageClientError = error;
											throw Error(error);
										}
										else if (cont) {
											cloudStoragePublicPath = {
												cdnUri: cont.cdnUri,
												cdnSslUri: cont.cdnSslUri,
												cdnStreamingUri: cont.cdnStreamingUri,
												cdniOSUri: cont.cdniOSUri
											};
											// console.log('cont', cont);
											// console.log('cloudStoragePublicPath', cloudStoragePublicPath);
											logger.silly('Successfully Created CDN Bucket');
										}
									});
								}
							}
						});
				}
				cloudprovider.containername = cloudprovider.containername || cloudprovider.Bucket ||  cloudprovider.bucket || 'periodicjs';
			}
			catch (e) {
				logger.error('cloudstorageclient.createContainer cloudStorageClientError');
				cloudStorageClientError = e;
				console.log(e);
				logger.error(e);
			}
		}
	});
};

/**
 * cloudupload controller
 * @module clouduploadController
 * @{@link https://github.com/typesettin/periodicjs.ext.clouduploads}
 * @author Yaw Joseph Etse
 * @copyright Copyright (c) 2014 Typesettin. All rights reserved.
 * @license MIT
 * @requires module:async
 * @requires module:path
 * @requires module:fs-extra
 * @requires module:formidable
 * @requires module:pkgcloud
 * @requires module:periodicjs.core.utilities
 * @requires module:periodicjs.core.controller
 * @requires module:periodicjs.core.extensions
 * @param  {object} resources variable injection from current periodic instance with references to the active logger and mongo session
 */
var controller = function (resources) {
	logger = resources.logger;
	mongoose = resources.mongoose;
	appSettings = resources.settings;
	CoreController = new ControllerHelper(resources);
	CoreUtilities = new Utilities(resources);
	CoreExtension = new Extensions(appSettings);
	MediaAsset = mongoose.model('Asset');
	cloudproviderfilepath = path.join(CoreExtension.getconfigdir({
		extname: 'periodicjs.ext.clouduploads'
	}), 'provider.json');
	// Collection = mongoose.model('Collection');
	// 
	// cdn files: https://github.com/pkgcloud/pkgcloud/issues/324
	// rackspace: https://gist.github.com/rdodev/129592b4addcebdf6ccd
	createStorageContainer();

	return {
		upload: upload,
		remove: remove
	};
};

module.exports = controller;

'use strict';

var path = require('path'),
	async = require('async'),
	fs = require('fs-extra'),
	formidable = require('formidable'),
	pkgcloud = require('pkgcloud'),
	Utilities = require('periodicjs.core.utilities'),
	ControllerHelper = require('periodicjs.core.controllerhelper'),
	Extensions = require('periodicjs.core.extensions'),
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

var upload = function (req, res, next) {
	if (cloudStorageClientError) {
		CoreController.handleDocumentQueryErrorResponse({
			err: cloudStorageClientError,
			res: res,
			req: req
		});
	}
	else {
		// console.log('cloudprovider',cloudprovider);
		var form = new formidable.IncomingForm(),
			files = [],
			returnFile,
			returnFileObj = {},
			// fields = [],
			d = new Date(),
			clouddir = 'clouduploads/files/' + d.getUTCFullYear() + '/' + d.getUTCMonth() + '/' + d.getUTCDate(),
			uploadDirectory = '/public/' + clouddir,
			fullUploadDir = path.join(process.cwd(), uploadDirectory);
		req.controllerData = (req.controllerData) ? req.controllerData : {};

		form.keepExtensions = true;
		form.uploadDir = fullUploadDir;
		form.parse(req, function (err, fields, files) {
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
			var newfilename = req.user._id.toString() + '-' + CoreUtilities.makeNiceName(path.basename(returnFile.name, path.extname(returnFile.name))) + path.extname(returnFile.name),
				newfilepath = path.join(clouddir, newfilename);


			cloudstorageclient.upload({
				container: cloudStorageContainer,
				remote: newfilepath,
				local: returnFile.path,
				headers: { // optionally provide raw headers to send to cloud files
					'Cache-Control': 'max-age=86400'
				}
			}, function (err, result) {
				//remove temp file
				fs.remove(returnFile.path, function (err) {
					if (err) {
						logger.error(err);
					}
					else {
						logger.silly('removing temp file', returnFile.path);
					}
				});

				if (err) {
					logger.error(err);
					CoreController.handleDocumentQueryErrorResponse({
						err: err,
						res: res,
						req: req
					});
				}
				else if (result) {
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
					// console.log('returnFileObj', returnFileObj);
					req.controllerData.fileData = returnFileObj;
					next();
				}
			});
		});
	}
};

var remove = function (req, res) {
	var asset = req.controllerData.asset;
	console.log('asset', asset);
	if (asset.locationtype === 'rackspace') {
		async.parallel({
			deletefile: function (callback) {
				cloudstorageclient.removeFile(asset.attributes.cloudfilepath, callback);
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
};

// var createStorageContainer = function () {

// };

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

	fs.readJson(cloudproviderfilepath, function (err, data) {
		if (err) {
			cloudStorageClientError = err;
			logger.error(err);
		}
		else {
			try {
				cloudprovider = data[appSettings.application.environment];
				cloudstorageclient = pkgcloud.storage.createClient(cloudprovider);

				cloudstorageclient.createContainer({
						name: 'periodic-uploads-env-' + appSettings.application.environment,
						type: 'public',
						metadata: {
							env: appSettings.application.environment,
							name: appSettings.name
						}
					},
					function (err, container) {
						if (err) {
							cloudStorageClientError = err;
							throw Error(err);
						}
						else {
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
										logger.silly('Successfully Created CDN Bucket');
									}
								});
							}
						}
					});
			}
			catch (e) {
				cloudStorageClientError = e;
				logger.error(e);
			}
		}
	});
	return {
		upload: upload,
		remove: remove
	};
};

module.exports = controller;

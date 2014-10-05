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
	CoreExtension,
	CoreUtilities,
	CoreController,
	appSettings,
	mongoose,
	MediaAsset,
	logger;

var upload = function (req, res, next) {
	if(cloudStorageClientError){
		CoreController.handleDocumentQueryErrorResponse({
			err: cloudStorageClientError,
			res: res,
			req: req
		});
	}
	else{

	}
	console.log('cloudprovider',cloudprovider);
	

	// var form = new formidable.IncomingForm(),
	// 	files = [],
	// 	returnFile,
	// 	returnFileObj = {},
	// 	// fields = [],
	// 	d = new Date(),
	// 	uploadDirectory = '/public/clouduploads/files/' + d.getUTCFullYear() + '/' + d.getUTCMonth() + '/' + d.getUTCDate(),
	// 	fullUploadDir = path.join(process.cwd(), uploadDirectory);
	// req.controllerData = (req.controllerData) ? req.controllerData : {};
	// fs.ensureDir(fullUploadDir, function (err) {
	// 	if (err) {
	// 		CoreController.handleDocumentQueryErrorResponse({
	// 			err: err,
	// 			res: res,
	// 			req: req
	// 		});
	// 	}
	// 	else {
	// 		// http://stackoverflow.com/questions/20553575/how-to-cancel-user-upload-in-formidable-node-js
	// 		form.keepExtensions = true;
	// 		form.uploadDir = fullUploadDir;
	// 		form.parse(req, function (err, fields, files) {
	// 			logger.silly(err, fields, files);
	// 		});
	// 		form.on('error', function (err) {
	// 			logger.error(err);
	// 			CoreController.handleDocumentQueryErrorResponse({
	// 				err: err,
	// 				res: res,
	// 				req: req
	// 			});
	// 		});
	// 		form.on('file', function (field, file) {
	// 			returnFile = file;
	// 			files.push(file);
	// 		});
	// 		form.on('end', function () {
	// 			var newfilename = req.user._id.toString() + '-' + CoreUtilities.makeNiceName(path.basename(returnFile.name, path.extname(returnFile.name))) + path.extname(returnFile.name),
	// 				newfilepath = path.join(fullUploadDir, newfilename);
	// 			fs.rename(returnFile.path, newfilepath, function (err) {
	// 				if (err) {
	// 					CoreController.handleDocumentQueryErrorResponse({
	// 						err: err,
	// 						res: res,
	// 						req: req
	// 					});
	// 				}
	// 				else {
	// 					returnFileObj.attributes = {};
	// 					returnFileObj.size = returnFile.size;
	// 					returnFileObj.filename = returnFile.name;
	// 					returnFileObj.assettype = returnFile.type;
	// 					returnFileObj.path = newfilepath;
	// 					returnFileObj.locationtype = 'local';
	// 					returnFileObj.attributes.periodicDirectory = uploadDirectory;
	// 					returnFileObj.attributes.periodicPath = path.join(uploadDirectory, newfilename);
	// 					returnFileObj.fileurl = returnFileObj.attributes.periodicPath.replace('/public', '');
	// 					returnFileObj.attributes.periodicFilename = newfilename;
	// 					// console.log('returnFileObj',returnFileObj);
	// 					req.controllerData.fileData = returnFileObj;
	// 					next();
	// 				}
	// 			});
	// 		});
	// 	}
	// });
};

var controller = function (resources) {
	logger = resources.logger;
	mongoose = resources.mongoose;
	appSettings = resources.settings;
	CoreController = new ControllerHelper(resources);
	CoreUtilities = new Utilities(resources);
	CoreExtension = new Extensions(appSettings);
	MediaAsset = mongoose.model('Asset');
	cloudproviderfilepath = path.join(CoreExtension.getconfigdir({extname:'periodicjs.ext.clouduploads'}),'provider.json');
	// Collection = mongoose.model('Collection');
	fs.readJson(cloudproviderfilepath,function(err,data){
		if(err){
			cloudStorageClientError = err;
			logger.error(err);
		}
		else{
			try{
				cloudprovider = data[appSettings.application.environment];
				cloudstorageclient = pkgcloud.storage.createClient(cloudprovider);

				cloudstorageclient.createContainer({
						name: 'periodic-uploads-env-'+appSettings.application.environment,
						metadata: {
						env: appSettings.application.environment,
						name: appSettings.name
						}
					}, 
					function(err, container) {
						if(err){
							throw Error(err);
						}
						else{
							cloudStorageContainer = container;
						}
				});
			}
			catch(e){
				cloudStorageClientError = e;
				logger.error(e);
			}
		}
	});

	return {
		upload: upload,
	};
};

module.exports = controller;

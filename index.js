'use strict';

/**
 * An asset upload manager that uses pkgcloud to upload to the various cloud service providers (amazon s3, rackspace cloud files
 * @{@link https://github.com/typesettin/periodicjs.ext.clouduploads}
 * @author Yaw Joseph Etse
 * @copyright Copyright (c) 2014 Typesettin. All rights reserved.
 * @license MIT
 * @exports periodicjs.ext.clouduploads
 * @requires module:path
 * @param  {object} periodic variable injection of resources from current periodic instance
 */
module.exports = function (periodic) {
	// express,app,logger,config,db,mongoose
	periodic.app.controller.extension.cloudupload = {
		cloudupload: require('./controller/cloudupload')(periodic)
	};

	var clouduploadController = periodic.app.controller.extension.cloudupload.cloudupload,
		mediaassetController = periodic.app.controller.native.asset,
		mediaRouter = periodic.express.Router();

	/**
	 * admin/media manager routes
	 */
	mediaRouter.post('/new', clouduploadController.upload, mediaassetController.createassetfile);
	mediaRouter.post('/:id/delete', mediaassetController.loadAsset, clouduploadController.remove, mediaassetController.remove );

	periodic.app.use('/mediaasset', mediaRouter);
	return periodic;
};

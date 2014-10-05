'use strict';
var path = require('path');

module.exports = function(periodic){
	// express,app,logger,config,db,mongoose
	var clouduploadController = require('./controller/cloudupload')(periodic),
		mediaassetController = require(path.resolve(process.cwd(), './app/controller/asset'))(periodic),
		mediaRouter = periodic.express.Router();


	/**
	 * admin/media manager routes
	 */
	mediaRouter.post('/new', clouduploadController.upload, mediaassetController.createassetfile);

	periodic.app.use('/mediaasset', mediaRouter);
};
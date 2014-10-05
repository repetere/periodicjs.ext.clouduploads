'use strict';

var path = require('path'),
		fs = require('fs-extra'),
		nodemailer = require('nodemailer'),
		Utilities = require('periodicjs.core.utilities'),
	  ControllerHelper = require('periodicjs.core.controllerhelper'),
	  Extensions = require('periodicjs.core.extensions'),
	  CoreMailer = require('periodicjs.core.mailer'),
		CoreExtension,
	  CoreUtilities,
	  CoreController,
		appSettings,
		mongoose,
		logger;

var sendmail = function(req, res){
	CoreMailer.getTransport({appenvironment : appSettings.application.environment},function(err,transport){
		if(err){
			CoreController.handleDocumentQueryErrorResponse({
				err:err,
				res:res,
				req:req
			});
		}
		else{
			var emailMessage = CoreUtilities.removeEmptyObjectValues(req.body);
			emailMessage.generateTextFromHTML = true;

			transport.sendMail(emailMessage,function(err,response){
				if(err){
					CoreController.handleDocumentQueryErrorResponse({
						err:err,
						res:res,
						req:req
					});
				}
				else{
					CoreController.handleDocumentQueryRender({
						res:res,
						req:req,
						responseData:{
							pagedata: {
								title:'Email Sent'
							},
							emailresponse:response,
							user:req.user
						}
					});
				}
			});
		}
	});
};

var controller = function(resources){
	logger = resources.logger;
	mongoose = resources.mongoose;
	appSettings = resources.settings;
  CoreController = new ControllerHelper(resources);
  CoreUtilities = new Utilities(resources);
	CoreExtension = new Extensions(appSettings);

	return{
		sendmail:sendmail
	};
};

module.exports = controller;
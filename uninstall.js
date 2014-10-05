'use strict';

var path = require('path'),
	fs = require('fs-extra'),
	extensionFilePath = path.resolve(__dirname,'../../content/extensions/extensions.json'),
	extensionFileJson = fs.readJSONSync(extensionFilePath),
	packagejsonFileJSON = fs.readJSONSync(path.resolve('./package.json')),
	extname = packagejsonFileJSON.name,
	extpublicdir = path.resolve(__dirname,'../../public/extensions/', extname),
	extconfigdir = path.resolve(__dirname,'../../content/config/extensions/', extname),
	Extensions= require('periodicjs.core.extensions'),
	ExtensionCore = new Extensions({
		extensionFilePath: extensionFilePath 
	});

ExtensionCore.uninstall({
		extname:extname,
		extpublicdir:extpublicdir,
		extconfigdir:extconfigdir,
		extensionFileJson:extensionFileJson
	},
	function(err,status){
		if(err){
			throw new Error(err);
		}
		else{
			console.log(status);
		}
});
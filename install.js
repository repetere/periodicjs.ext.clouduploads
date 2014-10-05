'use strict';

var path = require('path'),
	fs = require('fs-extra'),
	skipconffile = typeof process.env.npm_config_skip_install_periodic_ext ==='string',
	Extensions = require('periodicjs.core.extensions'),
	ExtensionCore = (skipconffile) ? 
		new Extensions({
			skipconffile:skipconffile,
		}) : 
		new Extensions({
			extensionFilePath: path.resolve(__dirname,'../../content/extensions/extensions.json') 
		}),
	packagejsonFileJSON = fs.readJSONSync(path.resolve('./package.json')),
	extname = packagejsonFileJSON.name,
	extdir = path.resolve( './public'),
	configdir = path.resolve( './config'),
	extpublicdir = path.resolve(__dirname,'../../public/extensions/', extname),
	extconfigdir = path.resolve(__dirname,'../../content/config/extensions/', extname),
	extpackfile = path.resolve('./package.json'),
	extconffile = path.resolve('./periodicjs.ext.json');

// console.log('skipconffile',skipconffile);
// $ npm install --skip-install-periodic-ext

ExtensionCore.install({
		enabled:false,
		extname:extname,
		extdir:extdir,
		configdir:configdir,
		skipconffile:skipconffile,
		extpublicdir:extpublicdir,
		extconfigdir:extconfigdir,
		extpackfile:extpackfile,
		extconffile:extconffile
	},
	function(err,status){
		if(err){
			throw new Error(err);
		}
		else{
			console.log(status);
			ExtensionCore.moveExtensionBefore({
				extname : extname,
				movebefore:'periodicjs.ext.admin'
			},function(err,movestatus){
				if(err){
					throw new Error(err);
				}
				else{
					console.log(movestatus);
				}
			});
		}
});


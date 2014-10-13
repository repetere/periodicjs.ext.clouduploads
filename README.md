# periodicjs.ext.clouduploads

An asset upload manager that uses pkgcloud to upload to the various cloud service providers (amazon s3, rackspace cloud files).

 [API Documentation](https://github.com/typesettin/periodicjs.ext.clouduploads/blob/master/doc/api.md)

## Installation

```
$ npm install periodicjs.ext.clouduploads
```

## Configure

you can define your own pkgcloud provider configuration, after the extension has been installed, the extension configuration is located in `content/config/extensions/periodicjs.ext.clouduploads/provider.json`

##Development
*Make sure you have grunt installed*
```
$ npm install -g grunt-cli
```

Then run grunt watch
```
$ grunt watch
```
For generating documentation
```
$ grunt doc
$ jsdoc2md controller/**/*.js index.js install.js uninstall.js > doc/api.md
```
##Notes
* Check out https://github.com/typesettin/periodicjs for the full Periodic Documentation
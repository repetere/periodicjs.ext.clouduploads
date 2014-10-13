#Index

**Modules**

* [periodicjs.ext.clouduploads](#periodicjs.ext.module_clouduploads)
* [clouduploadController](#module_clouduploadController)

**Functions**

* [upload(req, res)](#upload)
* [remove(req, res)](#remove)
* [createStorageContainer(req, res)](#createStorageContainer)
 
<a name="periodicjs.ext.module_clouduploads"></a>
#periodicjs.ext.clouduploads
An asset upload manager that uses pkgcloud to upload to the various cloud service providers (amazon s3, rackspace cloud files

**Params**

- periodic `object` - variable injection of resources from current periodic instance  

**Author**: Yaw Joseph Etse  
**License**: MIT  
**Copyright**: Copyright (c) 2014 Typesettin. All rights reserved.  
<a name="module_clouduploadController"></a>
#clouduploadController
cloudupload controller

**Params**

- resources `object` - variable injection from current periodic instance with references to the active logger and mongo session  

**Author**: Yaw Joseph Etse  
**License**: MIT  
**Copyright**: Copyright (c) 2014 Typesettin. All rights reserved.  
<a name="upload"></a>
#upload(req, res)
upload a document from a form upload, store it in your cloud provider storage, remove from server after moved to cloud service

**Params**

- req `object`  
- res `object`  

**Returns**: `function` - next() callback  
<a name="remove"></a>
#remove(req, res)
deletes file from cloud and removes document from mongo database

**Params**

- req `object`  
- res `object`  

<a name="createStorageContainer"></a>
#createStorageContainer(req, res)
create storage container from configuration in provider.json

**Params**

- req `object`  
- res `object`  

**Returns**: `function` - next() callback  

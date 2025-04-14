# repository-bridge
 
This module provides a simple CRUD API, enabling  applications to normalize the use of different P2P repositories such as IPFS or Bittorent, etc. The **repository bridge** helps with the storage of large files, i.e. bigger than one would want to travel in RPC messages between micro-services within an application cloud.

Local and LAN repositories are given by default for local operations. The LAN repository uses a local server, provided by this module when installed globally.

## Version Updates

**04-12-2025:** In this version, dependencies for large libraries such as IPFS and Bittorent have been removed for the basic installation. The next version will have a tutorial for adding in support for these repositories and others as plugins. A tool for starting up communication links after servers have started is becoming available [`com_link_manager`](https://www.npmjs.com/package/com_link_manager). This will support adding respositories to existing repository clients, e.g. [`global_persistence `](https://www.npmjs.com/package/global_persistence). Currently, this module provides `repo-bridge-update` to add to the list of supported repositories in an installation. (revision will occur here)

## Clients 

This class exported by this module is a client side user of different types of repositories. 


### Install
```
npm install -s repository-bridge
```



## Servers

```
npm install -g repository-bridge
```

This introduces two commands:

* **repo-bridge-update** -- A tool that helps introduce new repositories
* **repo-bridge-LAN-node** -- A repository node for a server on the LAN

## Repository Class Usage

The Repository class must be constructed and initialized after construction:

```
let repo = new Repository({},['local'])
await repo.init_repos()

```

The constuctor sets up configuration files to be used in creating new instances of repositories. The application can expect the Repository class to load JavaScript class instances of repository wrappers that allow repository class instances to use a uniform interfaces for creating and managing client class instances to different types of repositories. 

The constructor goes as far as loading the wrapper instances. But, the method `init_repose` loads the repository classes and runs any intialization that it must. Sometimes the repositories classes may be fairly extensive and do a lot of communication. So, the wrappers will be loaded and be ready to call on the vendor supplied repository insterfaces.


## Supported Repositories 

As concerns the client, certain repositories are available for storing data and moving it to desired locations. Two simple repositories are supported out of the box. Other repositories may be added by the application by telling clients that they can be used.


### A. supported out of the box

Within the module code there is a JS, `supported-repos.js` file that looks like the following:

```
{
    'local' : local_access,
    'LAN' : lan_access
}
```

Here, `local_access` and `lan_access` are instance references to client wrapper classes that expose specific methods used by the Repository instance object.

By default these are accepted for loading and initializng along with other modules that the calling application puts into its own configuation object.

When the client application creates a new Repository object, it selects which repositories it will use for storage, giving a pass to processes that send data to it, where those data objects can indicate a choice of repository:

Here is one initialization: 

```
let repo = new Repository({},['local','LAN'])
```

This initialization will load and initalize client code for using local and local-LAN repositories (LAN = Local Area Network... for clarity). In this case, the configuration object passed to the constructor of **Repository** specifies no configurations for the repository types; and so, the repositories will be initialized with defaults.

When the configuration are added the constuctor looks like the following:

```
let repo = new Repository({
	"local" : { ...desired parameters...},
	"LAN" : { ...desired parameters...} 
},['local','LAN'])
```


Applications may send data to be stored in either. For, instance, a data object that requests both repositories to be used may be served by an application that tells the **repo** instance to store data in the two types with successive calls, e.g.:

```
repo.add('local',data)
repo.add('LAN',data)
```

If the during construction, only one of the repositories had been included in the list, then only one storage option would be available to the data sender. For instance, with the following initialization: 

```
let repo = new Repository({},['local'])
```

Only, the call to `local` can be made: 

```
repo.add('local',data)
	// repo.add('LAN',data) error
```


### B. adding support for desired repositories

Now, what if the application wishes to support something like IPFS? Then, the application might try to start with the following:


```
let repo = new Repository({},['local','LAN', 'IPFS])
```

But, the applicaton would log an error message:

```
unsupported repository type - IPFS
```

The application has to extend the set of supported repositories by specifying it in the configuration. The first parameter of the constructor for **Repository** can have this information. A field name for the constructor is reserved. It is `_app_add_support`. Here is an example of how to us it in the configuration:

```
{
	"_app_add_support" : {
		"IPFS" : ipfs_access,
		"TORv1" : tor_access
	}
}
```

The constructions of the repository class can now look like the following:

```
let repo = new Repository({
	"_app_add_support" : {   
		"IPFS" : ipfs_access,
		"TORv1" : tor_access
	}
},['local','LAN', 'IPFS])
```

Now, calls like the following can be made:

```

repo.add('IPFS',data)
repo.add('LAN',data)

// repo.add(`TORv1`,data)  cannot yet be made inspice of having an instance.

```

Once again, the call to the constructor of Repository does not have configurations for the instances. But, these may be needed. So, the configurations should be added to the configuration parameter for the selected repositories:

Constructions of th repositories can now look like the following:

```
let repo = new Repository({
	"_app_add_support" : {
		"IPFS" : ipfs_access,    // wrapper class instances
		"TORv1" : tor_access
	},
	"local" : { ...necessary parameters... },
	"LAN" : { ...necessary parameters... },
	"IPFS" : { ...necessary parameters... }
},['local','LAN', 'IPFS])
```


### C. adding support after starting

Some services that may already be running may bennefit from adding in connections to repositories after they are already up running and using others. To that end, a method `update_supported_repositories` is included in the Repository class.

This method takes a configuration object specifying new wrapper instances, possible replacements, and which wrapper to start using during the call.

For example, the following call can be made sometime when the service is running:

```
	await repo.update_supported_repositories({
		"_app_add_support" : {
			"IPFS" : ipfs_access,    // wrapper class instances
			"TORv1" : tor_access
		},
		"_replacements" : { "IPFS" : true },
		"_activate_kinds" : [ "IPFS" ],
		"IPFS" : { ...necessary parameters... },
		"TORv1" : { ...necessary parameters... }
	})
```


The method call will add new wrappers for "IPFS" and "TORv1", replacing a previously installed "IPFS" wrapper. It will then turn on "IPFS" but not "TORv1".

A later call could turn on "TORv1" as such:

```
	await repo.update_supported_repositories({
		"_activate_kinds" : [ "TORv1" ]
	})
```

The above call uses the peviously supplied configuration to initialize the "TORv1" repository connection.


## Added local configuration

For testing and small operations, the repository bridge now has a 'local' repository option. 

This option uses local files in a configured director and up to three manifest files providing lookup information for the file which may be json, streamable, or text.


Otherwise, IPFS has been supported previously. It will be again after utilizing Helios.

Bittorent has nascent support.


## Update Tool

If the repository bridge is installed globally, a tool for updating repository support is available. The command line option for this is the following:

```
repo-bridge-update
```

It is assumed that the working directory has a file `repositories.json`.

This file is a JSON object mapping repository keys to the location of repsository interface modules. A basic one is shown in the next listing:

```
{
 "ifps"     : "./ipfs-link/accessor",
 "tor"      : "./torv1-link/accessor",
 "local"    : "./local-link/accessor"
}
```

The modules locations shown are ones that come with the respository bridge package. They may be others located whereever the operations development requires it.


## Update Tool

Repository accessor files provide a specific set of calls used by the one exported module class. Anyone intending to write a version of one of these should look at these for examples.



## Exported Class Methods

* constructor 
* `install_supported_repositories`
* `init_repos`
* `update_supported_repositories`
* store
* remove
* replace
* add
* `add_file`
* fetch
* ls
* cat
* diagnotistic
* `get_repo_errors`





## Adding in repositories:

```
    "qbittorrent-api-v2": "^1.2.2",
    "create-torrent": "^6.0.15",
    "ipfs": "^0.63.5",
    "transmission-promise": "^1.1.5"
```







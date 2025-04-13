# repository-bridge
 
This module provides a simple CRUD API, enabling  applications to normalize the use of different P2P repositories such as IPFS or Bittorent, etc.

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







# repository-bridge
 
This module provides a simple CRUD API, enabling  applications to normalize the use of different P2P repositories such as IPFS or Bittorent, etc.




## Added local configuration

For testing and small operations, the repository bridge now has a 'local' repository option. 

This option uses local files in a configured director and up to three manifest files providing lookup information for the file which may be json, streamable, or text.


Otherwise, IPFS has been supported previously. It will be again after utilizing Helios.

Bittorent has nascent support.


## Update Tool

If the repository bridge is installed globally, a tool for updating repositort support is available. The command line option for this is the following:

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











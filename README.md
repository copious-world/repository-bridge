# repository-bridge
 
This module provides a simple CRUD API, enabling  applications to normalize the use of different P2P repositories such as IPFS or Bittorent, etc.




## Added local configuration

For testing and small operations, the repository bridge now has a 'local' repository option. 

This option uses local files in a configured director and up to three manifest files providing lookup information for the file which may be json, streamable, or text.


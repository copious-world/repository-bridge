// ---- ---- ---- ---- ----
//
// for JS, keep reference to what is being used by the client in this map
// this map stores wrapper instances
//
let g_supported_repos = require('../supported-repos')

/**
 * Repository
 * 
 * This class services calls from a client caller to one of the supported repositories.
 * 
 * This class provides callers with a uniform interface to those repositories.
 * 
 * new Repository({},['local','LAN'])
 * 
 */
class Repository {

    constructor(config,kinds) {
        this.configs = {}       // for JS, keep reference to what is being used by the client in this map
        this.repos = {}
        this.repo_errors = []
        this.desired_kinds = kinds
        this.install_supported_repositories(config) // The config should include the repos the app wants to deal with 
    }

    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

    #extend_repository_support(support_update,replacements) {
        for ( let ky in support_update ) {
            if ( g_supported_repos[ky] === undefined ) {
                g_supported_repos[ky] = support_update[ky]  // add in the new wrapper instance
            } else if ( replacements && replacements[ky] ) {
                g_supported_repos[ky] = support_update[ky]  // add in the new wrapper instance
            }
        }
    }

    /**
     * install_supported_repositories
     * 
     * Reloads the supported repositories.
     * 
     * Currently the supported repositories are local (sandbox like)
     * 
     * @param {object} conf 
     */
    install_supported_repositories(conf) {
        //
        if ( conf === undefined ) {
            conf = this.configs  // auto if not provided
        }
        //
        try {
            //
            if ( typeof conf._app_add_support === 'object' ) {
                this.#extend_repository_support(conf._app_add_support)
            }
            //
            let kinds = this.desired_kinds
            for ( let k of kinds ) {        // keep the user application in control of what is loaded even when new repos are available...
                if ( k in g_supported_repos ) { // only add configuration for when there is an instance
                    if ( k in conf ) {
                        this.configs[k] = conf[k]   // add the configuration for the repository
                    } else {
                        this.configs[k] = {}
                    }
                } else {
                    this.repo_errors.push(new Error(`unsupported repository type - ${k}`))
                }
            }
            //
        } catch (e) {
            console.log(e)
        }
        //
    }


    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

    /**
     * update_supported_repositories
     * 
     * Reloads the supported repositories. 
     * 
     * returns boolean -- true if successful
     * 
     * @param {object} conf 
     */
    async update_supported_repositories(conf) {
        if ( conf === undefined ) {
            return false
        }
        //
        let new_activations = Object.keys(conf._app_add_support)
        if ( typeof conf._app_add_support === 'object' ) {
            if ( typeof conf._replacements === 'object' ) {
                this.#extend_repository_support(conf._app_add_support,conf._replacements)
            } else {
                this.#extend_repository_support(conf._app_add_support)
            }
        }
        //
        if ( (typeof conf._activate_kinds === 'object') && Array.isArray(conf._activate_kinds) ) {
            new_activations = conf._activate_kinds
        }
        // otherwise everything
        this.desired_kinds = this.desired_kinds.concat(new_activations)

        for ( let k of new_activations ) {        // keep the user application in control of what is loaded even when new repos are available...
            if ( k in g_supported_repos ) { // only add configuration for when there is an instance
                if ( k in conf ) {
                    this.configs[k] = conf[k]   // add the configuration for the repository
                } else if ( !( k in this.configs) ) {
                    this.configs[k] = {}
                }
            } else {
                this.repo_errors.push(new Error(`unsupported repository type - ${k}`))
            }
        }

        await this.init_newly_activated_repos(new_activations)
    }


    async install_service_connection(instance,conf) {
        //
        if ( typeof conf._app_add_support === "object" ) {
            for ( let ky in conf._app_add_support ) {
                if ( conf._app_add_support[ky] === "add-wrapper-instance" ) {
                    conf._app_add_support[ky] = instance
                    break
                }
            }
        }
        //
        await this.update_supported_repositories(conf)
    }

    async update_service_connection(instance,conf) {
        // in this case instance should be this
        await this.update_supported_repositories(conf)
    }
    
    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

    /**
     * init_repos
     * 
     * perform necessary operations to ensure that repositories are running locally and that they have 
     * representative interfaces for accessing file operations.
     */
    async init_repos() {
        //
        let promises = []
        for ( let k in this.configs ) {
            let conf = this.configs[k]
            let factory = await g_supported_repos[k].import()  // wait for the wrapper module to load the constructor
            promises.push(g_supported_repos[k].init(conf,factory)) // async -- starting up repos will take longer
        }
        //
        let connectors = await Promise.all(promises)
        for ( let con of connectors ) {
            let [key,node] = con
            this.repos[key] = await node
        }
        //
    }


    async init_newly_activated_repos(new_activations) {
        //
        let promises = []
        for ( let k of new_activations ) {
            let conf = this.configs[k]
            let factory = await g_supported_repos[k].import()  // wait for the wrapper module to load the constructor
            promises.push(g_supported_repos[k].init(conf,factory)) // async -- starting up repos will take longer
        }
        //
        let connectors = await Promise.all(promises)
        for ( let con of connectors ) {
            let [key,node] = con
            this.repos[key] = await node        // the wrapper that has direct access to the vendor client instance
        }
        //
    }

    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

    async ready(kind) {
        try {
            let w_repo = this.repos[kind]
            if ( w_repo && typeof w_repo.ready === 'function' ) {
                await w_repo.ready()
                return true
            }
        } catch (e) {
            console.log(e)
        }
        return false
    }

    
    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

    /**
     * store
     * 
     * In some repositories, this is referred to as `pin`
     * 
     * local storage of an object performed by pulling it in from the P2P storage 
     * given the object hash id.
     * 
     * Obtains the ID for the repository indicated in `protocol`. Uses the ID to tell the repository
     * to find the object, load it into the local persistent storage, and signals (or peforms) protection of 
     * the object from erasure.
     * 
     * Required fields of the entry_obj, the parameter: 
     * 
     *      * protocol - this is the type of repository the command is using
     *      * <protocol id> - a field keyed by the value in `protocol`
     * 
     * @param {object} entry_obj - an object that will be stored in the repoistory
     * @returns promise
     */
    async store(entry_obj) {  // add entry object to repo
        try {
            let repo_ky = entry_obj.protocol
            if ( repo_ky === undefined ) return
            let w_repo = this.repos[repo_ky]
            if ( w_repo === undefined ) return
            let pin_id = entry_obj[repo_ky]     // this is the repo based id of the object (used to find the object within the P2P system)
            if ( pin_id === undefined ) return
            await w_repo.store_local(pin_id)  
        } catch (e) {
        }
    }

    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----


    /**
     * store_pin
     * 
     * @param {string} kind 
     * @param {string} pin_id
     */
    async store_pin(kind,pin_id) {
        let w_repo = this.repos[kind]
        if ( w_repo === undefined ) return
        await w_repo.store_local(pin_id)  
    }

    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

    /**
     * 
     * remove
     * 
     * Reverses the operation of `store`. The object might not be removed from the entirity of 
     * distributed storage systems. But, this method removes the restriction from doing so.
     * 
     * @param {object} entry_obj - the meta object (may be a view of the added object)
     * @returns 
     */
    async remove(entry_obj) {
        try {
            let repo_ky = entry_obj.protocol
            if ( repo_ky === undefined ) return
            let w_repo = this.repos[repo_ky]
            if ( w_repo === undefined ) return
            let repo_id = entry_obj[repo_ky]
            if ( repo_id === undefined ) return
            await w_repo.rm_local(repo_id)   // remove local using the hash of the object...
        } catch (e) {
        }
    }


    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----


    /**
     * remove_pin
     * 
     * @param {string} kind 
     * @param {string} pin_id
     */
    async remove_pin(kind,pin_id) {
        let w_repo = this.repos[kind]
        if ( w_repo === undefined ) return
        await w_repo.rm_local(pin_id)  
    }



    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

    /**
     * Replaces objects stored locally 
     * 
     * Operates on the local `pinned` data objects. 
     * 
     * @param {object} old_obj 
     * @param {object} new_obj 
     */
    async replace(old_obj,new_obj) {
        await this.remove(old_obj)
        await this.store(new_obj)
    }


    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

    /**
     * add
     * 
     * Add an object in the sense that it is added in ipfs or in the sense that 
     * a torrent is created and publicized in bittorrent. That is, it adds the 
     * object to the storage medium and makes the item accessible to all, but does not
     * require the object to be protected from erasure.
     * 
     * Returns a descriptor with (or that is) the ID of the object relative to the storage platform.
     * 
     * 
     * @param {string} kind - which kind of repo is this? ipfs, tor, torv2
     * @param {object} object - an object to be stored in the repo (raw form)
     * @returns A storage ID as a string
     */
    async add(kind,object) {
        try {
            let w_repo = this.repos[kind]
            const repo_record = await w_repo.add(object)
            if ( typeof repo_record === 'string' ) {
                return repo_record
            } else {
                let repo_id_str = g_supported_repos[kind].stringify(repo_record)
                return repo_id_str    
            }
        } catch (e) {
            console.log(e)
        }
        return false
    }
    //



    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

    /**
     * add_file
     * 
     * Similar to `add` but knows that the object that is passed is actually a file.
     * Will return false after logging any errors if the object is not a file.
     * 
     * @param {*} kind 
     * @param {*} object 
     * @returns 
     */
    async add_file(kind,object) {
        try {
            let w_repo = this.repos[kind]
            const repo_record = await w_repo.add_file(object)
            if ( typeof repo_record === 'string' ) {
                return repo_record
            } else {
                let repo_id_str = g_supported_repos[kind].stringify(repo_record)
                return repo_id_str    
            }
        } catch (e) {
            console.log(e)
        }
        return false

    }



    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

    /**
     * fetch
     * 
     *  Given the type of repo, this maps a unique id of an object relative to the repo and returns the object
     * 
     * @param {string} kind 
     * @param {string} id 
     * @returns Object - the object stored in the repo.
     */
    async fetch(kind,id) {
        try {
            let w_repo = this.repos[kind]
            let content = await g_supported_repos[kind].fetch(id,w_repo.repo())
            return content
        } catch (e) {
            console.log(e)
        }
        return false
    }

    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

    /**
     * ls 
     * 
     * returns system stat info about the object, relative to the repo,
     * where the object is identified by its ID previously returned by an `add` operation.
     * 
     * @param {*} kind 
     * @param {*} cid 
     * @returns 
     */
    async * ls(kind,cid) {
        try {
            let w_repo = this.repos[kind]
            yield * await g_supported_repos[kind].ls(cid,w_repo.repo())
            return
        } catch (e) {
            console.log(e)
        }
        yield false
        return
    }

    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

    /**
     * cat
     * 
     * Similar to fetch, but returns the file object as a stream.
     * 
     * Given the type of repo, this maps a unique id of an object relative to the repo and returns the object as a stream.
     * 
     * @param {string} kind 
     * @param {string} id 
     * @returns Object - the object stored in the repo.
     */
    async * cat(kind,cid) {
        try {
            let w_repo = this.repos[kind]
            yield * await g_supported_repos[kind].cat(cid,w_repo.repo())
            return
        } catch (e) {
            console.log(e)
        }
        yield false
        return
    }

    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----

    /**
     * diagnotistic
     * 
     * @param {string} kind 
     * @param {string} which - the name of the diagnostic to run
     * @returns 
     */
    async diagnotistic(kind,which) {
        try {
            let w_repo = this.repos[kind]
            let content = await g_supported_repos[kind].diagnotistic(which,w_repo.repo())
            return content
        } catch (e) {
            console.log(e)
        }
    }

    /**
     * get_repo_errors
     * 
     * @returns Array - an array of errors collected during operation
     */

    get_repo_errors() {
        return this.repo_errors
    }
}


module.exports = Repository

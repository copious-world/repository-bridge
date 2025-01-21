
// ---- ---- ---- ---- ----
//
const g_supported_repos = require('../supported-repos')

// console.dir(g_supported_repos)
// 
/**
 * 
 */
class Repository {

    constructor(config,kinds) {
        this.configs = {}
        this.repos = {}
        this.repo_errors = []
        for ( let k of kinds ) {
            if ( k in g_supported_repos ) {
                this.configs[k] = config[k]
            } else {
                this.repo_errors.push(new Error("unsupported repository type"))
            }
        }
    }

    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
    /**
     * perform necessary operations to ensure that repositories are running locally and that they have 
     * representative interfaces for accessing file operations.
     */
    async init_repos() {
        let promises = []
        for ( let k in this.configs ) {
            let conf = this.configs[k]
            let factory = await g_supported_repos[k].import()  // wait for the modules
            promises.push(g_supported_repos[k].init(conf,factory)) // async -- starting up repos will take longer
        }

        let connectors = await Promise.all(promises)
        for ( let con of connectors ) {
            let [key,node] = con
            this.repos[key] = await node
        }
    }

    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
    /**
     * local storage of an object perormed by pulling it in from the P2P storage 
     * given the object hash id.
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
     * Replaces objects stored locally 
     * 
     * @param {object} old_obj 
     * @param {object} new_obj 
     */
    async replace(old_obj,new_obj) {
        await this.remove(old_obj)
        await this.store(new_obj)
    }


    /**
     * Add an object in the sense that it is added in ipfs or in the sense that 
     * a torrent is created and publicized in bittorrent.
     * 
     * @param {string} kind - which kind of repo is this? ipfs, tor, torv2
     * @param {object} object - an object to be stored in the repo (raw form)
     * @returns 
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

    /**
     * 
     * @param {string} kind 
     * @param {string} id 
     * @returns 
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

    /**
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
}


module.exports = Repository

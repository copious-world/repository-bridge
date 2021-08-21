
// ---- ---- ---- ---- ----
//
const g_supported_repos = require('../supported-repos')



class Repository {

    constructor(config,kinds) {
        this.configs = {}
        this.repos = {}
        for ( let k of kinds ) {
            if ( k in g_supported_repos ) {
                this.configs[k] = config[k]
            }
        }
    }

    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
    async init_repos() {
        let promises = []
        for ( let k in this.configs ) {
            let conf = this.configs[k]
            let factory = g_supported_repos[k].import()
            promises.push(g_supported_repos[k].init(conf,factory))
        }

        let connectors = Promise.all(promises)
        for ( let con in connectors ) {
            let [key,node] = con
            this.repos[key] = await node
        }
    }

    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
    async store(entry_obj) {
        try {
            let repo_ky = entry_obj.protocol
            let repo = this.repos[repo_ky]
            let pin_id = entry_obj[repo_ky]
            await repo.pin.add(pin_id)
        } catch (e) {
        }
    }

    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
    async remove(entry_obj) {
        try {
            let repo_ky = entry_obj.protocol
            let repo = this.repos[repo_ky]
            let pin_id = entry_obj[repo_ky]
            await repo.pin.rm(pin_id)
        } catch (e) {
        }
    }

    // ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- ----
    async replace(old_obj,new_obj) {
        await this.repository.remove(old_obj)
        await this.repository.store(new_obj)
    }


    async add(kind,object) {
        try {
            let repo = this.repos[kind]
            const repo_record = await repo.add(object)
            let repo_id_str = repo.stringify(repo_record)
            return repo_id_str
        } catch (e) {
        }
        return false
    }
    //
}


module.exports = Repository

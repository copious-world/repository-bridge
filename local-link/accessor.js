const {FileOperations} = require('extra-file-class')

let g_id_path = {}

class WrapNode {

    constructor(a_node,conf) {
        this.fos = a_node
        this.conf = conf
        this.dont_delete = []
        this.count = 1
        this.id_to_path = g_id_path
    }

    async store_local(pin_id) {
        let ppath = this.id_to_path[pin_id]
        let path = `${this.conf.base_dir}/${ppath}`
console.log("store_local",pin_id,path)
console.dir(this.id_to_path)
        let file_exists = await this.fos.exists(path)
        if ( file_exists && (this.dont_delete.indexOf(pin_id) < 0) ) {
            this.dont_delete.push(pin_id)
            path = `${this.conf.base_dir}/safety_pins.json`
            this.fos.output_json(path,this.dont_delete)
        }
    }

    async rm_local(pin_id) {
        let findex = this.dont_delete.indexOf(pin_id)
        if ( findex >= 0 ) {
            let ppath = this.id_to_path[pin_id]
console.log("rm_local",pin_id,path)
console.dir(this.id_to_path)
            let path = `${this.conf.base_dir}/${ppath}`
            let file_exists = await this.fos.exists(path)
            if ( file_exists ) {
                await this.fos.file_remover(path)
                this.dont_delete.splice(findex,1)
                path = `${this.conf.base_dir}/safety_pins.json`
                this.fos.output_json(path,this.dont_delete)
            }
        }
    }

    async load_local(cid) {
        let ppath = this.id_to_path[cid]
        let path = `${this.conf.base_dir}/${ppath}`
console.log("load_local",cid,path)
console.dir(this.id_to_path)
        let data = await this.fos.load_json_data_at_path(path)
        return data
    }

    async add(object) {
        let path = `${this.conf.base_dir}/${object.path}`
console.log("add",path)
        let status = await this.fos.output_json(path,object.content)
        let cid = this.count++;

        this.id_to_path[cid] = object.path

        return cid  // this is likely a blob  (encrypted, etc.)
    }

    repo() {
        return this
    }
}

module.exports = {
    "init" : async (cnfg) =>  {
        this.conf = cnfg
        this.fos = new FileOperations(false)
        console.log("Running local repository... repository bridge")

        let w_node = new WrapNode(this.fos,this.conf)
        return ['local',w_node ]
    },
    "import" : () => {
        let mod = require('extra-file-class')
        return mod
    },
    "stringify" : (repo_record) => {
        let id_str = JSON.stringify(repo_record)
        return id_str
    },
    "fetch" : async (cid,w_node) => {
            let data = await w_node.load_local(cid)
            return data
    },
    "diagnotistic" :  async (which,w_node) => {
        let fos = w_node.fos
        let data = ""
        //
        switch ( which ) {
            case "peers" : {
                //
                break;
            }
            case "ls-pins" : {
                let files = fos.dir_reader(node.conf.base_dir)
                for ( let file of files ) {
                    console.log(file)
                }
                break;
            }
            case "boostrap-peers" : {
                break;
            }
        }
    }

}
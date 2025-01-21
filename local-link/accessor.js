const {FileOperations} = require('extra-file-class')
const {createHash} = require('crypto')


//$>>	do_hash_buffer
async function do_hash_buffer(text) {
    let hasher = createHash('sha256')
    hasher.update(text)
    const hash = await hasher.digest(`base64url`);
    return hash
}

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
        let meta = this.id_to_path[pin_id]
        if ( meta !== undefined ) {
            let path = `${this.conf.base_dir}/${pin_id}`
            let file_exists = await this.fos.exists(path)
            if ( file_exists && (this.dont_delete.indexOf(pin_id) < 0) ) {
                this.dont_delete.push(pin_id)
                path = `${this.conf.base_dir}/safety_pins.json`
                await this.fos.output_json(path,this.dont_delete)
            }
        }
    }

    async rm_local(pin_id) {
        let findex = this.dont_delete.indexOf(pin_id)
        if ( findex < 0 ) {
            let meta = this.id_to_path[pin_id]
            if ( meta !== undefined ) {
                let path = `${this.conf.base_dir}/${pin_id}`
                let file_exists = await this.fos.exists(path)
                if ( file_exists ) {
                    await this.fos.file_remover(path)
                    this.dont_delete.splice(findex,1)
                    let  audit_path = `${this.conf.base_dir}/safety_pins.json`
                    await this.fos.output_json(audit_path,this.dont_delete)
                    let  meta_path = `${this.conf.base_dir}/file_metas.json`
                    await this.fos.output_json(meta_path,this.id_to_path)
                }    
            }
        }
    }

    async load_local(cid) {
        let meta = this.id_to_path[cid]
        if ( meta !== undefined ) {
            let path = `${this.conf.base_dir}/${cid}`
            let data = await this.fos.load_json_data_at_path(path)
            return data    
        }
        return false
    }

    async add(object) {
        let cid = await do_hash_buffer(JSON.stringify(object))
        let path = `${this.conf.base_dir}/${cid}`
        let status = await this.fos.output_json(path,object.content)
        if ( status ) {
            this.id_to_path[cid] = object.meta
            let  meta_path = `${this.conf.base_dir}/file_metas.json`
            await this.fos.output_json(meta_path,this.id_to_path)
        }
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
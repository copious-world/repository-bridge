const {FileOperations} = require('extra-file-class')
const {createHash} = require('crypto')
const {subtle} = require('crypto')
const util = require('util');
const path = require('path')
const {MessageRelayer} = require('message-relay-services')


const ScpClient = require('../support_lib/scp_spawner')


//$>>	do_hash_buffer
async function do_hash_text(text) {
    let hasher = createHash('sha256')
    hasher.update(text)
    const hash = await hasher.digest(`base64url`);
    return hash
}


async function do_hash_buffer(buf) {
    const hBuffer = await subtle.digest("SHA-256",buf)
    const hArray = new Uint8Array(hBuffer);
    let b = Buffer.from(hArray)
    return b.toString('base64url')
}

async function hash_of(some_object) {
    if ( typeof some_object === 'string' ) {
        return await do_hash_text(some_object)
    } else {
        if ( util.types.isUint8Array(some_object) ) {
            return await do_hash_buffer(some_object)
        } else if ( Buffer.isBuffer(some_object) ) {
            return await do_hash_buffer(some_object)
        } else if ( typeof some_object === 'object' ) {
            if ( some_object.hasOwnProperty('content') ) {
                return await hash_of(some_object.content)
            } else {
                return await do_hash_text(JSON.stringify(some_object))
            }
        }
    }
}

let g_id_path = {}
let g_id_meta = {}

class WrapNode {

    constructor(a_node,conf) {
        this.fos = a_node
        this.conf = conf
        this.count = 1
        //
        this.id_to_path = g_id_path
        this.metas = g_id_meta

        this.messenger = new MessageRelayer(conf.node_relay)
        this.scp_client = new ScpClient(conf.address,conf.ssh_user)  // only need the address to tell scp
    }


    /**
     * reload_file_maps
     * 
     */
    async reload_file_maps() {
        // Maintain meta information about metas and paths, while pinning will be a topic of the LAN node.
        let  file_paths = `${this.conf.base_dir}/file_paths.json`
        this.id_to_path = await this.fos.load_json_data_at_path(file_paths)
        // 
        let meta_path = `${this.conf.base_dir}/file_metas.json`
        this.metas = await this.fos.load_json_data_at_path(meta_path)
    }



    /**
     * 
     * store_local
     * 
     * Can do things such as store a file in a directory accessible by a streamer.
     * 
     * Tells the "node", and endpoint server, to mark the file as pinned.
     * Attempts to obtain the 
     * 
     * @param {string} pin_id 
     */
    async store_local(pin_id) {
        try {
            if ( this.messenger && this.scp_client ) {
                let result = await this.messenger.get_on_path({
                    "op" : "PIN",
                    "parameters" : {
                        "cid" : pin_id,
                        "pin" : true    
                    }
                },"LAN-repo")
                if ( result && (result.status === "OK") ) {
                    let scp_location = result.data.scp_location
                    await this.scp_client.fetch(scp_location,`${this.conf.base_dir}/${pin_id}`)
                }
            }    
        } catch (e) {
            console.log(e)
        }
    }

    /**
     * rm_local
     * 
     * @param {string} pin_id 
     */
    async rm_local(pin_id) {
        let message = {
            "op" : "UNPIN",
            "parameters" : {
                "cid" : pin_id
            }
        }
        await this.messenger.set_on_path(message,"LAN-repo")
    }


    async #ensure_local(cid) {

        let local_path = `${this.conf.base_dir}/${cid}`
        let meta = false

        let already_local = await this.fos.exists(local_path)

        if ( !already_local ) {
            try {
                if ( this.messenger && this.scp_client ) {
                    let result = await this.messenger.get_on_path({
                        "op" : "WANT",
                        "parameters" : {
                            "cid" : pin_id,
                            "pin" : false   // don't take the extra action to pin it    
                        }
                    },"LAN-repo")
                    if ( result && (result.status === "OK") ) {
                        meta = result.data.meta
                        let scp_location = result.data.scp_location
                        await this.scp_client.fetch(scp_location,local_path)
                    }
                }    
            } catch (e) {
                console.log(e)
                return false
            }
        } else {
            meta = this.metas[cid]
        }

        return meta
    }

    /**
     * load_local
     * 
     * @param {string} cid 
     * @returns 
     */
    async load_local(cid) {
        //
        let meta = await this.#ensure_local(cid)
        let local_path = `${this.conf.base_dir}/${cid}`
        //
        if ( local_path !== undefined ) {
            try {
                let data = ""
                switch ( meta.type ) {
                    case "string" : {
                        data = await this.fos.readFile(local_path)
                        data = data.toString()
                        break;
                    }
                    case "Uint8Array" : {
                        data = await this.fos.readFile(local_path)
                        data = new Uint8Array(data)
                        break;
                    }
                    case "json" : {
                        data = await this.fos.load_json_data_at_path(local_path)
                        break;
                    }
                }
                
                data = await this.fos.readFile(local_path)
                let obj = {
                    "meta" : meta,
                    "content" : data
                }
                return obj    
            } catch (e) {
                console.log(e)
            }
        }
        return false
    }

    /**
     * #file_writer
     * 
     * @param {*} cid 
     * @param {*} some_object 
     * 
     * @returns Object | false - the meta descriptor of the object
     */
    async #file_writer(cid,spc_path,some_object) {
        if ( this.scp_client === false ) return false
        //
        try {
            let path = `${this.conf.base_dir}/${cid}`       // local place to put the file
            if ( util.types.isUint8Array(some_object) || Buffer.isBuffer(some_object) ) {
                const data = new Uint8Array(some_object);
                await this.fos.writeFile(path,data,{ "flush" : true })  // WRITE file to local config'd dir
                this.scp_client.send(path,spc_path)     // SCP straight up (should be configured no password) just spawn
            } else if ( typeof some_object === 'string' ) {
                await this.fos.writeFile(path,some_object,{ "flush" : true })   // WRITE file
                this.scp_client.send(path,spc_path)                             // SCP 
            } else {
                let data = false
                if ( some_object.hasOwnProperty('content') ) {
                    await this.#file_writer(cid,path,some_object.content)       // RECURSE
                } else {
                    data = JSON.stringify(some_object)
                    await this.fos.writeFile(path,data,{ "flush" : true })   // WRITE file
                    this.scp_client.send(path,spc_path)                      // SCP 
                }
            }
        } catch (e) {
            console.log(e)
        }
        //
    }


    // Here object is a blob
    async add(object) {
        let cid = await hash_of(object)
        //
        if ( this.messenger ) {
            let message = {
                "op" : "ADD",
                "parameters" : {
                    "cid" : cid
                }
            }
            let result = this.set_on_path(message,"LAN-repo")  // where to upload te file
            if ( result && (result.status === "OK") ) {
                let scp_path = result.data.scp_path
                await this.#file_writer(cid,scp_path,object)     // write the file locally
            }

        }

        //
        return cid  // this is likely a blob  (encrypted, etc.)
    }


    async add_file(in_path) {
        let buffer = await this.fos.readFile(in_path)
        let name = path.basename(in_path)
        let author = "unknown"
        let meta  = { "name" : name, "author" : author }
        let obj = {
            "meta" : meta,
            "content" : buffer
        }
        return await this.add(obj)
    }


    async * cat(cid) {
        let meta = await this.#ensure_local(cid)
        if ( meta ) {
            let path = `${this.conf.base_dir}/${cid}`
            if ( path !== undefined ) {
                let strm = await this.fos.fs.createReadStream(path)
                if ( strm ) {
                    for await (const chunk of strm) {
                        yield chunk
                    }        
                    return
                }
            }    
        }
        yield []
    }


    async * ls(cid) {
        let meta = await this.#ensure_local(cid)
        if ( meta ) {
            let path = `${this.conf.base_dir}/${cid}`
            if ( path !== undefined ) {
                try {
                    let stat = await this.fos.stat(path)
                    yield stat
                    return
                } catch (e) {
                }
            }
        }
        yield false
    }


    repo() {
        return this
    }
}

module.exports = {
    "init" : async (cnfg) =>  {
        this.conf = cnfg
        this.fos = new FileOperations(false)
        console.log("Running LAN repository... repository bridge")

        let w_node = new WrapNode(this.fos,this.conf)
        await w_node.reload_file_maps()
        return ['LAN',w_node ]
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
    "cat" : (cid,w_node) => {
        return w_node.cat(cid)
    },
    "ls" : (cid,w_node) => {
        return w_node.ls(cid)
    },
    "diagnotistic" :  async (which,w_node) => {
        let fos = w_node.fos
        //let data = ""
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








/*
import { on } from 'events'
import glob from 'glob'

const matcher = glob('** /*.js')
const ac = new global.AbortController()

matcher.once('end', () => ac.abort())

try {
  for await (const [filePath] of on(matcher, 'match', { signal: ac.signal })) {
    console.log(`./${filePath}`)
  }
} catch (err) {
  if (!ac.signal.aborted) {
    console.error(err)
    process.exit(1)
  }
}

console.log('NOW WE GETTING HERE! :)')
*/

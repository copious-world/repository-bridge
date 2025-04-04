const {FileOperations} = require('extra-file-class')
const {createHash} = require('crypto')
const {subtle} = require('crypto')
const util = require('util');
const path = require('path')
const {MessageRelayer} = require('message-relay-services')


const ScpClient = require('../support_lib/scp_spawner')
const LocalCopier = require('../support_lib/cp_spawner')


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
        //
        this.messenger = false
        this.ready_promise = false
        this.client_ready = false
 
        this.ensure_messenger_ready(conf.node_relay)
        //
        if ( conf.local_only ) {
            this.copy_client = false
            this.copy_client = new LocalCopier()
        } else {
            this.copy_client = new ScpClient(conf.address,conf.ssh_user,conf.ssh_pass)  // only need the address to tell scp
        }
    }


    /**
     * ensure_messenger_ready
     * 
     * @param {object} conf 
     */
    ensure_messenger_ready(conf) {
        //
        let self = this
        let p = new Promise((resolve,reject) => {
            self.messenger = new MessageRelayer(conf)
            self.messenger.on('client-ready',() =>  {
                self.client_ready = true
                resolve(true)
            })
        })
        this.ready_promise = p
        //
    }

    /**
     * ready
     */
    async ready() {
        if ( !(this.client_ready) && this.ready_promise ) {
            await this.ready_promise
        }
        this.ready_promise = false
    }

    /**
     * reload_file_maps
     * 
     */
    async reload_file_maps() {
        // Maintain meta information about metas and paths, while pinning will be a topic of the LAN node.
        let  file_paths = `${this.conf.base_dir}/file_paths.json`
        this.id_to_path = await this.fos.load_json_data_at_path(file_paths)
        if ( this.id_to_path === false ) {
            this.id_to_path = {}
            await this.fos.output_json(file_paths,this.id_to_path)
        }
// 
        let meta_path = `${this.conf.base_dir}/file_metas.json`
        this.metas = await this.fos.load_json_data_at_path(meta_path)
        if ( this.metas === false ) {
            this.metas = {}
            await this.fos.output_json(meta_path,this.metas)
        }
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
            if ( this.messenger && this.copy_client ) {
                let result = await this.messenger.get_on_path({
                    "op" : "PIN",
                    "parameters" : {
                        "cid" : pin_id,
                        "pin" : true    
                    }
                },"LAN-repo")
                if ( result && (result.status === "OK") ) {
                    let scp_location = result.data.scp_location
                    await this.copy_client.fetch(scp_location,`${this.conf.base_dir}/${pin_id}`)
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

    /**
     * #ensure_local
     * 
     * @param {string} cid 
     * @returns object -- the meta descriptor of the file
     */
    async #ensure_local(cid) {

        let local_path = `${this.conf.base_dir}/${cid}`
        let meta = false

        let already_local = await this.fos.exists(local_path)

        if ( !already_local ) {
            try {
                if ( this.messenger && this.copy_client ) {
                    let result = await this.messenger.get_on_path({
                        "op" : "WANT",
                        "parameters" : {
                            "cid" : cid,
                            "pin" : false   // don't take the extra action to pin it    
                        }
                    },"LAN-repo")
                    if ( result && (result.status === "OK") ) {
                        meta = result.data.meta
                        let scp_location = result.data.scp_location
                        await this.copy_client.fetch(scp_location,local_path)
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
        if ( (local_path !== undefined) && (meta !== undefined) ) {
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
                //
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
     * construct_meta
     * 
     * @param {string} cid 
     * @param {string} type 
     * @param {string} author 
     */
    construct_meta(cid,obj,author) {
        let type = ""
        if ( util.types.isUint8Array(obj) ) {
            type = "Uint8Array"
        } else if ( typeof some_object === 'string' ) {
            type = "string"
        } else {
            if ( obj.hasOwnProperty('content') ) {
                if ( obj.hasOwnProperty('meta') ) {
                    let default_meta = this.construct_meta(cid,obj.content,author)
                    if ( default_meta ) {  // use the given meta 
                        obj.meta.type = default_meta.type
                        return obj.meta
                    }
                }
            } else {
                if ( obj.meta !== undefined ) {
                    obj.meta.type = "json"
                    return obj.meta
                } else {
                    type = "json"
                }
            }
        }

        let  meta = {
            "name" : `${cid}`,
            "author" : (typeof author === "string") ? author : "unknown",
            "type" : type
        }
        return meta
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
        if ( this.copy_client === false ) return false
        //
        try {
            let path = `${this.conf.base_dir}/${cid}`       // local place to put the file
            if ( util.types.isUint8Array(some_object) || Buffer.isBuffer(some_object) ) {
                const data = new Uint8Array(some_object);
                await this.fos.writeFile(path,data,{ "flush" : true })  // WRITE file to local config'd dir
                this.copy_client.send(path,spc_path)     // SCP straight up (should be configured no password) just spawn
            } else if ( typeof some_object === 'string' ) {
                await this.fos.writeFile(path,some_object,{ "flush" : true })   // WRITE file
                this.copy_client.send(path,spc_path)                             // SCP 
            } else {
                let data = false
                if ( some_object.hasOwnProperty('content') ) {
                    await this.#file_writer(cid,path,some_object.content)       // RECURSE
                } else {
                    data = JSON.stringify(some_object)
                    await this.fos.writeFile(path,data,{ "flush" : true })   // WRITE file
                    this.copy_client.send(path,spc_path)                      // SCP 
                }
            }
            return path
        } catch (e) {
            console.log(e)
        }
        return false
        //
    }


    /**
     * add
     * 
     * @param {object} object 
     * @returns string - the cid of the object
     */
    async add(object) {
        let cid = await hash_of(object)
        //
        let meta = this.construct_meta(cid,object,false)
        if ( this.messenger ) {
            let message = {
                "op" : "ADD",
                "parameters" : {
                    "cid" : cid,
                    "meta" : meta    // ? must be the description of blob and not contain the blob data...
                }
            }
            let result = await this.messenger.set_on_path(message,"LAN-repo")  // where to upload te file
            if ( result && (result.status === "OK") ) {
                //
                let scp_location = result.data.scp_location
                let path = await this.#file_writer(cid,scp_location,object)     // write the file locally
                //
                if ( path !== false ) {
                    this.metas[cid] = meta
                    let  meta_path = `${this.conf.base_dir}/file_metas.json`
                    await this.fos.output_json(meta_path,this.metas)
            
                    this.id_to_path[cid] = path
                    let  paths_path = `${this.conf.base_dir}/file_paths.json`
                    await this.fos.output_json(paths_path,this.id_to_path)    
                }
            }
        }
        //
        return cid  // this is likely a blob  (encrypted, etc.)
    }


    /**
     * add_file
     * @param {string} in_path 
     * @returns string -- the cid
     */
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


    /**
     * cat
     * 
     * 
     * @param {string} cid 
     * @returns stream
     */
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


    /**
     * ls
     * 
     * @param {string} cid 
     * @returns stream of file stats object
     */
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

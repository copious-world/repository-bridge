const {FileOperations} = require('extra-file-class')
const {createHash} = require('crypto')
const {subtle} = require('crypto')
const util = require('util');
const path = require('path')


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
        this.dont_delete = []
        this.id_to_path = g_id_path
        this.metas = g_id_meta
    }



    /**
     * reload_file_maps
     * 
     */
    async reload_file_maps() {
        let  audit_path = `${this.conf.base_dir}/safety_pins.json`
        this.dont_delete = await this.fos.load_json_data_at_path(audit_path)
        if ( this.dont_delete === false ) {
            this.dont_delete = []
            await this.fos.output_json(audit_path,this.dont_delete)
        }
//
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
     * setup_file_watch
     * 
     */
    setup_file_watch() {
        let file_paths = `${this.conf.base_dir}/file_paths.json`
        let self = this
        this.fos.fs.watchFile(file_paths,async (curr,prev) => {
            if ( curr.mtime !== prev.mtime ) {
                await self.reload_file_maps()
            }
        })
        let audit_path = `${this.conf.base_dir}/safety_pins.json`
        this.fos.fs.watchFile(audit_path,async (curr,prev) => {
            if ( curr.mtime !== prev.mtime ) {
                this.dont_delete = await self.fos.load_json_data_at_path(audit_path)
            }
        })
    }

    /**
     * store_local
     * 
     * @param {string} pin_id 
     */
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

    /**
     * rm_local
     * 
     * @param {string} pin_id 
     */
    async rm_local(pin_id) {
        let findex = this.dont_delete.indexOf(pin_id)
        if ( findex < 0 ) {
            let its_path = this.id_to_path[pin_id]
            if ( its_path !== undefined ) {
                let path = `${this.conf.base_dir}/${pin_id}`
                let file_exists = await this.fos.exists(path)
                if ( file_exists ) {
                    await this.fos.file_remover(path)
//
                    delete this.id_to_path[pin_id]
                    let  file_paths = `${this.conf.base_dir}/file_paths.json`
                    await this.fos.output_json(file_paths,this.id_to_path)
// 
                    delete this.metas[pin_id]
                    let meta_path = `${this.conf.base_dir}/file_metas.json`
                    await this.fos.output_json(meta_path,this.metas)
                }    
            }
        }
    }

    /**
     * load_local
     * @param {string} cid 
     * @returns 
     */
    async load_local(cid) {
        let path = this.id_to_path[cid]
        if ( path !== undefined ) {
            let meta = this.metas[cid]
            try {
                let data = ""
                switch ( meta.type ) {
                    case "string" : {
                        data = await this.fos.readFile(path)
                        data = data.toString()
                        break;
                    }
                    case "Uint8Array" : {
                        data = await this.fos.readFile(path)
                        data = new Uint8Array(data)
                        break;
                    }
                    case "json" : {
                        data = await this.fos.load_json_data_at_path(path)
                        break;
                    }
                }
                
                data = await this.fos.readFile(path)
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
    construct_meta(cid,type,author) {
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
    async #file_writer(cid,path,some_object) {
        let meta = false
        try {
            if ( util.types.isUint8Array(some_object) || Buffer.isBuffer(some_object) ) {
                const data = new Uint8Array(some_object);
                await this.fos.writeFile(path,data,{ "flush" : true })
                meta = this.construct_meta(cid,"Uint8Array")
            } else if ( typeof some_object === 'string' ) {
                await this.fos.writeFile(path,some_object,{ "flush" : true })
                meta = this.construct_meta(cid,"string")
            } else {
                let data = false
                if ( some_object.hasOwnProperty('content') ) {
                    if ( some_object.hasOwnProperty('meta') ) {
                        let default_meta = await this.#file_writer(cid,path,some_object.content)
                        if ( default_meta ) {  // use the given meta 
                            meta = some_object.meta
                            meta.type = default_meta.type
                        }
                    }
                } else {
                    data = JSON.stringify(some_object)
                    await this.fos.writeFile(path,data,{ "flush" : true })
                    if ( some_object.meta !== undefined ) {
                        meta = some_object.meta
                        meta.type = "json"
                    } else {
                        meta = this.construct_meta(cid,"json")
                    }
                }
            }
        } catch (e) {
            console.log(e)
        }
        return meta
    }


    // Here object is a blob
    /**
     * add
     * 
     * @param {object} object 
     * @returns string
     */
    async add(object) {
        let cid = await hash_of(object)
        let path = `${this.conf.base_dir}/${cid}`
        let meta = false
        //
        meta = await this.#file_writer(cid,path,object)
        //
        this.metas[cid] = meta
        let  meta_path = `${this.conf.base_dir}/file_metas.json`
        await this.fos.output_json(meta_path,this.metas)

        this.id_to_path[cid] = path
        let  paths_path = `${this.conf.base_dir}/file_paths.json`
        await this.fos.output_json(paths_path,this.id_to_path)
        //
        return cid  // this is likely a blob  (encrypted, etc.)
    }


    /**
     * add_file
     * 
     * @param {string} in_path 
     * @returns 
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
     * @param {string} cid 
     * @returns stream
     */
    async * cat(cid) {
        let path = this.id_to_path[cid]
        if ( path !== undefined ) {
            let strm = await this.fos.fs.createReadStream(path)
            if ( strm ) {
                for await (const chunk of strm) {
                    yield chunk
                }        
                return
            }
        }
        yield []
    }


    /**
     * ls
     * 
     * @param {string} cid 
     * @returns object -- a file stat report but as a stream
     */
    async * ls(cid) {
        let path = this.id_to_path[cid]
        if ( path !== undefined ) {
            try {
                let stat = await this.fos.stat(path)
                yield stat
                return
            } catch (e) {
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
        console.log("Running local repository... repository bridge")

        let w_node = new WrapNode(this.fos,this.conf)
        await w_node.reload_file_maps()
        await w_node.setup_file_watch()
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

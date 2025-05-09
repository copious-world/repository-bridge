#!/usr/bin/env node

const {OperationsCategory} = require('categorical-handlers')
const fs = require('fs')

const resolve = require('path').resolve


function absolute_dir(data_dir) {
    return resolve(data_dir)
}

class LANOperations extends OperationsCategory {

    constructor(conf) {
        super(conf)
        this.conf = conf
        //
        this.dont_delete = []
        this.id_to_path = {}
        this.metas = {}
        //
        this.data_dir = this.conf.base_dir
        if ( this.data_dir === undefined ) {
            this.data_dir = `${process.cwd()}/LAN_dat`
        } else {
            this.data_dir = absolute_dir(this.data_dir)
        }
        //
        this.reload_file_maps()
        this.setup_file_watch()
    }


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


    async store_local(pin_id) {
        let meta = this.id_to_path[pin_id]
        if ( meta !== undefined ) {
            let path = `${this.data_dir}/${pin_id}`
            let file_exists = await this.fos.exists(path)
            if ( file_exists && (this.dont_delete.indexOf(pin_id) < 0) ) {
                this.dont_delete.push(pin_id)
                path = `${this.conf.base_dir}/safety_pins.json`
                await this.fos.output_json(path,this.dont_delete)
                return path
            }
        }
        return false
    }


    async confirm_local(pin_id) {
        let meta = this.id_to_path[pin_id]
        if ( meta !== undefined ) {
            let path = `${this.data_dir}/${pin_id}`
            let file_exists = await this.fos.exists(path)
            if ( file_exists ) {
                return path
            }
        }
        return false
    }



    // Here object is a blob
    async add(cid,meta) {
        let path = `${this.data_dir}/${cid}`
        //
        this.metas[cid] = meta
        let  meta_path = `${this.conf.base_dir}/file_metas.json`
        await this.fos.output_json(meta_path,this.metas)

        this.id_to_path[cid] = path
        let  paths_path = `${this.conf.base_dir}/file_paths.json`
        await this.fos.output_json(paths_path,this.id_to_path)
        //
        return path  // this is likely a blob  (encrypted, etc.)
    }


    /**
     * 
     * @param {string}} pin_id 
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
     * 
     * @param {string} pin_id 
     */
    async unpin_local(pin_id) {
        let findex = this.dont_delete.indexOf(pin_id)
        if ( findex >= 0 ) {
            this.dont_delete.splice(findex,1)
            let  audit_path = `${this.conf.base_dir}/safety_pins.json`
            await this.fos.output_json(audit_path,this.dont_delete)

            let path = `${this.data_dir}/${pin_id}`
            let file_exists = await this.fos.exists(path)
            if ( file_exists ) {
                return path
            }
        }
        return false
    }


    /**
     * application_operation_info_handling
     * @param {string} cmd_op 
     * @param {object} parameters 
     * @returns object | false
     */

    async application_operation_info_handling(cmd_op,parameters) {
    //
        switch ( cmd_op ) {
            case "WANT" : {
                //
                let {cid, pin} = parameters
                let meta = this.metas[cid]

                let return_data = {
                    "_app_log" : "",
                    "meta" : meta
                }
                //
                if ( pin ) {
                    let path = await this.store_local(cid)
                    if ( path ) {
                        return_data.scp_location = path
                    } else {
                        return false
                    }
                } else {
                    let path = await this.confirm_local(cid)
                    if ( path ) {
                        return_data.scp_location = path
                    } else {
                        return false
                    }
                }
                //
                return return_data
            }
            case "PIN" : {
                let {cid, pin} = parameters
                let meta = this.metas[cid]

                let return_data = {
                    "_app_log" : "",
                    "meta" : meta
                }
                //
                if ( pin ) {
                    let path = await this.store_local(cid)
                    if ( path ) {
                        return_data.scp_location = path
                    } else {
                        return false
                    }
                } else {
                    let path = await this.unpin_local(cid)
                    return_data.scp_location = path
                }
                //
                return return_data
            }
        }
        
        return false
    }

    /**
     * application_operation_cmd_handling
     * @param {string} cmd_op 
     * @param {object} parameters 
     * @returns object | false
     */
    async application_operation_cmd_handling(cmd_op,parameters) {
        switch ( cmd_op ) {
            case "ADD" : {
                let {cid, meta} = parameters
                let return_data = {
                    "_app_log" : ""
                }
                //
                let path = await this.add(cid,meta)
                if ( path ) {
                    return_data.scp_location = path
                }
                //
                return return_data
            }
            case "UNPIN" : {
                let {cid} = parameters
                let meta = this.metas[cid]

                let return_data = {
                    "_app_log" : "",
                    "meta" : meta
                }
                //
                let path = await this.unpin_local(cid)
                return_data.scp_location = path
                //
                return return_data
            }
        }
        return false
    }

    async application_operation_cmd_reversal(was_cmd_op) {
        console.log("The application should implement the application_operation_cmd_handling method ")
        return false
    }

}


/*

"GET"  data.meta data.scp_location
{
    "op" : "WANT",
    "parameters" : {
        "cid" : pin_id,
        "pin" : false   // don't take the extra action to pin it    
    }
}

"GET"  data.scp_location 
{
    "op" : "PIN",
    "parameters" : {
        "cid" : pin_id,
        "pin" : true    
    }
}

"SET"
{
    "op" : "UNPIN",
    "parameters" : {
        "cid" : pin_id
    }
}

"GET" data.scp_location
{
    "op" : "ADD",
    "parameters" : {
        "cid" : cid  // make way for this 
    }
}

*/



let conf = false
try {
    let conf_str = fs.readFileSync("LAN-node.conf").toString()
    conf = JSON.parse(conf_str)
} catch (e) {
    console.log(e)
}

const LAN_ops = new LANOperations(conf)
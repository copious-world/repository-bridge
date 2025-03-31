
const {OperationsMessageEndpoint} = require('categorical-handlers')
const fs = require('fs')


class LANOperations extends OperationsMessageEndpoint {

    constructor(conf) {
        super(conf)
    }

    async application_operation_cmd_handling(cmd_op,parameters) {
        console.log("The application should implement the application_operation_cmd_handling method ")
        return { "action" : "noop" }
    }

    async application_operation_info_handling(cmd_op,parameters) {
        console.log("The application should implement the application_operation_cmd_handling method ")
        return { "action" : "noop" }
    }

    async application_operation_cmd_reversal(was_cmd_op) {
        console.log("The application should implement the application_operation_cmd_handling method ")
        return { "action" : "noop" }
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

"SET" data.scp_location
{
    "op" : "ADD",
    "parameters" : {
        "cid" : cid,
        "path" : path,
        "from" : {              // tell the node what it needs to get the file via scp
            "address" : this.messenger.address,
            "dir" : this.conf.base_dir
        }    
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
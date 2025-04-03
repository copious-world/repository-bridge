

let {spawn} = require('child_process')

//
//  Best to setup keys to avoid a password request from scp
//  If not doing the proper assymetric key exchange, then 
//  ... have to install sshpass 
//      sshpass  -p "password"
//


class ScpClient {

    constructor(address,ssh_user,cmd_line_password) {
        this.ssh_server_addr = address
        this.ssh_user = ssh_user
        this.cmd_line_password  = false
        if ( cmd_line_password !== undefined && typeof cmd_line_password === 'string' ) {
            this.cmd_line_password = cmd_line_password
        }
    }

    async fetch(remote_file,local_file) {
        let p = false
        p = new Promise((resolve,reject) => {
            let params = [ remote_file, local_file ]
            let spawner = spawn('cp',params,{})
            spawner.on('exit',(status) => {
                resolve(true)
            })    
            spawner.on('error',(err) => {
                reject(err)
            })
        })

        return p
    }

    async send(local_file,remote_file) {
        let p = false
        p = new Promise((resolve,reject) => {
            let params = [ local_file, remote_file ]
            let spawner = spawn('cp',params,{})
            spawner.on('exit',(status) => {
                resolve(true)
            })    
            spawner.on('error',(err) => {
                reject(err)
            })
        })
        return p
    }

}




module.exports = ScpClient
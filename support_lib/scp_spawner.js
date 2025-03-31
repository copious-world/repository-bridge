

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
        if ( !(this.cmd_line_password) ) {
            p = new Promise((resolve,reject) => {
                let spawner = spawn('scp',[`${this.ssh_user}@${this.ssh_server_addr}:${remote_file}`,local_file],{})
                spawner.on('exit',(status) => {
                    resolve(true)
                })    
                spawner.on('error',(err) => {
                    reject(err)
                })
            })    
        } else {
            p = new Promise((resolve,reject) => {
                let spawner = spawn("sshpass", "-p", `"${this.cmd_line_password}"`, 'scp',[`${this.ssh_user}@${this.ssh_server_addr}:${remote_file}`,local_file],{})
                spawner.on('exit',(status) => {
                    resolve(true)
                })    
                spawner.on('error',(err) => {
                    reject(err)
                })
            })    
        }
        return p
    }

    async send(local_file,remote_file) {
        let p = false
        if ( !(this.cmd_line_password) ) {
            p = new Promise((resolve,reject) => {
                let spawner = spawn('scp',[local_file,`${this.ssh_user}@${this.ssh_server_addr}:${remote_file}`],{})
                spawner.on('exit',(status) => {
                    resolve(true)
                })    
                spawner.on('error',(err) => {
                    reject(err)
                })
            })
        } else {
            p = new Promise((resolve,reject) => {
                let spawner = spawn("sshpass", "-p", `"${this.cmd_line_password}"`, 'scp',[local_file,`${this.ssh_user}@${this.ssh_server_addr}:${remote_file}`],{})
                spawner.on('exit',(status) => {
                    resolve(true)
                })    
                spawner.on('error',(err) => {
                    reject(err)
                })
            })
        }
        return p
    }

}




module.exports = ScpClient
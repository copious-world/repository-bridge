

module.exports = {
    //
    'ipfs' : {
        "init" : async (cnfg,IPFS) =>  {
            let container_dir = cnfg.repo_location
            if ( container_dir == undefined ) {
                container_dir =  process.cwd() + "/repos"
            }
            //
            let subdir = cnfg.dir
            if ( subdir[0] != '/' ) subdir = ('/' + subdir)
            let repo_dir = container_dir + subdir
            let node = await IPFS.create({
                repo: repo_dir,
                config: {
                    Addresses: {
                        Swarm: [
                        `/ip4/0.0.0.0/tcp/${cnfg.swarm_tcp}`,
                        `/ip4/127.0.0.1/tcp/${cnfg.swarm_ws}/ws`
                        ],
                        API: `/ip4/127.0.0.1/tcp/${cnfg.api_port}`,
                        Gateway: `/ip4/127.0.0.1/tcp/${cnfg.tcp_gateway}`
                    }
                }
            })
            //
            const id = await node.id()
            console.log(id)
            //
            const version = await node.version()
            console.log('Version:', version.version)
            return ['ipfs',node]
        },
        "import" : () => {
            let mod = require('ipfs')
            return mod
        },
        "stringify" : (repo_record) => {
            let id_str = repo_record.cid.toString()
            return id_str
        },
        "fetch" : async (cid,node) => {
                let ipfs = node
                let chunks = []
                for await ( const chunk of ipfs.cat(cid) ) {
                    chunks.push(chunk)
                }
                let buff = Buffer.concat(chunks)
                let data = buff.toString()
                return data
        }
    }

}

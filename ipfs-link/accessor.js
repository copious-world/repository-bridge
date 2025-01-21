//
const { Multiaddr } = require('multiaddr')


class WrapNode {
    constructor(a_node) {
        this.node = a_node
    }

    async store_local(pin_id) {
        await this.node.pin.add(pin_id)
    }

    async rm_local(pin_id) {
        await this.node.pin.rm(pin_id)
    }

    async add(object) {
        return await this.node.add(object)   // this is likely a blob  (encrypted, etc.)
    }

    repo() {
        return this.node
    }
}

module.exports = {
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
                        `/ip4/127.0.0.1/tcp/${cnfg.swarm_ws}/ws`,
                        "/ip4/0.0.0.0/udp/4001/quic",
                        "/ip6/::/udp/4001/quic"
                    ],
                    API: `/ip4/127.0.0.1/tcp/${cnfg.api_port}`,
                    Gateway: `/ip4/127.0.0.1/tcp/${cnfg.tcp_gateway}`
                }
            }
        })
        //
        if ( (cnfg.add_boostrap !== undefined) && cnfg.add_boostrap ) {
            let additional = cnfg.add_boostrap
            for ( let peer_addr of additional ) {
                try {
                    const peer = new Multiaddr(peer_addr)
                    await node.bootstrap.add(peer)
                } catch (e) {
                    console.log(e)
                }
            }
        }
        //
        const id = await node.id()
        console.log(id)
        //
        const version = await node.version()
        console.log('Version:', version.version)
        let w_node = new WrapNode(node)
        return ['ipfs',w_node ]
    },
    "import" : () => {
        let mod = require('ipfs')
        return mod
    },
    "stringify" : (repo_record) => {
        let id_str = repo_record.cid.toString()
        return id_str
    },
    "fetch" : async (cid,w_node) => {
            let ipfs = w_node.node
            let chunks = []
            for await ( const chunk of ipfs.cat(cid) ) {
                chunks.push(chunk)
            }
            let buff = Buffer.concat(chunks)
            let data = buff.toString()
            return data
    },
    "diagnotistic" :  async (which,w_node) => {
        let ipfs = w_node.node
        let data = ""
        //
        switch ( which ) {
            case "peers" : {
                //
                break;
            }
            case "ls-pins" : {
                for await (const { cid, type } of ipfs.pin.ls()) {
                    console.log({ cid, type })
                }
                break;
            }
            case "boostrap-peers" : {
                const res = await ipfs.bootstrap.list()
                const peers = res.Peers
                let is_multi = peers.every(ma => Multiaddr.isMultiaddr(ma))
                if ( is_multi ) {
                    data = peers
                } else {
                    data = "broken"
                }
                break;
            }
        }
    }

}
/*
sudo apt install qbittorrent-nox -y
sudo cat << EOF > /etc/systemd/system/qbittorrent.service
[Unit]
Description=qBittorrent
After=network.target

[Service]
Type=forking
User=pi
Group=pi
UMask=002
ExecStart=/usr/bin/qbittorrent-nox -d --webui-port=8080
Restart=on-failure

[Install]
WantedBy=multi-user.target

EOF

sudo systemctl enable qbittorrent

read -p "Start qbittorrent? (Y/n) " -n 1 -r
echo    # (optional) move to a new line
if [[ ! $REPLY =~ ^[Nn]$ ]]
then
    sudo systemctl start qbittorrent
fi



https://djmykey.wordpress.com/2021/06/14/install-qbittorrent-on-raspberry-pi/

// magnet:?xt=urn:btmh:1220caf1e1c30e81cb361b9ee167c4aa64228a7fa4fa9f6105232b28ad099f3a302e&dn=bittorrent-v2-test

*/





module.exports = {   
    "init" : async (cnfg,WebTorrent) =>  {
        let container_dir = cnfg.repo_location
        if ( container_dir == undefined ) {
            container_dir =  process.cwd() + "/repos"
        }
        //
        let subdir = cnfg.dir
        if ( subdir[0] != '/' ) subdir = ('/' + subdir)
        let repo_dir = container_dir + subdir
        let node = new WebTorrent()             // node or client
        //
        if ( (cnfg.add_boostrap !== undefined) && cnfg.add_boostrap ) {
            let additional = cnfg.add_boostrap
            for ( let peer_addr of additional ) {
                // try {
                //     const peer = new Multiaddr(peer_addr)   // peers
                //     await node.bootstrap.add(peer)
                // } catch (e) {
                //     console.log(e)
                // }
            }
        }
        //
        const id = await node.id()
        console.log(id)
        //
        const version = await node.version()
        console.log('Version:', version.version)
        return ['tor',node]
    },
    "import" : () => {
        let mod = require('torrent')
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
    },
    "diagnotistic" :  async (which,node) => {
        let tor = node
        let data = ""
        //
        switch ( which ) {
            case "peers" : {
                //
                break;
            }
            case "ls-pins" : {
                // local files 
            }
            case "boostrap-peers" : {
                const res = await tor.bootstrap.list()
                const peers = res.Peers

                data = peers
                break;
            }
        }
    }

}

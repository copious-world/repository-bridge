/*
    // using transmission
    // magnet:?xt=urn:btmh:1220caf1e1c30e81cb361b9ee167c4aa64228a7fa4fa9f6105232b28ad099f3a302e&dn=bittorrent-v2-test

new-projects@lists.openjsf.org

/*

let file = file_el.files[0]  // media is data that comes from an HTML file element...
let loaded<- = {
    "blob_url" : e.target.result,
    "name" : fname,
    "mtype" : mtype,
    "file" : file_copy
}

let media_data = await loaded<-

let exclusion_fields = [
    "_history","_prev_text",
    "_transition_path", "encode",
    "media.poster.ucwid_info", "media.source.ucwid_info",
    "media.poster.protocol", "media.source.protocol",
    "media.poster.ipfs", "media.source.ipfs"
]

let repository_fields = [ "media.source", "media.poster" ] 

upload_record = {
    "_tracking" : tracking,             // tracking of the asset
    "_id" :  this._user_id,             // should be a UCWID  ... from the client ... will be single user context
    "_author_tracking" :  this._author_tracking,
    "_paid" : paid,
    "_transition_path" : "asset_path",
    "asset_path" : `${tracking}+${asset_type}+${this._user_id}`,
    "title" : encodeURIComponent(title),
    "subject" : encodeURIComponent(subject),
    "keys" : keys,
    "asset_type" : asset_type,        // blog, stream, link-package, contact, ownership, etc...
    "media_type" : media_type,        // text, audio, video, image
    "abstract" : encodeURIComponent(abstract),
    "media" : {
        "poster" : poster,
        "source" : media_data  // <- 
    },
    "encode" : true,
    "txt_full" : encodeURIComponent(full_text),
    "dates" : {
        "created" : Date.now(),
        "updated" : modDate
    },
    "_history" : this._current_asset_history ? this._current_asset_history : [],
    "_prev_text" : this._current_asset_prev_text,
    "text_ucwid_info" : this._current_asset_text_ucwid_info,
    "repository_fields" : repository_fields,
    "exclusion_fields" : exclusion_fields,

    //
    "topic" : "command-upload",
    "path" : "upload-media",
    "file_name" : data_hash,
}






    https://www.npmjs.com/package/magnetizer
    https://www.npmjs.com/package/bencode
    //
    https://github.com/webtorrent/create-torrent
    magnet:?xt=urn:btih:HASH&dn=NAME&tr=TRACKER&so=0,2,4,6-8


    npm i parse-torrent


    const buf = Buffer.from('Some file content')
    buf.name = 'Some file name'


{
  host: 'localhost', // default 'localhost'
  port: 9091, // default 9091
  username: 'username', // default blank
  password: 'password', // default blank
  ssl: true, // default false use https
  url: '/my/other/url', // default '/transmission/rpc'
}



*/

const fs = require('fs')
const fsPromise = require('fs/promises')

const REPO_KEY = 'torv1'
const PACKAGE_NAME = "repository-bridge@0.7"
let tor_maker = null
let torrent_parser = null
// ----

const TRANSMISION_CLIENT = 'transmission-promise'

// ----
// ----


class WrapNode {

    constructor(a_node,cnf) {
        this.node = a_node
        this.conf = cnf
    }

    async store_local(pin_id) {     // tor_maker
        let turi = torrent_parser.toMagnetURI(pin_id)
        await this.node.addUrl(turi)
        await this.node.start([pin_id])
    }

    async rm_local(pin_id) {
        await this.node.remove([pin_id],true)
    }

    async add(object) {
        if ( tor_maker ) {
            let opts = {
                name: object.name,                  // name of the torrent (default = basename of `path`, or 1st file's name)
                comment: object.ucwid,              // free-form textual comments of the author
                createdBy: PACKAGE_NAME,            // name and version of program used to create torrent
                announceList: this.conf.announceList,   // custom trackers (array of arrays of strings) (see [bep12](http://www.bittorrent.org/beps/bep_0012.html))
                urlList: this.conf.urlList              // web seed urls (see [bep19](http://www.bittorrent.org/beps/bep_0019.html))
            }
            //
            let p = new Promise((resolve,reject) => {
                tor_maker(object, opts, (err, torrent) => {
                    if (!err) {
                        resolve(torrent)
                    } else {
                        reject(err)
                    }
                })    
            })
            try {
                let torrent = await p
                let torrent_info = torrent_parser(torrent)
                fs.writeFileSync(`${this.conf.media_dir}/${torrent_info.info_hash}.torrent`, torrent)  // is bencoded
                return torrent_info
            } catch (e) {
                return false
            }
        }
    }

    repo() {
        return this.node
    }
}


module.exports = {

    "init" : async (cnfg,TorrentClient) =>  {
        //
        let container_dir = cnfg.repo_location
        if ( container_dir == undefined ) {
            container_dir =  process.cwd() + "/repos"    // default
        }
        //
        let subdir = cnfg.dir
        if ( subdir[0] != '/' ) subdir = ('/' + subdir)
        //let repo_dir = container_dir + subdir
        let node = new TorrentClient(cnfg)             // node or client
        //conf.announceList
        //if ( (cnfg.announceList !== undefined) && cnfg.announceList ) {
          //  let additional = cnfg.announceList
        //}
        //
        //const id = await node.id()
        //console.log(id)
        //
        const version = "bittorrent-v1"
        console.log('Version:', version)
        let w_node = new WrapNode(node,cnfg)
        return [REPO_KEY,w_node]
    },
    "import" : async () => {
        let mod = require(TRANSMISION_CLIENT)
        tor_maker = await import('create-torrent')
        torrent_parser = await import('parse-torrent')
        return mod
    },
    "stringify" : (repo_record) => {
        let id_str = repo_record.info_hash /// torrent.info_hash
        return id_str
    },
    "fetch" : async (tor_hash,node) => {
        try {
            let tor_data = await node.get([tor_hash],['location'])
            let fpath = tor_data.location
            let data = await fsPromise.readFile(fpath)
            return data
        } catch (e) {}
        return false
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
                const peers = await this.conf.announceList
                data = peers
                break;
            }
        }
    }

}

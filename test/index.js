const test = require('ava');
const fsPromises = require('fs/promises');
const { cos } = require('prelude-ls');
//
const Repository = require('../lib/repository_bridge')

test('construction', async t => {
    //
    let conf = {
        'ipfs' : {}
    }
    //
    let repo = new Repository(conf,['ipfs','junk'])
    //
    t.false(repo.configs.ipfs === undefined)
    t.true(repo.configs.junk === undefined)
    //
    t.pass("this is a test")
})


test('initialization', async t => {
    let conf = {
        'ipfs' : {
            "dir" : "uploader-ipfs-repo",
            "swarm_tcp" : 4024,
            "swarm_ws" : 4025,
            "api_port" : 5024,
            "tcp_gateway" : 9292        
        }
    }
    //
    let repo = new Repository(conf,['ipfs'])
    await repo.init_repos()
    //

    let conf2 = {
        'ipfs' : {
            "dir" : "persistence-ipfs-repo",
            "swarm_tcp" : 4026,
            "swarm_ws" : 4027,
            "api_port" : 5026,
            "tcp_gateway" : 9294
        }
    }
    //
    let repo2 = new Repository(conf2,['ipfs'])
    await repo2.init_repos()
    //

    const repo_id = await repo.add('ipfs',{
        "path": "test",
        "content": "this is blob material"
    })

    console.log(repo_id)

    let entry_obj = {
        'ipfs' : repo_id,
        'protocol' : 'ipfs'
    }
    repo2.store(entry_obj)

    const repo_id2 = await repo.add('ipfs',{
        "path": "test",
        "content": "this is blob material number 2"
    })

    let entry_obj2 = {
        'ipfs' : repo_id2,
        'protocol' : 'ipfs'
    }
    repo2.replace(entry_obj,entry_obj2)

    let output = await repo2.fetch('ipfs',repo_id2)
    console.log(output)

    //
    t.pass("this is a test")
})
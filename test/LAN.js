//const test = require('ava');
//
const Repository = require('../lib/repository_bridge')
/*
test('construction', async t => {
    //
    let conf = {
        "local" : {
            "base_dir" : "./test/dat_LAN"
        }
    }
    //
    let repo = new Repository(conf,['LAN'])
    //
    t.false(repo.configs.local === undefined)
    //
    t.pass("this is a test")
})


test('initialization', async t => {
    let conf = {
        "local" : {
            "base_dir" : "./test/dat_LAN"
        }
    }
    //
    let repo = new Repository(conf,['lLANocal'])
    await repo.init_repos()
    //

    let conf2 = {
        "local" : {
            "base_dir" : "./test/dat_LAN"
        }
    }
    //
    let repo2 = new Repository(conf2,['LAN'])
    await repo2.init_repos()
    //

    const repo_id = await repo.add('local',{
        "meta": { "name" : "test", "author" : "tester" },
        "content": "this is blob material"
    })

    console.log(repo_id)

    let entry_obj = {
        'local' : repo_id,
        'protocol' : 'local'
    }
    repo2.store(entry_obj)

    const repo_id2 = await repo.add('LAN',{
        "meta": { "name" : "test2", "author" : "tester" },
        "content": "this is blob material number 2"
    })

    let entry_obj2 = {
        'LAN' : repo_id2,
        'protocol' : 'LAN'
    }
    repo2.replace(entry_obj,entry_obj2)

    console.log(66,repo_id2)
    let output = await repo2.fetch('LAN',repo_id2)
    console.log(output)

    //
    t.pass("this is a test")

    console.log(await repo2.ls('LAN','DOLIKEAMOTH.mp3'))
    for await ( let m of repo2.ls('LAN','DOLIKEAMOTH.mp3') ) {
        console.log("SINGLE ENTRY")
        console.log(m)
    }
    let wcid = await repo2.add_file('local','./test/dat_LAN/DOLIKEAMOTH.mp3')

    console.log("wcid wcid wcid ",wcid)


    for await ( let chnk of repo2.ls('LAN',wcid) ) {
        console.dir(chnk)
    }

    for await ( let chnk of repo2.cat('LAN',wcid) ) {
        console.dir(chnk)
    }

})
*/


async function tester() {
    let conf = {
        "LAN" : {
            "base_dir" : "./test/dat_LAN",
            "node_relay" : {
                "address" : "localhost",
                "port" : 1234
            }
        }
    }
    //
    let repo = new Repository(conf,['LAN'])
    await repo.init_repos()
    await repo.ready('LAN')

    let datum = {
        "testing" : "testing",
        "test" : "test",
        "testi" : "testi"
    }
    await repo.add('LAN',datum)
}


tester()


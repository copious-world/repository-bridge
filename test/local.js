const test = require('ava');
//
const Repository = require('../lib/repository_bridge')

test('construction', async t => {
    //
    let conf = {
        "local" : {
            "base_dir" : "./test/dat_local"
        }
    }
    //
    let repo = new Repository(conf,['local'])
    //
    t.false(repo.configs.local === undefined)
    //
    t.pass("this is a test")
})


test('initialization', async t => {
    let conf = {
        "local" : {
            "base_dir" : "./test/dat_local"
        }
    }
    //
    let repo = new Repository(conf,['local'])
    await repo.init_repos()
    //

    let conf2 = {
        "local" : {
            "base_dir" : "./test/dat_local"
        }
    }
    //
    let repo2 = new Repository(conf2,['local'])
    await repo2.init_repos()
    //

    const repo_id = await repo.add('local',{
        "path": "test",
        "content": "this is blob material"
    })

    console.log(repo_id)

    let entry_obj = {
        'local' : repo_id,
        'protocol' : 'local'
    }
    repo2.store(entry_obj)

    const repo_id2 = await repo.add('local',{
        "path": "test2",
        "content": "this is blob material number 2"
    })

    let entry_obj2 = {
        'local' : repo_id2,
        'protocol' : 'local'
    }
    repo2.replace(entry_obj,entry_obj2)

    let output = await repo2.fetch('local',repo_id2)
    console.log(output)

    //
    t.pass("this is a test")
})
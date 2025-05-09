//const test = require('ava');
//
const Repository = require('../lib/repository_bridge')

const readline = require('readline')

async function tester() {
    let conf = {
        "LAN" : {
            "base_dir" : "./dat_LAN_local",
            "local_only" : true,
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
    let response = await repo.add('LAN',datum)
    console.dir(response)
    
    let store_req = {
        "protocol" : "LAN",
        "LAN" : response
    }
    await repo.store(store_req)

    let rl = readline.createInterface(process.stdin, process.stdout)
    rl.setPrompt('waiting...> ');
    rl.prompt();
    let p = new Promise((resolve,reject) => {
        rl.on('line', function(line) {
            if (line === "q") rl.close();
            resolve(true)
        }).on('close',function(){
            resolve(false)
        });    
    })

    await p;

    let data = await repo.fetch('LAN',response)

    if ( data ) {
        console.dir(data.content)
        console.log(typeof data.content)
        console.log(data.content.toString())
        console.log("" + data.content)    
    } else {
        console.log("NO DATA")
    }
}


tester()


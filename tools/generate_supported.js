#!/usr/bin/env node

const fs = require('fs')



let conf_str = fs.readFileSync("repositories.json")
conf_str.toString()

let conf = JSON.parse(conf_str)

let req_paths = []
let export_lines = []

for ( let repo in conf ) {
    let accessor_path = conf[repo]
    let repo_var = `${repo}_access`
    //
    let require_str = `const ${repo_var} = require('${accessor_path}')`
    req_paths.push(require_str)
    //
    let export_line = `    "${repo}" : ${repo_var},`
    export_lines.push(export_line)
}


let require_str = req_paths.join('\n')
let exporters = export_lines.join('\n')

let output = `
${require_str}

module.exports = {
    //
${exporters}
    //
}

`


console.log(output)
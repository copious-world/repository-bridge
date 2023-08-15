
const ifps_access = require('./ipfs-link/accessor')
const tor_access = require('./ipfs-link/accessor')

module.exports = {
    //
    'ipfs' : ifps_access,
    'tor': tor_access
    //
}

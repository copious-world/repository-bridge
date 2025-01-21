
const ifps_access = require('./ipfs-link/accessor')
const tor_access = require('./torv1-link/accessor')
const local_access = require('./local-link/accessor')

module.exports = {
    //
    'ipfs' : ifps_access,
    'tor': tor_access,
    'local' : local_access
    //
}

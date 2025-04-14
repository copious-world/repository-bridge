
const local_access = require('./local-link/accessor')
const lan_access = require('./LAN-link/accessor')

module.exports = {
    //
    'local' : local_access,
    'LAN' : lan_access
    //
}

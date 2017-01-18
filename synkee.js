'use strict'
let SyncBee = require('./index.js')

let confs =
{
    clean       : [],
    filebase    : __dirname,
    files       : ['/index.js','/package.json'],
    mountbase   : __dirname,
    mountdirs   : ['/test/']
}

let bee = new SyncBee()
bee.testcopy = true
bee.testclean = false
bee.docopy = true
bee.quietmode = false
bee.writetofile = true
bee.fileout = './last-sync.txt'
if(typeof syncFile==='undefined') bee.setConfigs( confs )
else bee.loadConfigFile( syncFile )
bee.run();

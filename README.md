##SyncBee!
Can be used to sync files from local filesystem to networked/mapped/mounted drives. **Prosynkee** uses this package to do it's business!

#Useage

Require sync-bee. Create a SyncBee object. Set some properties. Call setConfigs() passing in a configuration object if you want to set configuration object manually. Or, call loadConfigFile() passing in the full path to a json file containing the configuration object. Call the run() method. It will output status to the console.

Properties on the sync-bee object to set:

 **testcopy** Set to true if you want to display to console the file move (versus actually moving the files; aka a dry run)

 **testclean** Set to true if you want to display to console the files deleted (versus actually deleting the files; aka a dry run)

 **quietmode** Set to true to squash the console output (default = false)

 **writetofile** Set to true to write the results of the sync to a file (default = true)

 **fileout** Set path to a file in which to log the results of the sync (default = "./logs/synced.txt")

Configuration object:

**cleans** any files that you would like deleted on the target prior to syncing

**filebase** base path that will be appended to each file (can be left blank if you want to define full path in the files array)

**files** files you want moved to the target

**mountbase** base path that will be appended to each directory defined in mountdirs (can be left blank if you want to define full path in the mountdirs array)

**mountdirs** mounted directory

Example script:
```
'use strict'
let SyncBee = require('sync-bee')

let confs =
{
    clean       : [],
    filebase    : '/Users/johnny/projects/todoapp/',
    files       : ['controllers/manageController.js','views/manage.html'],
    mountbase   : '/Users/johnny/mounts/',
    mountdirs   : ['dev/','test/']
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

```

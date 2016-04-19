Sync Bee!
Can be used to sync files from local filesystem to networked/mapped/mounted drives

#Useage

In this example the I process.env to get values from the bash profile.

```
var sb = require('sync-bee'),
cleans = [],
mounts = (typeof process.env.target!=='undefined' && process.env.target=='stage') ? ["stage01/","stage02/"] : ["test/"];
files = [
	{"id":568,"path":"admin/get_details.php"},
	{"id":568,"path":"admin/run_totals.php"},
	{"id":568,"path":"www/index.html"}
];

bee = new sb();
bee.fileout = process.env.UTILS_HOME+"logs/synced.txt";
bee.cleanedfile = process.env.UTILS_HOME+"logs/cleaned.txt";
bee._setconfigs({"clean":cleans,"files":files,"mountdirs":mounts});
bee.testcopy=(typeof process.env.diag!=='undefined') ? true : false;
bee.testclean=(typeof process.env.diag!=='undefined') ? true : false;
bee.run();
```
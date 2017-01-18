/*!
 * Node.JS module "Sync Bee!"
 * @description Can be used to sync files from local filesystem to networked/mapped/mounted drives
 * @author Paul S Michalek (psmichalek@gmail.com)
 * @license MIT
 * @example
 *
 *   var sb 			= require('sync-bee');
 *   var bee 			= new sb();
 *   bee.configfile 	= "./myConfig.json"; 		// looks like: { "cleaned":[], "files":[], "mountdirs":[] }; files append to this.evbase and mount paths append to this.mountbase
 *   bee.fileout 		= "./mySyncedFiles.txt"; 	// file that will show the list of files that were successfully copied
 *   bee.cleanedfile 	= "./myCleanedFiles.txt"; 	// file that will show the list of files that were successfully cleaned
 *   bee.testcopy 		= (typeof process.env.diag!=='undefined') ? true : false;
 *   bee.testclean 		= (typeof process.env.diag!=='undefined') ? true : false;
 *   bee.run();
 *
 * The MIT License (MIT)
 */

var _ 		= require('lodash'),
	moment 	= require('moment'),
	fsjson 	= require('fs-json')();

require('shelljs/global');

var SyncBee = function(){
	if (!(this instanceof SyncBee) ) return new SyncBee();
	this.configfile = "./configs/syncfiles.json";
	this.fileout = "./logs/synced.txt";
	this.cleanedfile = "./logs/cleaned.txt"
	this.mountdirs = undefined;
	this.filebase = undefined;
	this.mountbase = undefined;
	this.files = undefined;
	this.copied = [];
	this.failed = [];
	this.cleans = [];
	this.cleaned = [];
	this.doclean=true;
	this.docopy=true;
	this.quietmode=false;
	this.writetofile=true;
	this.testcopy=false;
	this.testclean=false;
	this.project = undefined;
}

SyncBee.prototype.setConfigs = function(conf){
    var self = this;
    self._setconfigs(conf);
}

SyncBee.prototype.loadConfigFile = function(file){
    var self = this;
    self._loadconfigs(file);
}

SyncBee.prototype.run = function(){
	var self = this;

	self._log('\n');

	if(typeof self.project==='undefined') {
		self._log('------------------');
		self._log(' Sync-Bee Running ');
		self._log('------------------');
	} else {
		self._log('==================================');
		self._log(' Sync-Bee Running For '+self.project);
		self._log('==================================');
	}

	function _setTargetDirs(){
		var goodDirs = _.clone(self.mountdirs);
		self._log(' Checking mounted drives.');

		function _failed(m,v){ self._log(m); _.pull(goodDirs,v); }

		_.each(self.mountdirs,function(mountdir){
			var mountedDrive = self.mountbase+mountdir;
			if( test('-e',mountedDrive) ){
				var mlist = ls(mountedDrive);
				if(mlist.length==0) _failed('   WARNING: Drive is not connected to a remote host. '+mountedDrive,mountdir);
			} else _failed('   WARNING: Mounted directory does not exist. '+mountedDrive,mountdir);
		});

		self.mountdirs=[];
		self.mountdirs=_.clone(goodDirs);
		if(self.mountdirs.length>0){
			self._log('\n Files will be synced to the following mounted drives: ');
			_.each(self.mountdirs,function(mountdir){ self._log('    '+self.mountbase+mountdir); });
		}
	}

	function _startsync(){
		self._log('\n Started sync at '+moment().format("MM/DD/YYYY hh:mm:ss A")+'\n');
		self._clean(function(o){
			if(self.doclean && self.cleaned.length>0) self._log(' Cleaned '+self.cleaned.length);
			self._copy(function(o){
				if(self.docopy && self.copied.length>0) self._log(' Copied '+self.copied.length+'\n');
				self._outputs(function(end){
					if(end) self._log(' Completed at '+moment().format("MM/DD/YYYY hh:mm:ss A")+'\n');
				})
			})
		});
	}

	if( _.isUndefined(self.mountbase) ){
		if( !_.isUndefined(process.env.MOUNTDIR) ) self.mountbase = process.env.MOUNTDIR;
		else {
			self._log(' WARNING: There is no mount directory base path (this.mountbase) defined so all the "mountdirs" paths must be full paths from the local files system root.\n');
			self.mountbase='';
		}
	}

	if( _.isUndefined(self.filebase) ){
		if( !_.isUndefined(process.env.SYNCBEE_FILE_BASE) ) self.filebase = process.env.SYNCBEE_FILE_BASE;
		else {
			self._log(' WARNING: There is no file base path defined so all the file paths must be full paths from the local files system root.\n');
			self.filebase='';
		}
	}

	if( typeof self.configfile!=='undefined' && self.configfile!=''){
		self._loadconfigs(self.configfile);
		if( typeof self.mountbase!=='undefined' && typeof self.filebase!=='undefined' && typeof self.files!=='undefined' && typeof self.mountdirs!=='undefined' ) {
			_setTargetDirs();
			if(self.mountdirs.length>0) _startsync();
			else self._log(' No operations performed due to no drives mounted properly. Check your local filesystem to ensure the paths identified in the config file are there and mounted to the remote host.\n');
		} else self._log(' FAIL: No sync was started due to missing ingredients (i.e. vars undefined)! ');
	} else self._log(' FAIL: No operations performed.');

}


SyncBee.prototype._loadconfigs = function(path){
	var self = this;
	var confs = undefined;
	try{ confs = fsjson.loadSync(path); }
	catch(e){ self._log(' Error loading the config file. ',e); }
	if ( typeof confs!=='undefined' ) self._setconfigs( confs );
}

SyncBee.prototype._setconfigs = function(conf){
	var self = this;
	if( _.isUndefined(conf) ) self._log(' Missing config object: '+self.configfile);
	else if( _.isUndefined(conf.files) ) self._log(' * Error: No files to sync identified in your config object (missing the "files" array).');
	else {
		self.files = _.clone(conf.files);
		if(conf.clean) self.cleans = _.clone(conf.clean);
		if(conf.mountdirs) self.mountdirs = _.clone(conf.mountdirs);
		else self._log(' ERROR: No directories (mountdirs) to mount to are identified in the config object.');
        if( !_.isUndefined(conf.filebase) ) self.filebase = _.clone(conf.filebase);
        if( !_.isUndefined(conf.mountbase) ) self.mountbase = _.clone(conf.mountbase);
    }
}

SyncBee.prototype._clean = function(done){
	var self =  this;
	if(self.doclean && !_.isUndefined(self.cleans) && self.cleans.length>0){
		self._setcleanfile();
		var h = ' Cleaned on '+moment().format("MM/DD/YYYY hh:mm:ss A");
		if(self.writetofile) h.toEnd(self.cleanedfile);
		self._log(h);
		_.each(self.cleans,function(path){
			_.each(self.mountdirs,function(mountdir){
				var rmpath = self.mountbase+mountdir+path;
				rmpath = rmpath.replace("//","/");
				if(self.testclean){
					self.cleaned.push(rmpath);
					var cmd = 'rm -f '+rmpath+'\n';
					self._log(cmd);
					if(self.writetofile) cmd.toEnd(self.cleanedfile);
				} else {
					rm('-f',rmpath);
					if(ls(rmpath).length==0) self.cleaned.push(rmpath);
				}
			});
		});
	}
	done(self);
}

SyncBee.prototype._copy = function(done){
	var self = this;
	if(self.docopy){
		_.each(self.files,function(fp){
			var file = fp;
			var here = self.filebase+file;
			if( !test('-e',here) ) {
				self._log(' WARNING: Local file not found (double check path value in config). '+here);
				self.failed.push({file:file,here:here,there:'no local file',inst:''});
			}else{
				_.each(self.mountdirs,function(mountdir){
					if( !_.isUndefined(mountdir) ){
						var mountedDrive = self.mountbase+mountdir;
						var mountpath = mountedDrive+file;
						var there = mountpath.substring(0, mountpath.lastIndexOf("/"));
						var isDirThere = test('-e',there),
							isFileThere = true;
						var fii = {file:file,here:here,there:there,inst:mountdir};
						if( !isDirThere ) {
							self._log(' Creating target directory. '+there);
							mkdir('-p',there);
						}
						if( !self.testcopy ) {
							cp(here,there);
							isFileThere = test('-e',mountpath);
						}
						if( isFileThere ) self.copied.push(fii);
						else self.failed.push(fii);

					}
				});
			}
		});
	}
	done(self);
}

SyncBee.prototype._outputs = function(done){
	var self = this;
	self._setoutputfile();
	self._setoutputheader('main');
	self._logit('copied');
	self._logit('failed');
	done(self);
}

SyncBee.prototype._setcleanfile = function(){
	var self = this;
	rm('-f',self.cleanedfile);
	if(self.writetofile) touch(self.cleanedfile);
}

SyncBee.prototype._setoutputfile = function(){
	var self = this;
	rm('-f',self.fileout);
	if(self.writetofile) touch(self.fileout);
}

SyncBee.prototype._setoutputheader = function(type){
    var self = this;
    if( test('-e',self.fileout) ){
    	var h='------------------------ \n';
    	if(type=='main') h=h+' Files Synced On: '+moment().format("MM/DD/YYYY hh:mm:ss A")+' \n';
    	else if(type=='copied') h=h+' SUCCESSFUL ('+self.copied.length+')\n';
    	else if(type=='failed') h=h+' FAILED ('+self.failed.length+')\n';
    	h=h+'------------------------ \n';
    	if(self.writetofile) h.toEnd(self.fileout);
    	return h;
    } else {
        return ''
    }
}

SyncBee.prototype._logit = function(key){
	var self = this;
	self._log( self._setoutputheader(key) );
	_.each(self[key],function(oo){
		var out = ' '+self.mountbase+oo.inst+oo.file+'\n';
		if(self.writetofile && test('-e',self.fileout) ) out.toEnd(self.fileout);
		self._log(out);
	});
}

SyncBee.prototype._log = function(txt,obj){
	var self = this;

	if( !self.quietmode && typeof obj!=='undefined' ) console.log(txt,obj);
	else if( !self.quietmode && typeof obj==='undefined' ) console.log(txt);

}

module.exports = SyncBee;

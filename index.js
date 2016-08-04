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
	this.evbase = undefined;
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
}

SyncBee.prototype.run = function(){
	var self = this;
	
	function _startsync(){
		self._log(' Start at '+moment().format("MM/DD/YYYY hh:mm:o A"));
		self._clean(function(o){
			self._log(' Cleaned '+self.cleaned.length);
			self._copy(function(o){
				self._log(' Copied '+self.copied.length)
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

	if( _.isUndefined(self.evbase) ){
		if( !_.isUndefined(process.env.EV_BASE) ) self.evbase = process.env.EV_BASE;
		else {
			self._log(' WARNING: There is no file base path (this.evbase) defined so all the file paths must be full paths from the local files system root.\n');
			self.evbase='';
		}
	}

	if( typeof self.configfile!=='undefined' && self.configfile!=''){
		self._loadconfigs(self.configfile);
		if( typeof self.mountbase!=='undefined' && typeof self.evbase!=='undefined' && typeof self.files!=='undefined' && typeof self.mountdirs!=='undefined' ) {
			self._log(' Sync is a go!! ');
			_startsync();
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
	if( _.isUndefined(conf) ) self._log(' Missing config file: '+self.configfile);
	else if( _.isUndefined(conf.files) ) self._log(' * Error: No files to sync identified in your config file (missing the "files" array).');
	else {
		self.files = _.clone(conf.files);
		if(conf.clean) self.cleans = _.clone(conf.clean);
		if(conf.mountdirs) self.mountdirs = _.clone(conf.mountdirs);
		else self._log(' * Error: No directories (mountdirs) to mount to are identified in your '+self.configfile+' file.');
	}
}

SyncBee.prototype._clean = function(done){
	var self =  this;
	if(self.doclean){
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
			var here = self.evbase+file;
			if( !test('-e',here) ) self.failed.push({file:file,here:here,there:'no local file',inst:''});
			else{
				_.each(self.mountdirs,function(mountdir){
					var mountpath = self.mountbase+mountdir+file;
					var there = mountpath.substring(0, mountpath.lastIndexOf("/"));
					var fii = {file:file,here:here,there:there,inst:mountdir};
					if(!self.testcopy) cp(here,there);
					if( self.testcopy || test('-e',there) ) self.copied.push(fii);
					if( !test('-e',there) ) self.failed.push(fii);
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
	var h='------------------------ \n';
	if(type=='main') h=h+' Files Synced On: '+moment().format("MM/DD/YYYY hh:mm:ss A")+' \n';
	else if(type=='copied') h=h+' SUCCESSFUL ('+self.copied.length+')\n';
	else if(type=='failed') h=h+' FAILED ('+self.failed.length+')\n';
	h=h+'------------------------ \n';
	if(self.writetofile) h.toEnd(self.fileout);
	return h;
}

SyncBee.prototype._logit = function(key){
	var self = this;
	self._log( self._setoutputheader(key) );
	_.each(self[key],function(oo){
		var out = ' '+self.mountbase+oo.inst+oo.file+'\n';
		if(self.writetofile) out.toEnd(self.fileout);
		self._log(out);
	});
}

SyncBee.prototype._log = function(txt,obj){
	var self = this;

	if( !self.quietmode && typeof obj!=='undefined' ) console.log(txt,obj);
	else if( !self.quietmode && typeof obj==='undefined' ) console.log(txt);

}

module.exports = SyncBee;

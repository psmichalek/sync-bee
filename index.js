/*!
 * Node.JS module "Sync Bee!"
 * @description Can be used to sync files from local filesystem to networked/mapped/mounted drives
 * @author Paul S Michalek (psmichalek@gmail.com)
 * @license MIT
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
	this.mountdirs = undefined;
	this.evbase = undefined;
	this.mountbase = undefined;
	this.files = undefined;
	this.copied = [];
	this.failed = [];
	this.cleans = [];
	this.cleaned = [];
	this.fileout = "./logs/synced.txt";
	this.cleanedfile = "./logs/cleaned.txt"
	this.doclean=true;
	this.docopy=true;
	this.quietmode=false;
	this.writetofile=true;
	this.testcopy=false;
	this.testclean=false;

	if(typeof process.env.MOUNTDIR!=='undefined') this.mountbase = process.env.MOUNTDIR;
	else console.log('* Error: MOUNTDIR is not defined in your environment.');
	
	if(typeof process.env.EV_BASE!=='undefined') this.evbase = process.env.EV_BASE;
	else console.log('* Error: EV_BASE is not defined in your environment.');
	
	this._loadconfigs(this.configfile);
}

SyncBee.prototype.run = function(){
	var self = this;
	if( !_.isUndefined(self.mountbase) && !_.isUndefined(self.evbase) && !_.isUndefined(self.files) && !_.isUndefined(self.mountdirs) ){
		self._log(' Start at '+moment().format("MM/DD/YYYY hh:mm:o A"));
		self._clean(function(o){
			self._log(' Cleaned '+self.cleaned.length);
			self._copy(function(o){
				self._log(' Copied '+self.copied.length)
				self._outputs(function(end){
					if(end) self._log(' Completed at '+moment().format("MM/DD/YYYY hh:mm:ss A"));
				})
			})
		});
	} 
	else self._log(' No opertations performed.');
}

SyncBee.prototype._loadconfigs = function(path){
	var self = this;
	self._setconfigs( fsjson.loadSync(path) );
}

SyncBee.prototype._setconfigs = function(conf){
	var self = this;
	if( _.isUndefined(conf) ) console.log('Missing config file: '+this.configfile);
	else if( _.isUndefined(conf.files) ) console.log('* Error: No files to sync identified in your config file (missing the "files" array).');
	else {
		self.files = _.clone(conf.files);
		if(conf.clean) self.cleans = _.clone(conf.clean);
		if(conf.mountdirs) self.mountdirs = _.clone(conf.mountdirs);
		else console.log('* Error: No directories (mountdirs) to mount to are identified in your '+this.configfile+' file.');
	}
}

SyncBee.prototype._clean = function(done){
	var self =  this;
	if(self.doclean){
		self._setcleanfile();
		var h = ' Cleaned on '+moment().format("MM/DD/YYYY hh:mm:ss A")+'\n\n';
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
			var here = self.evbase+file;console.log(here)
			if( !test('-e',here) ) self.failed.push({file:file,here:here,there:'no local file',inst:'NA'});
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

SyncBee.prototype._log = function(txt){
	var self = this;
	if(!self.quietmode) console.log(txt);
}

module.exports = SyncBee;

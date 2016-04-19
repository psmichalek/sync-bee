var chai 	=require('chai'),
	expect 	=chai.expect,
	assert 	=chai.assert,
	_ 		=require('lodash'),
	SyncBee	=require('../index.js');

require('shelljs/global');
require('mocha-sinon');

describe('SyncBee',function(){

	this.timeout(10000)
	var busyBee = new SyncBee();

    it('should instanciate a SyncBee object',function(){ 
        assert.isObject(busyBee); 
    });
	
    it('should instaniate a SyncBee object with certain properties',function(){  
        expect(busyBee).to.have.property('configfile');
        expect(busyBee).to.have.property('mountdirs');
        expect(busyBee).to.have.property('evbase');
        expect(busyBee).to.have.property('mountbase');
        expect(busyBee).to.have.property('files');
        expect(busyBee).to.have.property('copied');
        expect(busyBee).to.have.property('failed');
        expect(busyBee).to.have.property('cleans');
        expect(busyBee).to.have.property('cleaned');
        expect(busyBee).to.have.property('fileout');
        expect(busyBee).to.have.property('cleanedfile');
        expect(busyBee).to.have.property('docopy');
        expect(busyBee).to.have.property('quietmode');
        expect(busyBee).to.have.property('writetofile');
        expect(busyBee).to.have.property('testcopy');
        expect(busyBee).to.have.property('testclean');
    });

    it('should have a specific default config file set',function(){  
        expect(busyBee).to.have.property('configfile');
        expect(busyBee.configfile).to.equal("./configs/syncfiles.json");
    });

    // it('should allow you to set a config object',function(){  
    //     busyBee._setconfigs({clean:[],files:[{"path":"index.html","id":""}],mountdirs:["dev/"]});
    //     assert.isArray(busyBee.files);
    // });

});
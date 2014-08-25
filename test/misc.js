var expect = require('chai').expect
var config = require('../config')
var util = require('../util')
var p = require('../support').p
var _ = require('underscore')

describe("Misc", function(){
  it('should read files', function(done){
    util.readFiles('samples/s1', function(err, srcFiles){
      expect(_(srcFiles).size()).to.eql(3)
      done()
    })
  })
})

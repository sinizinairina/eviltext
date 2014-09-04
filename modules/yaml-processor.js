var yaml = require('js-yaml')
var fs = require('fs')
var fspath = require('path')
var baseProcessor = require('./base-processor')

var target = function(file){return file.basePath + '.json'}

exports.targets = function(file, config){return [target(file)]}

exports.process = function(srcDir, buildDir, file, config, ecb, cb, dontWrite){
  fs.readFile(fspath.join(srcDir, file.path), _.fork(ecb, function(data){
    try{
      data = yaml.safeLoad(data)
    }catch(err){
      return ecb(err)
    }

    data = _(baseProcessor.extractAttributesFromFileStats(file))
    .extendIfNotBlank(baseProcessor.parseAttributes(data), {updatedAt: file.updatedAt})

    if(dontWrite) cb(data)
    else {
      app.writeFile(fspath.join(buildDir, target(file)), JSON.stringify(data, null, 2)
      , ecb, function(){
        cb(data)
      })
    }
  }))
}

exports.processConfig = function(srcDir, buildDir, file, config, ecb, cb){
  exports.process(srcDir, buildDir, file, config, ecb, cb, true)
}
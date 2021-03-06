var yaml = require('js-yaml')
var fs = require('fs')
var baseProcessor = require('./base-processor')

var target = function(file){return file.basePath + '.json'}

exports.process = function(srcDir, buildDir, file, config, Application, ecb, cb, dontWrite){
  fs.readFile(app.pathUtil.join(srcDir, file.path), _.fork(ecb, function(data){
    try{
      data = yaml.safeLoad(data)
    }catch(err){
      return ecb(err)
    }

    data = _(baseProcessor.extractAttributesFromFileStats(file))
    .extendIfNotBlank(baseProcessor.parseAttributes(data, file.parent.basePath)
    , {updatedAt: file.updatedAt})

    // Application-specific processing.
    if(Application) data = Application.process(data, file.parent.basePath)

    if(dontWrite) cb(data)
    else {
      app.writeFile(app.pathUtil.join(buildDir, target(file)), JSON.stringify(data, null, 2)
      , ecb, function(){
        app.copyFile(app.pathUtil.join(srcDir, file.path), app.pathUtil.join(buildDir, file.path)
        , ecb, function(){cb(data)})
      })
    }
  }))
}

exports.processConfig = function(srcDir, buildDir, file, config, ecb, cb){
  exports.process(srcDir, buildDir, file, config, null, ecb, cb, true)
}
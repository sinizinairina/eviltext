var fs = require('fs')
var fspath = require('path')

var target = function(file){return file.path}

var warnAboutGraphicMagicOnce = _.once(function(){
  app.warn("[core] no GraphicsMagick installed, images won't be resized")
})

// Parsing string expression `(Width)x(Height)(Format)` -> `{width, height, format}`.
var parseImageFormatCache = {}
exports.parseImageFormat = function(expression){
  if(!(expression in parseImageFormatCache)){
    var result = null
    var match = /(\d+)x?(\d*)([^\d]*)/.exec(expression)
    if(match){
      result = {}
      if(match[1]) result.width = parseInt(match[1])
      if(match[2]) result.height = parseInt(match[2])
      if(match[3]) result.format = _s.strip(match[3])
    }else app.warn('[image-processor] invalid image format expression ' + expression)
    parseImageFormatCache[expression] = result
  }
  return parseImageFormatCache[expression]
}

var originalTarget = function(file){return file.basePath + '.' + file.extension}
var resizedTarget = function(file, sizeAlias){
  return file.basePath + '.' + sizeAlias + '.' + file.extension
}

exports.targets = function(file, config){
  var targets = [originalTarget(file)]
  if(config.images){
    _(config.images).each(function(sizeFormat, sizeAlias){
      targets.push(resizedTarget(file, sizeAlias))
    })
  }
  return targets
}

exports.process = function(srcDir, buildDir, file, config, ecb, cb){
  // Parsing image formats.
  var sizes = []
  if(config.images){
    _(config.images).each(function(sizeFormat, sizeAlias){
      var sizeFormat = exports.parseImageFormat(sizeFormat)
      if(sizeFormat) sizes.push([sizeAlias, sizeFormat])
    })
  }

  var originalPath = fspath.join(srcDir, file.path)
  app.copyFile(originalPath, fspath.join(buildDir, originalTarget(file))
  , ecb, function(){
    _(sizes).asyncEach(function(sizeAliasAndFormat, i, ecb, next){
      var sizeAlias  = sizeAliasAndFormat[0]
      var sizeFormat = sizeAliasAndFormat[1]

      var targetPath = fspath.join(buildDir, resizedTarget(file, sizeAlias))
      app.ensurePathInBuildDirectory(targetPath)

      require('gm')(originalPath)
      .resize(sizeFormat.width, sizeFormat.height, sizeFormat.format)
      .autoOrient()
      .noProfile()
      .write(targetPath, _.fork(function(err){
        // If no GraphicsMagick installed, just copying the same image.
        if(err.syscall == 'spawn' && err.code == 'ENOENT'){
          warnAboutGraphicMagicOnce()
          app.copyFile(originalPath, targetPath, ecb, next)
        }else ecb(err)
      }, next))
    }, ecb, cb)
  })
}
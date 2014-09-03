var fs = require('fs')
var fspath = require('path')
var baseProcessor = require('../base-processor')

var targetMd = function(file){return file.basePath + '.' + file.extension}
var targetJson = function(file){return file.basePath + '.json'}

exports.targets = function(file, config){return [targetMd(file), targetJson(file)]}

exports.process = function(srcDir, buildDir, file, config, ecb, cb, dontWrite){
  var parser = require('./parser')
  var textUtil = require('../text-util')

  app.readFile(fspath.join(srcDir, file.path), ecb, function(text){
    // Parsing markdown.
    try{
      var result = parser.parse(text)
    }catch(err){
      return ecb(err)
    }
    var html = result[0]
    var yamlAttributes = result[1]
    var markdownAttributes = result[2]

    // Updating html.
    result = textUtil.postprocessHtml(html, {
      path                 : file.basePath,
      replaceRelativePaths : true,
      lazyImages           : config.lazyImages
    })
    var html = result[0]
    var htmlImages = result[1]

    // Truncating
    if(config.previewLength > 0){
      var previewAttributes = {}
      var result = textUtil.smartHtmlTruncate(html, config.previewLength)
      previewAttributes.htmlPreview = result[0]
      previewAttributes.htmlPreviewLength = result[1]
      previewAttributes.htmlPreviewTruncated = result[2]
    }

    // File attributes.
    var fileAttributes = baseProcessor.extractAttributesFromFileStats(file)

    var data = _.extendIfNotBlank({}, fileAttributes, markdownAttributes, yamlAttributes
    , {updatedAt: file.updatedAt, html: html, htmlImages: htmlImages}, previewAttributes)

    // Copying md and generating json files.
    if(dontWrite) cb(data)
    else{
      app.copyFile(fspath.join(srcDir, file.path), fspath.join(buildDir, targetMd(file))
      , ecb, function(){
        app.writeFile(fspath.join(buildDir, targetJson(file)), JSON.stringify(data, null, 2), ecb
        , function(){cb(data)})
      })
    }
  })
}

exports.processConfig = function(srcDir, buildDir, file, config, ecb, cb){
  exports.process(srcDir, buildDir, file, config, ecb, cb, true)
}
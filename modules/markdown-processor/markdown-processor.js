var fs = require('fs')
var fspath = require('path')
var baseProcessor = require('../base-processor')

var targetMd = function(file){return file.lowerCasedPath}
var targetJson = function(file){return file.basePath + '.json'}

exports.process = function(srcDir, buildDir, file, config, Application, ecb, cb, dontWrite){
  var parser = require('./parser')
  var textUtil = require('../text-util')

  app.readFile(fspath.join(srcDir, file.path), ecb, function(text){
    // Parsing markdown.
    try{
      var result = parser.parse(text, file.parent.basePath)
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

    // Truncating.
    htmlPreviews = {}
    _(config.previewLengths).each(function(previewLength, previewAlias){
      htmlPreviews[previewAlias] = textUtil.smartHtmlTruncate(html, previewLength)
    })

    // File attributes.
    var fileAttributes = baseProcessor.extractAttributesFromFileStats(file)

    var data = _.extendIfNotBlank({}, fileAttributes, markdownAttributes, yamlAttributes
    , {updatedAt: file.updatedAt, html: html, htmlImages: htmlImages}
    , {htmlPreviews: htmlPreviews})

    // Application-specific processing.
    if(Application) data = Application.process(data, file.parent.basePath)

    // Copying md and generating json files.
    if(dontWrite) cb(data)
    else{
      app.writeFile(fspath.join(buildDir, targetJson(file)), JSON.stringify(data, null, 2), ecb
      , function(){
        app.copyFile(fspath.join(srcDir, file.path), fspath.join(buildDir, targetMd(file))
        , ecb, function(){cb(data)})
      })
    }
  })
}

exports.processConfig = function(srcDir, buildDir, file, config, ecb, cb){
  exports.process(srcDir, buildDir, file, config, null, ecb, cb, true)
}
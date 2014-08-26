var fs = require('fs')
var fspath = require('path')
var marked = require('marked')
var baseProcessor = require('../base-processor')
var textUtil = require('../text-util')

var targetMd = function(file){return file.basePath + '.' + file.extension}
var targetJson = function(file){return file.basePath + '.json'}

exports.targets = function(file, config){return [targetMd(file), targetJson(file)]}

exports.markedOptions = {
  gfm         : true,
  tables      : true,
  breaks      : false,
  pedantic    : false,
  sanitize    : false,
  smartLists  : true,
  smartypants : false,
  langPrefix  : 'lang-'
}

exports.parseMarkdown = function(markdown){
  var splitMarkdownIntoTextAndAttributes = function(tokens){
    tokens = _(tokens).clone()
    tokens.reverse()
    var textTokens = []
    var attrTokens = []
    var inList = false
    _(tokens).each(function(token, i){
      if(i == 0 && token.type == 'list_end') inList = true
      if(inList){
        if(token.type == 'text') attrTokens.push(token)
      }else textTokens.push(token)
      if(inList && token.type == 'list_start') inList = false
    })
    textTokens.reverse()
    attrTokens.reverse()
    return [textTokens, attrTokens]
  }

  // Parses attribute line, normalize attribute names and cast values to types.
  var parseAttributeLine = function(line){
    var result
    // `Key : Value`
    if(match = /^\s*([^:]*[^:\s][^:]*)(\s*:\s*)(.*[^\s].*)\s*$/i.exec(line))
      result = [match[1], match[3]]
    // Boolean attribute, `Key`.
    else if(match = /^\s*([^:]*[^:\s][^:]*)\s*$/i.exec(line))
      result = [match[1], 'true']
    else result = null
    return result
  }

  var parseAttributeTokens = function(attrTokens){
    var attrs = {}
    _(attrTokens).each(function(token){
      if(_(token.text).isPresent()){
        var nameAndValue = parseAttributeLine(token.text)
        attrs[nameAndValue[0]] = nameAndValue[1]
      }
    })
    return baseProcessor.parseAttributes(attrs)
  }

  // Parsing markdown text into tokens.
  var tokens = marked.lexer(markdown, exports.markedOptions)
  var textAndAttributes = splitMarkdownIntoTextAndAttributes(tokens)
  var textTokens = textAndAttributes[0]
  var attrTokens = textAndAttributes[1]

  // Parsing attribute tokens.
  var markdownAttrs = parseAttributeTokens(attrTokens)

  // If there's no title attribute - trying to extract title from the heading.
  if((textTokens.length > 0) && _(markdownAttrs.title).isBlank()){
    var firstToken = textTokens[0]
    if(firstToken.type == 'heading' && firstToken.depth == 1 && _(firstToken.text).isPresent()){
      // Extracting title and removing it from text.
      textTokens.shift()
      _(markdownAttrs).extend(baseProcessor.parseAttributes({title: firstToken.text}))
    }
  }

  // Generating html. Marked required `links` to work properly.
  textTokens.links = tokens.links
  var html = marked.parser(textTokens, exports.markedOptions)

  return [html, markdownAttrs]
}

exports.extractYaml = function(text){
  var match = /^\s*---([\s\S]*)---[\s\n]*([\s\S]*)$/g.exec(text)
  if(match){
    var yaml = require('js-yaml')
    var data = yaml.safeLoad(match[1])
    if(!_(data).isObject()) data = {}
    return [baseProcessor.parseAttributes(data), match[2]]
  }
  return [{}, text]
}

exports.process = function(srcDir, buildDir, file, config, ecb, cb, dontWrite){
  // Parsing markdown text into tokens.
  app.readFile(fspath.join(srcDir, file.path), ecb, function(text){
    // Parsing YAML options.
    try{
      var yamlAttributesAndText = exports.extractYaml(text)
    }catch(err){
      return ecb(err)
    }
    var yamlAttributes = yamlAttributesAndText[0]
    var text = yamlAttributesAndText[1]

    // Parsing markdown.
    var htmlAndAttributes = exports.parseMarkdown(text)
    var html = htmlAndAttributes[0]
    var markdownAttributes = htmlAndAttributes[1]

    // Updating html.
    html = textUtil.postprocessHtml(html, {
      path                 : file.basePath,
      replaceRelativePaths : true,
      lazyImages           : true
    })

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
    , {updatedAt: file.updatedAt, html: html}, previewAttributes)

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
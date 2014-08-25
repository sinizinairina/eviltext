var fs = require('fs')
var fspath = require('path')
var marked = require('marked')
var baseProcessor = require('../base-processor')

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

exports._isAttributeSectionName = function(name){
  name = name.toLowerCase()
  name = baseProcessor.translateAttributeName(name)
  return name == 'attributes'
}

exports.parseMarkdown = function(markdown){
  // Removing attributes section from generated html.
  var removeAttributesFromTokens = function(tokens, skipFirstHeading){
    var result = []
    // TODO don't use named attrs on array.
    result.links = tokens.links
    var inAttributesSection = false
    for(var i = 0; i < tokens.length; i++){
      var token = tokens[i]
      if((token.type == 'heading') && (token.depth == 1)){
        if(skipFirstHeading && (i == 0) && !exports._isAttributeSectionName(token.text)) continue
        inAttributesSection = exports._isAttributeSectionName(token.text)
      }
      if(!inAttributesSection) result.push(token)
    }
    return result
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

  // Extracting attributes from text.
  var extractAttributesFromText = function(tokens){
    var attributes = {}

    var inAttributesSection = false
    var inList              = false
    var nameAndValue
    _(tokens).each(function(token){
      if((token.type == 'heading') && (token.depth == 1))
        inAttributesSection = exports._isAttributeSectionName(token.text)

      if(token.type == 'list_item_start') inList = true
      if(token.type == 'list_item_end')   inList = false

      if(
        inAttributesSection && inList && (token.type == 'text') && _(token.text).isPresent() &&
        (nameAndValue = parseAttributeLine(token.text))
      ){
        var name = nameAndValue[0]
        var value = nameAndValue[1]
        // name  = app.normalizeAttributeName(name)
        // name  = app.translateAttributeName(name)
        // value = app.parseAttributeValue(name, value)
        attributes[name] = value
      }
    })

    return baseProcessor.parseAttributes(attributes)
  }

  // Parsing markdown text into tokens.
  var tokens = marked.lexer(markdown, exports.markedOptions)

  var dataAttributes = extractAttributesFromText(tokens)

  // Extract title from text.
  var extractTitleFromText = function(tokens){
    var token = tokens[0] || {}
    if(
      (token.type == 'heading') && (token.depth == 1) &&
      !exports._isAttributeSectionName(token.text) && _(token.text).isPresent()
    )
      return _s.strip(token.text)
  }

  // Trying to extract title from heading if it's not specified explicitly.
  var skipFirstHeading = false
  if(_(dataAttributes.title).isBlank()){
    skipFirstHeading     = true
    dataAttributes.title = extractTitleFromText(tokens)
  }

  // Generating html.
  var tokensWithoutAttributes = removeAttributesFromTokens(tokens, skipFirstHeading)
  var html = marked.parser(tokensWithoutAttributes, exports.markedOptions)

  return [html, dataAttributes]
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
    html = app.textUtil.postprocessHtml(html, {
      path                 : file.basePath,
      replaceRelativePaths : true,
      lazyImages           : true
    })

    // Truncating
    if(config.previewLength > 0){
      var previewAttributes = {}
      var result = app.textUtil.smartHtmlTruncate(html, config.previewLength)
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
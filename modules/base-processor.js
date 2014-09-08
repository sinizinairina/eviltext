exports.normalizeAttributeName = function(name){
  name = _s.camelize(name)
  return name.charAt(0).toLowerCase() + name.substr(1)
}

exports.parseAttributeValue = function(name, value, mountPath){
  var parser
  if(parser = app.attributeParsers[app.attributeTypes[name]]) return parser(value, mountPath)
  else return value
}

exports.extractAttributesFromFileStats = function(file){
  return {title: _s.humanize(file.baseName)}
}

exports.parseAttributes = function(data, mountPath){
  var parsed = {}
  if(!data) return parsed
  _(data).each(function(value, name){
    name = exports.normalizeAttributeName(name)
    name = exports.translateAttributeName(name)
    parsed[name] = exports.parseAttributeValue(name, value, mountPath)
  })
  return parsed
}

exports.translateAttributeName = function(attributeName){
  return app.attributeTranslation[attributeName] || attributeName
}
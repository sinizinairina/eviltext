exports.normalizeAttributeName = function(name){
  name = _s.camelize(name)
  return name.charAt(0).toLowerCase() + name.substr(1)
}

exports.parseAttributeValue = function(name, value){
  var parser
  if(parser = app.attributeParsers[app.attributeTypes[name]]) return parser(value)
  else return value
}

exports.extractAttributesFromFileStats = function(file){
  return {title: file.base}
}

exports.parseAttributes = function(data){
  var parsed = {}
  if(!data) return parsed
  _(data).each(function(value, name){
    name = exports.normalizeAttributeName(name)
    // name  = app.translateAttributeName(name)
    parsed[name] = exports.parseAttributeValue(name, value)
  })
  return parsed
}

exports.translateAttributeName = function(attributeName){return attributeName}
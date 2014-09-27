// Attribute parsers.
var parsers = app.attributeParsers = {}

parsers.number = function(value){
  if(_(value).isNumber()) return value
  if(_(value).isBlank()) return 0
  value = _s.strip(value.toString())
  var int = parseInt(value)
  var float = parseFloat(value)
  return (int == float) ? int : float
}

parsers.string = function(value){
  return _s.strip((value || '').toString())
}

parsers.lowerCaseString = function(value){
  return app.attributeParsers.string(value).toLowerCase()
}

parsers.array = function(value){
  if(!value) return []
  if(_(value).isArray()) return value
  return value.toString().split(',').map(function(item){return _s.strip(item)})
  // .filter(function(item){return !!item})
}

parsers.sortedArray = function(value){
  return app.attributeParsers.array(value).sort()
}

parsers.hash = function(value){
  if(!value) return {}
  if(_(value).isObject()) return value
  else if(_(value).isString()){
    var array = app.attributeParsers.array(value)

    var hash = {}
    var key = null
    _(array).each(function(item){
      if(key){
        hash[key] = item
        key = null
      }else key = item
    })
    return hash
  }
  else throw new Error("invalid value for hash attribute " + value)
}
// There's no ordered hash in JavaScript, but ordinary hash in most implementations is
// ordered.
parsers.orderedHash = parsers.hash

parsers.date = function(value){
  var moment = require('moment')
  if(!value) return null
  if(_(value).isString()) value = _s.strip(value)
  return moment(value).valueOf()
}

parsers.boolean = function(value){
  if(_(value).isBoolean()) return value
  if(!value) return false
  return ['yes', 'true'].indexOf(_s.strip(value).toLowerCase()) >= 0
}

parsers.path = function(value, mountPath){
  if(!value) return null
  value = app.attributeParsers.lowerCaseString(value)
  return app.pathUtil.absolutePathIfNotAbsolute(mountPath, value)
}

parsers.arrayOfPaths = function(value, mountPath){
  value = parsers.array(value, mountPath)
  return _(value).map(function(v){return parsers.path(v, mountPath)})
}
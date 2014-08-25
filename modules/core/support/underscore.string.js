var _s = module.exports = require('underscore.string')

_s.unicodeAz = "\u0080-\u9999"

_s.escapeHashInUrl = function(url){return url.replace('#', '%23')}

_s.unescapeHashInUrl = function(url){return url.replace('%23', '#')}

_s.nounInflector = function(){
  return this._nounInflector = new (require('natural').NounInflector)()
}

_s.pluralize = function(str){return this.nounInflector().pluralize(str)}

_s.singularize = function(str){return this.nounInflector().singularize(str)}

_s.isPlural = function(str){return !_s.isSingular(str)}

_s.isSingular = function(str){return str === _s.singularize(str)}

_s.pluralizeCount = function(count, singular, plural) {
  return ("" + count + " ") + (count === 1 ? singular : plural || _s.pluralize(singular))
}
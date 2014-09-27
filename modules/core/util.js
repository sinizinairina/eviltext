app.getTheme = function(applicationName, themeName){
  var themes = app.themes[applicationName] || {}
  var Theme = themes[themeName]
  if(!Theme) throw new Error('no theme ' + themeName + ' for ' + applicationName)
  return Theme()
}

app.generate = function(srcPath, buildPath, ecb, cb){
  new app.Static(srcPath, buildPath, ecb, function(_static){
    _static.generate(ecb, cb)
  })
}

// Translation.
app.translations = {en: {}}
var defaultPluralize = function(count){return count === 1 ? 'One' : 'Many'}
app.t = function(language, module, key, options){
  options = options || {}
  var locale = app.translations[language] || {}
  var moduleLocale = locale[module] || {}
  if('count' in options) key = key + (locale.pluralize || defaultPluralize)(options.count)
  str = moduleLocale[key] || ('no ' + language + ' translation for ' + module + ' ' + key)
  _(options).each(function(v, k){
    str = str.replace(new RegExp('\#\{' + k + '\}', 'g'), v)
  })
  return str
}
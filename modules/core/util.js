app.getApplication = function(applicationName){
  var Application = app.applications[applicationName]
  if(!Application) throw new Error('no application ' + applicationName)
  return Application()
}

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
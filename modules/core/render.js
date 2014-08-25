// Render.
app.compiledTemplates = {}
app.render = function(path, data, ecb, cb){
  var _this = this
  var proceed = function(){cb(_this.compiledTemplates[path](data))}
  if(path in this.compiledTemplates) proceed()
  else{
    app.readFile(path, ecb, function(text){
      try{
        _this.compiledTemplates[path] = _this.compileTemplate(path, text)
      }catch(err){return ecb(err)}
      proceed()
    })
  }
}

app.renderTo = function(path, options, targetPath, ecb, cb){
  this.render(path, options, ecb, function(rendered){
    app.writeFile(targetPath, rendered, ecb, cb)
  })
}

// Compile template.
app.compileTemplate = function(path, text){
  var extension = (require('path').extname(path) || '').replace('.', '').toLowerCase()
  var engine = this.templateEngines[extension] || app.defaultTemplateEngine
  return engine(text)
}

// Template engines.
var ejs = function(text){
  var template = require('ejs').compile(text)
  return function(data){return template(data)}
}
var mustache = function(text){
  var template = require('hogan.js').compile(text)
  return function(data){return template.render(data)}
}
app.defaultTemplateEngine = ejs
app.templateEngines = {
  ejs      : ejs,
  ms       : mustache,
  mustache : mustache
}
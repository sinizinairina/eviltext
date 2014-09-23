app.debug('[core] configuring')

// Ignore files.
app.systemFiles = /^build$|^node_modules$/
app.ignoreFiles = /^[\.~]/

// Image files.
app.imageExtensions = ['png', 'jpg', 'jpeg', 'bmp', 'gif']

// Processors.
var yamlProcessor = function(){return require('../yaml-processor')}
var markdownProcessor = function(){return require('../markdown-processor')}
app.processors = {
  yaml : yamlProcessor,
  yml  : yamlProcessor,

  md       : markdownProcessor,
  markdown : markdownProcessor
}

// Image processor.
var imageProcessor = function(){return require('../image-processor')}
_(app.imageExtensions).each(function(extension){app.processors[extension] = imageProcessor})

// Config processors.
app.configProcessors = {
  yaml : yamlProcessor,
  yml  : yamlProcessor,

  md       : markdownProcessor,
  markdown : markdownProcessor
}

// Applications.
app.applications = {
  blog : function(){return require('../blog-application')},
  wiki : function(){return require('../wiki-application')},
  shop : function(){return require('../shop-application')}
}

// Themes.
app.themes = {
  blog: {
    svbtle: function(){return require('../blog-svbtle-theme')}
  },
  wiki: {
    clean : function(){return require('../wiki-clean-theme')},
    gray  : function(){return require('../wiki-gray-theme')}
  }
}

// Known attributes.
app.attributeTypes = {
  about          : 'string',
  amount         : 'number',
  application    : 'lowerCaseString',
  bottom         : 'string',
  comments       : 'boolean',
  charset        : 'string',
  date           : 'date',
  details        : 'string',
  draft          : 'boolean',
  googleId       : 'string',
  head           : 'string',
  home           : 'string',
  image          : 'path',
  images         : 'hash',
  language       : 'lowerCaseString',
  lazyImages     : 'boolean',
  link           : 'string',
  logo           : 'string',
  mountAsRoot    : 'boolean',
  navigation     : 'orderedHash',
  perPage        : 'number',
  sortBy         : 'string',
  tags           : 'sortedArray',
  theme          : 'lowerCaseString',
  title          : 'string',
  type           : 'lowerCaseString',
}

// Attribute translations.
app.attributeTranslation = {
  googleID: 'googleId'
}

// Miscellaneous.
app.configBaseName = 'config'
app.configTargetPath = function(basePath){return basePath + '.json'}

app.regenerateFiles        = (process.env.regenerateFiles == 'true') || false
app.regenerateApplications = (process.env.regenerateApplications == 'true') || false
app.regenerateAssets       = (process.env.regenerateAssets == 'true') || false
if(process.env.regenerate == 'true'){
  app.regenerateFiles        = true
  app.regenerateApplications = true
  app.regenerateAssets       = true
}

app.brand = 'eviltext'
app.brandPath = 'http://eviltext.com'
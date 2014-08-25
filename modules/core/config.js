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
  blog: function(){return require('../blog-application')}
}

// Themes.
app.themes = {
  blog: {
    svbtle: function(){return require('../blog-svbtle-theme')}
  }
}

// Known attributes.
app.attributeTypes = {
  about          : 'string',
  title          : 'string',
  tags           : 'sortedArray',
  date           : 'date',
  navigation     : 'orderedHash',
  sortBy         : 'string',
  details        : 'string',
  perPage        : 'number',
  useDirectories : 'boolean',
  // gallery        : 'boolean',
  price          : 'number',
  amount         : 'number',
  currency       : 'string',
  application    : 'lowerCaseString',
  theme          : 'lowerCaseString',
  images         : 'hash',
  language       : 'lowerCaseString',
  head           : 'lowerCaseString',
  bottom         : 'lowerCaseString',
  googleId       : 'lowerCaseString'
  // type           : 'lowerCaseString'
}

// Miscellaneous.
app.configBaseName = 'config'
app.configTargetPath = function(basePath){return basePath + '.json'}

app.regenerateFiles = process.env.regenerateFiles || false
app.regenerateApplications = process.env.regenerateApplications || false

app.brand = 'eviltext'
app.brandPath = 'http://eviltext.com'
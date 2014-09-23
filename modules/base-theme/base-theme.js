var fspath = require('path')

module.exports = function(klass, themeName, objectName, objectsName, themeDirectory){
  var proto = klass.prototype

  klass.configure = function(applicationConfig, userConfig){
    return _({}).extend(applicationConfig, klass.defaultConfig, userConfig)
  }

  proto.initialize = function(config, paths, navigation, tagCloud, buildPath, buildEntries
  , mountPath){
    this.config = config
    this.paths = paths
    this.navigation = navigation
    this.tagCloud = tagCloud
    this.buildPath = buildPath
    this.buildEntries = buildEntries
    this.mountPath = mountPath
  }

  proto.copyAsset = function(themeDirectory, themeName, relativePath, ecb, cb){
    var targetPath = this.paths.asset('/' + themeName + '/' + relativePath)
    if((targetPath in this.buildEntries) && !app.regenerateAssets) cb()
    else {
      app.debug('[' + themeName + '] copying asset ' + relativePath)
      app.copyFile(fspath.join(themeDirectory, 'assets', relativePath)
      , fspath.join(this.buildPath, targetPath), ecb, cb)
    }
  }

  proto.copyVendorAsset = function(themeDirectory, relativePath, ecb, cb){
    var targetPath = this.paths.asset('/vendor' + relativePath)
    if(targetPath in this.buildEntries) cb()
    else {
      app.debug('[' + themeName + '] copying asset ' + relativePath)
      app.copyFile(fspath.join(themeDirectory, 'assets', 'vendor', relativePath)
      , fspath.join(this.buildPath, targetPath), ecb, cb)
    }
  }

  proto.copyBaseAssets = function(ecb, cb){
    var _this = this
    _([
      '/lazyload-2.0.5.js',
      '/turbolinks-latest.js',
      '/fastclick-0.6.7.js',
      '/prettify/prettify.js',
      '/prettify/prettify.css'
    ]).asyncEach(function(path, i, ecb, next){
      _this.copyVendorAsset(__dirname, path, ecb, next)
    }, ecb, cb)
  }

  var _imgStub = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="
  var _formatDate = function(date, format){
    return date ? require('moment')(date).format(format) : ''
  }
  proto.addCommonAttributesAndHelpers = function(data, ecb, cb){
    var _this = this
    var helpers = {
      // imgStub            : _imgStub,
      formatDateForHuman : function(date){return _formatDate(date, 'MMMM DD, YYYY')},
      formatDateForWeb   : function(date){return _formatDate(date, 'YYYY-MM-DD')},
      mainImage          : function(object){
        return object.image || (object.images && object.images[0]) ||
        (object.htmlImages && object.htmlImages[0])
      },
      paths              : this.paths,
      config             : this.config,
      navigation         : this.navigation,
      tagCloud           : this.tagCloud,
      imageTag           : function(image, options){
        options = options || {}
        var format = options.format || 'default'
        var results = app.pathUtil.splitIntoBaseAndExtension(image)
        var basePath = results[0]
        var extension = results[1]

        // Image already can be formatted like `image.thumb.png`, extracting extension
        // for the second time.
        var results = app.pathUtil.splitIntoBaseAndExtension(basePath)
        var basePath = results[0]
        var currentFormat = results[1]

        var imagePath = basePath + '.' + format + '.' + extension
        var imageTitle = options.title || _s.humanize(app.pathUtil.getName(basePath))

        if(_this.config.lazyImages){
          return '<img src="' + _imgStub + '" data-src="' + imagePath + '" title="' +
          imageTitle + '" onload="lazyImage(this)"></img>'
        }else{
          return '<img src="' + imagePath + '" title="' + imageTitle + '"></img>'
        }
      },
      showComments       : false
    }

    data = _({}).extendIfBlank(data, helpers)
    var layout = data.layout
    delete data.layout

    var _this = this
    var readHeadAndBottomCommons = function(cb){
      app.render(fspath.join(__dirname, 'templates', 'head-commons.html')
      , data, ecb, function(headCommons){
        app.render(fspath.join(__dirname, 'templates', 'bottom-commons.html')
        , data, ecb, function(bottomCommons){
          cb(headCommons, bottomCommons)
        })
      })
    }

    var _this = this
    readHeadAndBottomCommons(function(headCommons, bottomCommons){
      data.headCommons = headCommons
      data.bottomCommons = bottomCommons
      data.layout = layout
      cb(data)
    })
  }

  var absoluteTemplatePath = function(template){
    return fspath.join(themeDirectory, 'templates', template)
  }

  proto.render = function(template, data, ecb, cb){
    app.debug('[' + themeName + '] rendering ' + template)
    this.addCommonAttributesAndHelpers(data, ecb, function(data){
      if(data.layout) data = _({}).extend(data, {layout: absoluteTemplatePath(data.layout)})
      app.render(absoluteTemplatePath(template), data, ecb, cb)
    })
  }

  proto.renderTo = function(template, data, path, ecb, cb){
    app.debug('[' + themeName + '] rendering ' + template + ' to ' + path)
    var _this = this
    this.addCommonAttributesAndHelpers(data, ecb, function(data){
      if(data.layout) data = _({}).extend(data, {layout: absoluteTemplatePath(data.layout)})
      app.renderTo(absoluteTemplatePath(template), data, fspath.join(_this.buildPath, path), ecb, cb)
    })
  }
}
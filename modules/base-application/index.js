var fspath = require('path')

module.exports = function(klass, appName, appDirectory){
  var proto = klass.prototype

  klass.availableSortingAttributes = ['title', 'date']

  // klass.entryTypes = ['text']

  klass.parseSpecialConfigAttributes = function(mountPath, userConfig){
    userConfig = _(userConfig).clone()

    // Navigation.
    if(userConfig.navigation){
      var navigation = {}
      _(userConfig.navigation).each(function(path, title){
        navigation[title] = app.pathUtil.absolutePathIfNotAbsolute(mountPath, path)
      })
      userConfig.navigation = navigation
    }

    // Home.
    if(userConfig.home) config.home = app.pathUtil.absolutePathIfNotAbsolute(mountPath, userConfig.home)

    // Logo.
    if(app.pathUtil.isImagePath(userConfig.logo)){
      config.logo = app.pathUtil.absolutePathIfNotAbsolute(mountPath, userConfig.logo)
      config.isLogoPath = true
    }

    // Sort by.
    if(_(userConfig.sortBy).isPresent()){
      var tokens = userConfig.sortBy.toLowerCase().split(/[\s,]+/)
      var attribute = tokens[0]
      var order = tokens[1]
      order = {asc: 'ascending', desc: 'descending'}[order] || order
      if(klass.availableSortingAttributes.indexOf(attribute) < 0)
        throw new Error("invalid sorting attribute " + attribute)
      if(['ascending', 'descending'].indexOf(order) < 0)
        throw new Error("invalid sorting order " + order)
      userConfig.sortBy = {
        attribute : attribute,
        order     : order
      }
    }

    return userConfig
  }

  klass.configure = function(mountPath, userConfig){
    userConfig = klass.parseSpecialConfigAttributes(mountPath, userConfig)

    // Merging application, theme and user configs.
    var themeName = userConfig.theme || klass.defaultConfig.theme
    var Theme = app.getTheme(appName, themeName)
    return Theme.configure(klass.defaultConfig, userConfig)
  }

  proto.initialize = function(mountPath, config, srcPath, srcBaseEntries, buildPath
  , buildEntries, ecb, cb){
    this.config = config
    this.mountPath = mountPath
    this.srcPath = srcPath
    this.srcBaseEntries = srcBaseEntries
    this.buildPath = buildPath
    this.buildEntries = buildEntries

    this.mountDirectory = this.srcBaseEntries[this.mountPath]
    this.cachePath = this.mountPath + '/eviltext.json'
    this.paths = this.buildPaths()
    cb(this)
  }

  proto.buildBasePaths = function(){
    var _this = this
    return {
      home: function(params){return app.path(_this.mountPath, params)},

      asset: function(path, params){return app.path('/assets' + path, params)},

      themeAsset: function(theme, path, params){
        return app.path('/assets/' + theme + path, params)
      },
    }
  }

  proto.renderTo = function(template, options, path, ecb, cb){
    app.debug('[' + appName + '] rendering ' + template + ' to ' + path)
    app.renderTo(fspath.join(appDirectory, 'templates', template), options
    , fspath.join(this.buildPath, path), ecb, cb)
  }

  proto.paginate = function(objects){
    var page = []
    var pages = [page]
    var _this = this
    _(objects).each(function(object){
      if(page.length == _this.config.perPage){
        page = []
        pages.push(page)
      }
      page.push(object)
    })
    return pages
  }

  proto.prepareTagCloud = function(){
    app.debug('[blog] preparing tag cloud for ' + this.mountPath)

    var tagCounts = {}
    _(this.posts).each(function(post){
      _(post.tags).each(function(tag){
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      })
    })

    var _this = this
    this.tagCloud = []
    _(tagCounts).each(function(count, tag){
      _this.tagCloud.push({
        name  : tag,
        count : count
      })
    })

    var attribute = this.config.tagsSortBy.attribute
    this.tagCloud = _(this.tagCloud).sortBy(function(tag){return tag[attribute]})
    if(this.config.tagsSortBy.order == 'descending') this.tagCloud.reverse()
  }

  proto.prepareNavigation = function(){
    var _this = this
    this.navigation = []
    _(this.config.navigation).each(function(path, title){
      _this.navigation.push({title: title, path: path})
    })
  }

  // Checking if post is a gallery and if so preparing it.
  proto.tryPrepareGallery = function(post){
    var images = []
    var _this = this
    var entry = this.srcBaseEntries[post.basePath]
    _(entry.children).each(function(childEntry){
      if(app.imageExtensions.indexOf(childEntry.extension) >= 0){
        var image = {}

        // Original image.
        image.original = {
          title : childEntry.baseName,
          path  : (childEntry.basePath + '.' + childEntry.extension)
        }

        // Resized images.
        _(_this.config.images || {}).each(function(format, formatAlias){
          image[formatAlias] = {
            title : childEntry.baseName,
            path  : (childEntry.basePath + '.' + formatAlias + '.' + childEntry.extension)
          }
        })

        images.push(image)
      }
    })

    if(images.length > 0){
      post.type = 'gallery'
      post.images = _(images).sortBy(function(image){return image.original.title})

      // Truncating.
      post.imagesPreview = [images[0]]
      post.imagesPreviewTruncated = images.length > 1
    }
  }

  proto.sortAndPaginateObjects = function(collection, collectionName){
    app.debug('[' + appName + '] sorting and paginating ' + collectionName + ' for ' +
    this.mountPath)

    // Sorting.
    var attribute = this.config.sortBy.attribute
    var sorted = _(collection).sortBy(function(object){return object[attribute]})
    if(this.config.sortBy.order == 'descending') sorted.reverse()
    return sorted
  }

  // Draft posts are published but hidden from listing.
  proto.publishedObjects = function(collection){
    return _(collection).filter(function(object){return object.draft != true})
  }

  proto.updateIfNeeded = function(ecb, proceed, skip){
    var cacheEntry = this.buildEntries[this.cachePath]
    if(
      !cacheEntry ||
      (cacheEntry.updatedAt < this.mountDirectory.updatedAt) ||
      (cacheEntry.updatedAt < this.config.updatedAt)
    ) proceed()
    else{
      if(app.regenerateApplications) proceed()
      else{
        app.debug('[' + appName + '] skipping ' + this.mountPath + " it's already built")
        skip()
      }
    }
  }

  proto.theme = function(){
    if(!this._theme){
      var Theme = app.getTheme(appName, this.config.theme)
      this._theme = new Theme(this.config, this.paths, this.navigation, this.tagCloud, this.buildPath
      , this.buildEntries)
    }
    return this._theme
  }

  proto.finalize = function(ecb, cb){
    app.writeJson(fspath.join(this.buildPath, this.cachePath), {}, ecb, cb)
  }

  // Posts can be located at level 1 or 2. Searching first in direct children and if
  // nothing found trying to find in grandchildren.
  proto.loadObjects = function(objectName, objectsName, ecb, cb){
    app.debug('[' + appName + '] searching for ' + objectsName + ' in ' + this.mountPath)
    var objects = []
    var _this = this

    var checkAndAddObject = function(directory, ecb, cb){
      _(directory.children).asyncEach(function(entry, name, ecb, next){
        var entryJsonPath = entry.basePath + '.json'
        if(
          (entry.entry == 'file') && (entry.baseName != app.configBaseName) &&
          (entryJsonPath in _this.buildEntries)
        ){
          app.debug('[' + appName + '] reading ' + objectName + ' ' + entryJsonPath)
          app.readJson(fspath.join(_this.buildPath, entryJsonPath), ecb, function(data){
            // data.path = app.pathUtil.join(_this.mountPath, entry.baseName)
            data.basePath = entry.basePath
            objects.push(data)
            next()
          })
        }else next()
      }, ecb, cb)
    }

    // Checking first level.
    checkAndAddObject(this.mountDirectory, ecb, function(){
      // Checking for the second level objects only if there was no objects on the first level.
      if(objects.length == 0){
        _(_this.mountDirectory.children).asyncEach(function(entry, path, ecb, next){
          entry.entry == 'directory' ? checkAndAddObject(entry, ecb, next) : next()
        }, ecb, function(){cb(objects)})
      }else cb(objects)
    })
  }


  // proto.generateRedirectFromRoot = function(ecb, cb){
  //   this.renderTo('redirect-page.html', {name: 'Posts', path: '/posts'}
  //   , fspath.join(this.mountPath, 'index.html'), ecb, cb)
  // }
}
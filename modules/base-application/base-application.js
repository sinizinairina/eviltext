var fspath = require('path')

module.exports = function(klass, appName, appDirectory){
  var proto = klass.prototype

  klass.availableSortingAttributes = ['title', 'date']

  // klass.entryTypes = ['text']

  klass.parseSpecialConfigAttributes = function(mountPath, userConfig){
    userConfig = _(userConfig).clone()

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

  klass.configure = function(userConfig, mountPath){
    userConfig = klass.parseSpecialConfigAttributes(mountPath, userConfig)

    // Merging application, theme and user configs.
    var themeName = userConfig.theme || klass.defaultConfig.theme
    var Theme = app.getTheme(appName, themeName)
    return Theme.configure(klass.defaultConfig, userConfig, mountPath)
  }

  klass.process = function(attributes, mountPath){return attributes}

  proto.initialize = function(mountPath, config, srcPath, srcBaseEntries, buildPath
  , buildEntries, ecb, cb){
    this.config = config
    this.mountPath = mountPath
    this.srcPath = srcPath
    this.srcBaseEntries = srcBaseEntries
    this.buildPath = buildPath
    this.buildEntries = buildEntries

    this.mountDirectory = this.srcBaseEntries[this.mountPath]
    this.cachePath = app.pathUtil.join(this.mountPath, '/eviltext-cache.json')
    this.paths = this.buildPaths()
    cb(this)
  }

  proto.buildBasePaths = function(){
    var _this = this
    return {
      // home: function(params){
      //   // Home path from config can override default home path.
      //   return app.path(_this.config.home || _this.mountPath, params)
      // },

      asset: function(path, params){return app.path('/assets' + path, params)},

      themeAsset: function(theme, path, params){
        return app.path('/assets/' + theme + path, params)
      },
    }
  }

  proto.pathWithTagsAndPage = function(path, params){
    var tag = null, page = null
    if(params && (params.page || params.tag || params.pagesCount)){
      params = _(params).clone()
      if(params.tag){
        tag = params.tag
        delete params.tag
      }
      if(params.page){
        page = params.page
        delete params.page
      }
      delete params.pagesCount
      path = path + (tag ? '-tag-' + tag : '') + (page ? (page == 1 ? '' : '-page-' + page) : '')
    }
    return app.path(path, params)
  }

  proto.renderTo = function(template, options, path, ecb, cb){
    var templateDir = fspath.join(appDirectory, 'templates')
    var templatePath = app.pathUtil.absolutePathIfNotAbsolute(templateDir, template)

    app.debug('[' + appName + '] rendering ' + template + ' to ' + path)
    app.renderTo(templatePath, options
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

  proto.prepareTagCloud = function(objects){
    app.debug('[' + appName + '] preparing tag cloud for ' + this.mountPath)

    var tagCounts = {}
    _(objects).each(function(post){
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

  // Checking if object is a gallery and if so preparing it.
  proto.tryPrepareGallery = function(object){
    var images = []
    var _this = this
    var entry = this.srcBaseEntries[object.basePath]
    _(entry.children).each(function(childEntry){
      if(app.imageExtensions.indexOf(childEntry.extension) >= 0){
        // var image = {}
        //
        // // Original image.
        // image.original = {
        //   title : childEntry.baseName,
        //   path  : (childEntry.lowerCasedPath)
        // }
        //
        // // Resized images.
        // _(_this.config.images || {}).each(function(format, formatAlias){
        //   image[formatAlias] = {
        //     title : childEntry.baseName,
        //     path  : (childEntry.basePath + '.' + formatAlias + '.' + childEntry.extension)
        //   }
        // })

        images.push(childEntry.lowerCasedPath)
      }
    })

    if((images.length > 0) || (object.type == 'gallery')){
      if(!object.type) object.type = 'gallery'
      object.images = images.sort() //  = _(images).sortBy(function(image){return image.original.title})

      // Truncating.
      object.imagesPreview = [images[0]]
      object.imagesPreviewTruncated = images.length > 1
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

  // Draft objects are published but hidden from listing.
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
      this._theme = new Theme(this.config, this.paths, this.tagCloud, this.buildPath
      , this.buildEntries, this.mountPath)
    }
    return this._theme
  }

  proto.finalize = function(ecb, cb){
    app.writeJson(fspath.join(this.buildPath, this.cachePath), {}, ecb, cb)
  }

  // Posts can be located at level 1 or 2. Searching first in direct children and if
  // nothing found trying to find in grandchildren.
  proto.loadObjects = function(objectName, objectsName, options, ecb, cb){
    var directory = this.srcBaseEntries[options.path || this.mountPath]
    app.debug('[' + appName + '] searching for ' + objectsName + ' in ' + directory)
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
    checkAndAddObject(directory, ecb, function(){
      // Checking for the second level objects only if there was no objects on the first level.
      if(objects.length == 0){
        _(directory.children).asyncEach(function(entry, path, ecb, next){
          entry.entry == 'directory' ? checkAndAddObject(entry, ecb, next) : next()
        }, ecb, function(){cb(objects)})
      }else cb(objects)
    })
  }

  proto.generateRedirects = function(homePath, ecb, cb){
    var _this = this
    this.generateRedirectToHomePage(homePath, ecb, function(){
      _this.generateMountAsRootPage(homePath, ecb, cb)
    })
  }

  proto.generateRedirectToHomePage = function(homePath, ecb, cb){
    var indexBasePath = app.pathUtil.join(this.mountPath, '/index')
    var indexPath = indexBasePath + '.html'

    // If there's `index.html` file created by user don't owerwritting it.
    if(indexBasePath in this.srcBaseEntries) return cb()

    if(this.config.home){
      // Generating index with redirect to home path.
      app.debug('[' + appName + '] generating home page as redirect to ' + this.config.home)
      this.renderTo(__dirname + '/templates/redirect-page.html'
      , {name: 'Home', path: this.config.home}, indexPath, ecb, cb)
    }else{
      // Copying home page to index.
      app.debug('[' + appName + '] generating home page')
      app.copyFile(app.pathUtil.join(this.buildPath, homePath + '.html')
      , app.pathUtil.join(this.buildPath, indexPath), ecb, cb)
    }
  }

  proto.generateMountAsRootPage = function(homePath, ecb, cb){
    if(!this.config.mountAsRoot) return cb()

    // If there's `index.html` file created by user don't owerwritting it.
    if('/index' in this.srcBaseEntries)
      throw new Error("can't mount as root because there's already /index exists!")

    // Copying home page to index.
    app.debug('[' + appName + '] mounting as root')
    app.copyFile(app.pathUtil.join(this.buildPath, homePath + '.html')
    , app.pathUtil.join(this.buildPath, '/index.html'), ecb, cb)
  }
}
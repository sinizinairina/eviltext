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

}
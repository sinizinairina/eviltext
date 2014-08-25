var fspath = require('path')

var Blog = module.exports = function(mountPath, config, srcPath, srcBaseEntries, buildPath
, buildEntries, ecb, cb){
  this.config = config
  this.mountPath = mountPath
  this.srcPath = srcPath
  this.srcBaseEntries = srcBaseEntries
  this.buildPath = buildPath
  this.buildEntries = buildEntries

  this.mountDirectory = srcBaseEntries[mountPath]
  this.cachePath = this.mountPath + '/eviltext.json'
  this.paths = this._paths()
  cb(this)
}
require('../base-application')(Blog, 'blog', __dirname)
var proto = Blog.prototype

Blog.defaultConfig = {
  theme      : 'svbtle',
  sortBy     : {attribute : 'date', order: 'descending'},
  tagsSortBy : {attribute : 'count', order: 'descending'}
}

Blog.configure = function(mountPath, userConfig){
  userConfig = Blog.parseSpecialConfigAttributes(mountPath, userConfig)

  // Merging application, theme and user configs.
  var themeName = userConfig.theme || Blog.defaultConfig.theme
  var Theme = app.getTheme('blog', themeName)
  return Theme.configure(Blog.defaultConfig, userConfig)
}

proto._paths = function(){
  if(!this.cachedPaths){
    var _this = this
    this.cachedPaths = {
      home: function(params){return app.path(_this.mountPath, params)},

      post: function(post, params){
        // return app.path(post.path, params)
        return app.path(app.pathUtil.relativePath(_this.mountPath, post.basePath), params)
      },

      postJson: function(post, params){return app.path(post.path + '.post', params)},

      asset: function(path, params){return app.path('/assets' + path, params)},

      themeAsset: function(theme, path, params){
        return app.path('/assets/' + theme + path, params)
      },

      posts: function(params){
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
        }
        var path = _this.mountPath + (tag ? '-tag-' + tag : '')
        + (page ? (page == 1 ? '' : '-page-' + page) : '')
        return app.path(path, params)
      },

      nextPosts: function(params){
        params = params || {}
        if(!params.page) throw new Error("page parameter required!")
        if(!params.pagesCount) throw new Error("pagesCount parameter required!")
        return params.page < params.pagesCount ?
        this.posts(_({}).extend(params, {page: params.page + 1})) : null
      },
      previousPosts: function(params){
        params = params || {}
        if(!params.page) throw new Error("page parameter required!")
        if(!params.pagesCount) throw new Error("pagesCount parameter required!")
        return params.page > 1 ? this.posts(_({}).extend(params, {page: params.page - 1})) : null
      }
    }
  }
  return this.cachedPaths
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
      app.debug('[blog] skipping ' + this.mountPath + " it's already built")
      skip()
    }
  }
}

proto.prepare = function(ecb, cb){
  app.debug('[blog] preparing ' + this.mountPath)
  var _this = this
  this.loadPosts(ecb, function(){
    _this.preparePosts(ecb, function(){
      _this.sortAndPaginatePosts()
      _this.prepareTagCloud()
      _this.prepareNavigation()
      cb(_this)
    })
  })
}

proto.generate = function(ecb, cb){
  app.debug('[blog] generating ' + this.mountPath)
  var _this = this
  this.updateIfNeeded(ecb, function(){
    _this.prepare(ecb, function(){
      _this.generatePostCollection(ecb, function(){
        _this.generatePostCollectionsByTag(ecb, function(){
          app.debug('[blog] generating posts for ' + _this.mountPath)
          _(_this.posts).asyncEach(function(post, i, ecb, next){
            _this.generatePost(post, ecb, next)
          }, ecb, function(){
            _this.theme().generate(ecb, function(){
              _this.finalize(ecb, cb)
            })
          })
        })
      })
    })
  }, cb)
}

proto.theme = function(){
  if(!this._theme){
    var Theme = app.getTheme('blog', this.config.theme)
    this._theme = new Theme(this.config, this.paths, this.navigation, this.tagCloud, this.buildPath
    , this.buildEntries)
  }
  return this._theme
}

proto.finalize = function(ecb, cb){
  app.writeJson(fspath.join(this.buildPath, this.cachePath), {}, ecb, cb)
}

// proto.generateRedirectFromRoot = function(ecb, cb){
//   this.renderTo('redirect-page.html', {name: 'Posts', path: '/posts'}
//   , fspath.join(this.mountPath, 'index.html'), ecb, cb)
// }

proto.generatePostCollection = function(ecb, cb){
  app.debug('[blog] generating post collection for ' + this.mountPath)

  // Generating JSON.
  var _this = this
  var json = {
    tagCloud    : this.tagCloud,
    navigation  : this.navigation,
    config      : this.config,
    posts       : _(this.posts).map(function(post){
      return {
        title : post.title,
        path  : _this.paths.post(post),
        type  : post.type,
        date  : post.date,
        tags  : post.tags
      }
    })
  }

  app.writeJson(fspath.join(this.buildPath, this.paths.home({format: 'json'})), json, ecb, function(){

    // Generating HTML.
    var pages = _this.paginate(_this.posts)

    _(pages).asyncEach(function(page, i, ecb, next){
      _this.theme().generatePostCollection(null, i + 1, pages.length, page, ecb, next)
    }, ecb, cb)
  })
}

proto.generatePostCollectionsByTag = function(ecb, cb){
  app.debug('[blog] generating post collections by tags for ' + this.mountPath + ' in json')

  var tagCloud = this.tagCloud.slice(0, this.config.tagCount)
  var _this = this
  _(tagCloud).asyncEach(function(item, i, ecb, next){
    var postsByTag = _(_this.posts).filter(function(post){return post.tags.indexOf(item.name) >= 0})
    var pages = _this.paginate(postsByTag)
    _(pages).asyncEach(function(page, i, ecb, next){
      _this.theme().generatePostCollection(item.name, i + 1, pages.length, page, ecb, next)
    }, ecb, next)
  }, ecb, cb)
}

proto.generatePost = function(post, ecb, cb){
  app.debug('[blog] generating post ' + post.path)

  // Generating JSON.
  var _this = this
  app.writeJson(fspath.join(this.buildPath, _this.paths.postJson(post, {format: 'json'}))
  , post, ecb, function(){

    // Generating HTML.
    _this.theme().generatePost(post, ecb, cb)
  })
}

proto.preparePosts = function(ecb, cb){
  // Preparing posts.
  app.debug('[blog] preparing posts for ' + this.mountPath)
  var _this = this
  var preparedPosts = []
  _(this.posts).asyncEach(function(post, i, ecb, next){
    _this.preparePost(post, ecb, function(skip, post){
      if(!skip) preparedPosts.push(post)
      next()
    })
  }, ecb, function(){
    _this.posts = preparedPosts
    cb()
  })
}

proto.preparePost = function(post, ecb, cb){
  app.debug('[blog] preparing post ' + post.path)

  _(post).extendIfBlank({
    tags : [],
    date : null
  })

  if(_(post.html).isPresent()){
    post.type = 'text'
  }else{
    this.tryPrepareGallery(post)
  }
  cb(_(post.type).isBlank(), post)
}

proto.sortAndPaginatePosts = function(){
  app.debug('[blog] sorting and paginating posts for ' + this.mountPath)

  // Sorting.
  var attribute = this.config.sortBy.attribute
  this.posts = _(this.posts).sortBy(function(post){return post[attribute]})
  if(this.config.sortBy.order == 'descending') this.posts.reverse()
}

// Posts can be located at level 1 or 2. Searching first in direct children and if
// nothing found trying to find in grandchildren.
proto.loadPosts = function(ecb, cb){
  app.debug('[blog] searching for posts in ' + this.mountPath)
  this.posts = []
  var _this = this

  var checkAndAddPosts = function(directory, ecb, cb){
    _(directory.children).asyncEach(function(entry, name, ecb, next){
      var entryJsonPath = entry.basePath + '.json'
      if(
        (entry.entry == 'file') && (entry.baseName != app.configBaseName) &&
        (entryJsonPath in _this.buildEntries)
      ){
        app.debug('[blog] reading post ' + entryJsonPath)
        app.readJson(fspath.join(_this.buildPath, entryJsonPath), ecb, function(data){
          // data.path = app.pathUtil.join(_this.mountPath, entry.baseName)
          data.basePath = entry.basePath
          _this.posts.push(data)
          next()
        })
      }else next()
    }, ecb, cb)
  }

  // Checking first level.
  checkAndAddPosts(this.mountDirectory, ecb, function(){
    // Checking for the second level posts only if there was no posts on the first level.
    if(_this.posts.length == 0){
      _(_this.mountDirectory.children).asyncEach(function(entry, path, ecb, next){
        entry.entry == 'directory' ? checkAndAddPosts(entry, ecb, next) : next()
      }, ecb, cb)
    }else cb()
  })
}
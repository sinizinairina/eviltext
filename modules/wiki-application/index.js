var fspath = require('path')

var Wiki = module.exports = function(){this.initialize.apply(this, arguments)}
require('../base-application')(Wiki, 'wiki', __dirname)
var proto = Wiki.prototype

Wiki.defaultConfig = {
  language   : 'en',
  theme      : 'clean',
  sortBy     : {attribute : 'title', order: 'descending'},
  tagsSortBy : {attribute : 'count', order: 'descending'}
}

proto.buildPaths = function(){
  var _this = this
  return _({}).extend(this.buildBasePaths(), {
    page: function(page, params){return app.path(page.basePath, params)},

    pages: function(params){
      return _this.pathWithTagsAndPage(app.pathUtil.join(_this.mountPath, '/pages'), params)
    },

    home: function(params){
      // Home path from config can override default home path.
      return _this.config.home ? app.path(_this.config.home, params) : this.pages(params)
    },

    nextPages: function(params){
      params = params || {}
      if(!params.page) throw new Error("page parameter required!")
      if(!params.pagesCount) throw new Error("pagesCount parameter required!")
      return params.page < params.pagesCount ?
      this.pages(_({}).extend(params, {page: params.page + 1})) : null
    },

    previousPages: function(params){
      params = params || {}
      if(!params.page) throw new Error("page parameter required!")
      if(!params.pagesCount) throw new Error("pagesCount parameter required!")
      return params.page > 1 ? this.pages(_({}).extend(params, {page: params.page - 1})) : null
    }
  })
}

proto.prepare = function(ecb, cb){
  app.debug('[wiki] preparing ' + this.mountPath)
  var _this = this
  this.loadObjects('page', 'pages', ecb, function(objects){
    _this.pages = objects
    _this.preparePages(ecb, function(){
      _this.pages = _this.sortAndPaginateObjects(_this.pages, 'pages')
      _this.publishedPages = _this.publishedObjects(_this.pages)
      _this.prepareTagCloud(_this.pages)
      _this.prepareNavigation()
      cb(_this)
    })
  })
}

proto.generate = function(ecb, cb){
  app.debug('[wiki] generating ' + this.mountPath)
  var _this = this
  this.updateIfNeeded(ecb, function(){
    _this.prepare(ecb, function(){
      _this.generateRedirectToHomePage(_this.paths.pages(), ecb, function(){
        _this.generatePageCollection(ecb, function(){
          _this.generatePageCollectionsByTag(ecb, function(){
            app.debug('[wiki] generating pages for ' + _this.mountPath)
            _(_this.pages).asyncEach(function(page, i, ecb, next){
              _this.generatePage(page, ecb, next)
            }, ecb, function(){
              _this.theme().generate(ecb, function(){
                _this.finalize(ecb, cb)
              })
            })
          })
        })
      })
    })
  }, cb)
}

proto.generatePageCollection = function(ecb, cb){
  app.debug('[wiki] generating page collection for ' + this.mountPath)
  var pages = this.paginate(this.publishedPages)
  var _this = this
  _(pages).asyncEach(function(page, i, ecb, next){
    _this.theme().generatePageCollection(null, i + 1, pages.length, page, ecb, next)
  }, ecb, cb)
}

proto.generatePageCollectionsByTag = function(ecb, cb){
  app.debug('[wiki] generating page collections by tags for ' + this.mountPath)
  var tagCloud = this.tagCloud.slice(0, this.config.tagCount)
  var _this = this
  _(tagCloud).asyncEach(function(item, i, ecb, next){
    var pagesByTag = _(_this.publishedPages).filter(function(page){
      return page.tags.indexOf(item.name) >= 0
    })
    var pages = _this.paginate(pagesByTag)
    _(pages).asyncEach(function(page, i, ecb, next){
      _this.theme().generatePageCollection(item.name, i + 1, pages.length, page, ecb, next)
    }, ecb, next)
  }, ecb, cb)
}

proto.generatePage = function(page, ecb, cb){
  app.debug('[wiki] generating page ' + page.path)
  this.theme().generatePage(page, ecb, cb)
}

proto.preparePages = function(ecb, cb){
  // Preparing pages.
  app.debug('[wiki] preparing pages for ' + this.mountPath)
  var _this = this
  var preparedPages = []
  _(this.pages).asyncEach(function(page, i, ecb, next){
    _this.preparePage(page, ecb, function(skip, page){
      if(!skip) preparedPages.push(page)
      next()
    })
  }, ecb, function(){
    _this.pages = preparedPages
    cb()
  })
}

proto.preparePage = function(page, ecb, cb){
  app.debug('[wiki] preparing page ' + page.path)

  _(page).extendIfBlank({
    tags : [],
    date : null
  })

  if(_(page.html).isPresent()) page.type = 'text'
  else this.tryPrepareGallery(page)
  cb(_(page.type).isBlank(), page)
}
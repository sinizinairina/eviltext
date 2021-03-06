var Shop = module.exports = function(){this.initialize.apply(this, arguments)}
require('./base-application')(Shop, 'shop', __dirname)
var proto = Shop.prototype

Shop.defaultConfig = {
  language   : 'en',
  theme      : 'air',
  sortBy     : {attribute : 'date', order: 'descending'},
  tagsSortBy : {attribute : 'count', order: 'descending'},
  comments   : false
}

// Adding config attributes special to shop.
Shop.parseSpecialConfigAttributesWithoutShop = Shop.parseSpecialConfigAttributes
Shop.parseSpecialConfigAttributes = function(mountPath, userConfig){
  userConfig = this.parseSpecialConfigAttributesWithoutShop(mountPath, userConfig)
  userConfig = _(userConfig).clone()

  if(userConfig.currency)
    userConfig.isCurrencyBeforePrice = ['$', '£'].indexOf(userConfig.currency) >= 0
  return userConfig
}

// Processing file attributes special to shop.
Shop.process = function(attributes, mountPath){
  attributes = _(attributes).clone()
  if(attributes.price) attributes.price = app.attributeParsers.number(attributes.price, mountPath)
  return attributes
}

proto.buildPaths = function(){
  var _this = this
  return _({}).extend(this.buildBasePaths(), {
    product: function(product, params){return app.path(product.basePath, params)},

    products: function(params){
      return _this.pathWithTagsAndPage(app.pathUtil.join(_this.mountPath, '/products'), params)
    },

    page: function(page, params){return app.path(page.basePath, params)},

    home: function(params){
      // Home path from config can override default home path.
      return _this.config.home ? app.path(_this.config.home, params) : this.products(params)
    },

    nextProducts: function(params){
      params = params || {}
      if(!params.page) throw new Error("page parameter required!")
      if(!params.pagesCount) throw new Error("pagesCount parameter required!")
      return params.page < params.pagesCount ?
      this.products(_({}).extend(params, {page: params.page + 1})) : null
    },

    previousProducts: function(params){
      params = params || {}
      if(!params.page) throw new Error("page parameter required!")
      if(!params.pagesCount) throw new Error("pagesCount parameter required!")
      return params.page > 1 ? this.products(_({}).extend(params, {page: params.page - 1})) : null
    }
  })
}

proto.prepare = function(ecb, cb){
  app.debug('[shop] preparing ' + this.mountPath)
  var _this = this
  var loadAndPrepareProducts = function(ecb, cb){
    var productsPath = app.pathUtil.join(_this.mountPath, '/products')
    _this.loadObjects('product', 'products', {path: productsPath}, ecb
    , function(objects){
      _this.products = objects
      _this.prepareProducts(ecb, function(){
        _this.products = _this.sortAndPaginateObjects(_this.products, 'products')
        _this.publishedProducts = _this.publishedObjects(_this.products)
        cb()
      })
    })
  }
  var loadAndPreparePages = function(ecb, cb){
    var pagesPath = app.pathUtil.join(_this.mountPath, '/pages')
    _this.loadObjects('page', 'pages', {path: pagesPath}, ecb
    , function(objects){
      _this.pages = objects
      _this.preparePages(ecb, function(){
        _this.pages = _this.sortAndPaginateObjects(_this.pages, 'pages')
        _this.publishedPages = _this.publishedObjects(_this.pages)
        cb()
      })
    })
  }
  loadAndPrepareProducts(ecb, function(){
    loadAndPreparePages(ecb, function(){
      _this.prepareTagCloud(_this.products)
      cb()
    })
  })
}

proto.generate = function(ecb, cb){
  app.debug('[shop] generating ' + this.mountPath)
  var _this = this
  this.updateIfNeeded(ecb, function(){
    _this.prepare(ecb, function(){
      _this.generateProductCollection(ecb, function(){
        _this.generateProductCollectionsByTag(ecb, function(){
          app.debug('[shop] generating products for ' + _this.mountPath)
          _(_this.products).asyncEach(function(product, i, ecb, next){
            _this.generateProduct(product, ecb, next)
          }, ecb, function(){
            _(_this.pages).asyncEach(function(page, i, ecb, next){
              _this.generatePage(page, ecb, next)
            }, ecb, function(){
              _this.theme().generate(ecb, function(){
                // Redirects should be generated after the teme because it
                // may use files generated by theme .
                _this.generateRedirects(_this.paths.products(), ecb, function(){
                  _this.finalize(ecb, cb)
                })
              })
            })
          })
        })
      })
    })
  }, cb)
}

proto.generateProductCollection = function(ecb, cb){
  app.debug('[shop] generating shop collection for ' + this.mountPath)
  var pages = this.paginate(this.publishedProducts)
  var _this = this
  _(pages).asyncEach(function(page, i, ecb, next){
    _this.theme().generateProductCollection(null, i + 1, pages.length, page, ecb, next)
  }, ecb, cb)
  // // Generating JSON.
  // var json = {
  //   tagCloud    : this.tagCloud,
  //   navigation  : this.navigation,
  //   config      : this.config,
  //   products    : _(this.products).map(function(product){
  //     return {
  //       title : product.title,
  //       path  : _this.paths.product(product),
  //       type  : product.type,
  //       date  : product.date,
  //       tags  : product.tags
  //     }
  //   })
  // }
  //
  // app.writeJson(app.pathUtil.join(this.buildPath, this.paths.home({format: 'json'})), json, ecb, function(){
  //
  // })
}

proto.generateProductCollectionsByTag = function(ecb, cb){
  app.debug('[shop] generating product collections by tags for ' + this.mountPath)
  var tagCloud = this.tagCloud.slice(0, this.config.tagCount)
  var _this = this
  _(tagCloud).asyncEach(function(item, i, ecb, next){
    var productsByTag = _(_this.publishedProducts).filter(function(product){
      return product.tags.indexOf(item.name) >= 0
    })
    var pages = _this.paginate(productsByTag)
    _(pages).asyncEach(function(page, i, ecb, next){
      _this.theme().generateProductCollection(item.name, i + 1, pages.length, page, ecb, next)
    }, ecb, next)
  }, ecb, cb)
}

proto.generateProduct = function(product, ecb, cb){
  app.debug('[shop] generating product ' + product.basePath)
  this.theme().generateProduct(product, ecb, cb)
}

proto.generatePage = function(page, ecb, cb){
  app.debug('[shop] generating page ' + page.basePath)
  this.theme().generateShopPage(page, ecb, cb)
}

proto.prepareProducts = function(ecb, cb){
  // Preparing products.
  app.debug('[shop] preparing products for ' + this.mountPath)
  var _this = this
  var preparedProducts = []
  _(this.products).asyncEach(function(product, i, ecb, next){
    _this.prepareProduct(product, ecb, function(product){
      preparedProducts.push(product)
      next()
    })
  }, ecb, function(){
    _this.products = preparedProducts
    cb()
  })
}

proto.prepareProduct = function(product, ecb, cb){
  app.debug('[shop] preparing product ' + product.basePath)

  _(product).extendIfBlank({
    tags : [],
    date : null
  })
  product.type = 'product'

  // Preparing images.
  var images = []
  var _this = this
  var entry = this.srcBaseEntries[product.basePath]
  _(entry.children).each(function(childEntry){
    if(app.imageExtensions.indexOf(childEntry.extension) >= 0){
      images.push(childEntry.lowerCasedPath)
    }
  })
  product.images = images.sort()
  product.imagesPreview = (images.length > 0) ? [images[0]] : []
  product.imagesPreviewTruncated = images.length > 1

  cb(product)
}

proto.preparePages = function(ecb, cb){
  // Preparing pages.
  app.debug('[shop] preparing pages for ' + this.mountPath)
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
  app.debug('[shop] preparing page ' + page.basePath)

  _(page).extendIfBlank({
    tags : [],
    date : null
  })

  if((page.type == 'gallery') || _(page.html).isBlank()) this.tryPrepareGallery(page)
  if(!page.type && _(page.html).isPresent()) page.type = 'text'

  cb(!page.type, page)
}
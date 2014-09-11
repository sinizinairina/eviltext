var fspath = require('path')
var Air = module.exports = function(){this.initialize.apply(this, arguments)}
var proto = Air.prototype
var themeName = 'shop-air-theme'
require('../base-theme')(Air, themeName, 'product', 'products', __dirname)

Air.defaultConfig = {
  charset       : 'utf-8',
  perPage       : 25,
  previewLength : 1200,
  tagCount      : 12,
  imageFormats  : {
    thumb   : '229x229',
    default : '528x528'
  }
}

// Adding theme-specific configuration options.
Air.configure = function(applicationConfig, userConfig, mountPath){
  userConfig = _(userConfig).clone()
  userConfig.slides = app.attributeParsers.arrayOfPaths(userConfig.slides, mountPath)
  return _({}).extend(applicationConfig, Air.defaultConfig, userConfig)
}

proto.generate = function(ecb, cb){
  var _this = this
  _([
    '/jquery-2.1.1.js',
    '/owl-carousel-1.27.0/owl-carousel.css',
    '/owl-carousel-1.27.0/owl-theme.css',
    '/owl-carousel-1.27.0/owl-carousel.js',
    '/spin-1.3.0.min.js'
  ]).asyncEach(function(assetPath, i, ecb, next){
    _this.copyVendorAsset(__dirname, assetPath, ecb, next)
  }, ecb, function(){
    _([
      '/style.css',
      '/script.js',
      '/icons/cart.png'
    ]).asyncEach(function(assetPath, i, ecb, next){
      _this.copyAsset(__dirname, themeName, assetPath, ecb, next)
    }, ecb, cb)
  })
}

proto.generateProduct = function(product, ecb, cb){
  var target = this.paths.product(product, {format: 'html'})
  app.debug('[shop-air-theme] generating product ' + target)
  this.renderTo('/product.html', {
    title        : product.title,
    currentPath  : this.paths.product(product),
    product      : product,
    themeName    : themeName,
    layout       : '/layout.html',
    showComments : (('comments' in product) ? product.comments : this.config.comments),
    previousPath : null,
    nextPath     : null
  }, target, ecb, cb)
}

proto.generateProductCollection = function(tag, page, pagesCount, products, ecb, cb){
  var target = this.paths.products({tag: tag, page: page, format: 'html'})
  app.debug('[shop-air-theme] generating product collection, page ' + page + ' to ' + target)
  this.renderTo('/products.html', {
    title        : this.config.title,
    date         : _(products).max(function(product){return product.date}).date,
    products     : products,
    nextPath     : this.paths.nextProducts({tag: tag, page: page, pagesCount: pagesCount}),
    previousPath : this.paths.previousProducts({tag: tag, page: page, pagesCount: pagesCount}),
    currentPath  : this.paths.products({tag: tag, page: page}),
    themeName    : themeName,
    layout       : '/layout.html',
  }, target, ecb, cb)
}

proto.generateShopPage = function(page, ecb, cb){
  var target = this.paths.page(page, {format: 'html'})
  app.debug('[shop-air-theme] generating page ' + target)
  this.renderTo('/shopPage.html', {
    title        : page.title,
    currentPath  : this.paths.page(page),
    page         : page,
    themeName    : themeName,
    layout       : '/layout.html',
    showComments : (('comments' in page) ? page.comments : this.config.comments),
    previousPath : null,
    nextPath     : null
  }, target, ecb, cb)
}

// Translation.
var en = app.translations.en[themeName] = {}
en.productCountOne = '#{count} product'
en.productCountMany = '#{count} products'
en.buy = 'Buy'
en.readMore = 'Read more'
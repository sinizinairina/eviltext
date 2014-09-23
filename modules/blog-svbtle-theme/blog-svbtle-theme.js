var fspath = require('path')
var Svbtle = module.exports = function(){
  this.initialize.apply(this, arguments)

  // Special theme attributes - path to hero unit and listing type.
  this.heroPath = app.attributeParsers.path(this.config.hero, this.mountPath)
  this.listing  = app.attributeParsers.lowerCaseString(this.config.listing)
}
var proto = Svbtle.prototype
var themeName = 'blog-svbtle-theme'
require('../base-theme')(Svbtle, themeName, 'post', 'posts', __dirname)

Svbtle.defaultConfig = {
  charset       : 'utf-8',
  perPage       : 25,
  previewLength : 1200,
  tagCount      : 7,
  images        : {
    default : '657'
  }
}

// Overriding default configure because we need to add `thumb` image format only in
// case special listing type used.
Svbtle.configure = function(applicationConfig, userConfig){
  var config = _(Svbtle.defaultConfig).deepClone()
  if(userConfig.listing) config.images.thumb = '303x303'
  return _({}).extend(applicationConfig, config, userConfig)
}

proto.generate = function(ecb, cb){
  var _this = this
  this.copyBaseAssets(ecb, function(){
    _this.copyAsset(__dirname, themeName, '/style.css', ecb, cb)
  })
}

proto.generatePost = function(post, ecb, cb){
  var _this = this
  var target = this.paths.post(post, {format: 'html'})
  app.debug('[blog-svbtle-theme] generating post ' + target)
  _this.renderTo('/post.html', {
    title        : post.title,
    currentPath  : this.paths.post(post),
    post         : post,
    themeName    : themeName,
    layout       : '/layout.html',
    showComments : (('comments' in post) ? post.comments : _this.config.comments)
  }, target, ecb, cb)
}

proto.generatePostCollection = function(tag, page, pagesCount, posts, ecb, cb){
  var _this = this
  this.readHero(ecb, function(hero){
    var target = _this.paths.posts({tag: tag, page: page, format: 'html'})
    app.debug('[blog-svbtle-theme] generating post collection, page ' + page + ' to ' + target)
    _this.renderTo('/posts.html', {
      title        : _this.config.title,
      date         : _(posts).max(function(post){return post.date}).date,
      posts        : posts,
      nextPath     : _this.paths.nextPosts({tag: tag, page: page, pagesCount: pagesCount}),
      previousPath : _this.paths.previousPosts({tag: tag, page: page, pagesCount: pagesCount}),
      currentPath  : _this.paths.posts({tag: tag, page: page}),
      themeName    : themeName,
      layout       : '/layout.html',
      hero         : hero,
      listing      : _this.listing
    }, target, ecb, cb)
  })
}

// Reading hero unit, can be a markdown file with title and text, it will be put on the top
// of the blog.
proto.readHero = function(ecb, cb){
  if(!this.heroPath) return cb(null)
  if('heroCache' in this) return cb(this.heroCache)
  var _this = this
  app.readJson(fspath.join(this.buildPath, this.heroPath + '.json')
  , function(){ecb(new Error("invalid path for hero unit " + _this.heroPath))}
  , function(data){
    data.basePath = _this.heroPath
    _this.heroCache = data
    _this.readHero(ecb, cb)
  })
}
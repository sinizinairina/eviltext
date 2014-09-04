var fspath = require('path')
var Svbtle = module.exports = function(){this.initialize.apply(this, arguments)}
var proto = Svbtle.prototype
var themeName = 'blog-svbtle-theme'
require('../base-theme')(Svbtle, themeName, 'post', 'posts', __dirname)

Svbtle.defaultConfig = {
  charset       : 'utf-8',
  perPage       : 25,
  previewLength : 1200,
  tagCount      : 7,
  images        : {
    default: '657'
  }
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
    title       : post.title,
    currentPath : this.paths.post(post),
    post        : post,
    themeName   : themeName,
    layout      : '/layout.html'
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
      hero         : hero
    }, target, ecb, cb)
  })
}

// Reading hero unit, can be a markdown file with title and text, it will be put on the top
// of the blog.
proto.readHero = function(ecb, cb){
  if('heroCache' in this) return cb(this.heroCache)
  var heroPath = this.config.hero
  if(!heroPath) return cb(null)
  var heroPath = app.pathUtil.absolutePathIfNotAbsolute(this.mountPath, heroPath)
  var _this = this
  app.readJson(fspath.join(this.buildPath, heroPath + '.json'), ecb, function(data){
    data.basePath = heroPath
    _this.heroCache = data
    _this.readHero(ecb, cb)
  })
}
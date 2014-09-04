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
  var target = this.paths.posts({tag: tag, page: page, format: 'html'})
  app.debug('[blog-svbtle-theme] generating post collection, page ' + page + ' to ' + target)
  this.renderTo('/posts.html', {
    title        : this.config.title,
    date         : _(posts).max(function(post){return post.date}).date,
    posts        : posts,
    nextPath     : this.paths.nextPosts({tag: tag, page: page, pagesCount: pagesCount}),
    previousPath : this.paths.previousPosts({tag: tag, page: page, pagesCount: pagesCount}),
    currentPath  : this.paths.posts({tag: tag, page: page}),
    themeName    : themeName,
    layout       : '/layout.html'
  }, target, ecb, cb)
}
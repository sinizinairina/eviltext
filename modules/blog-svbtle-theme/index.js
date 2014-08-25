var Svbtle = function(config, paths, navigation, tagCloud, buildPath, buildEntries){
  this.config = config
  this.paths = paths
  this.navigation = navigation
  this.tagCloud = tagCloud
  this.buildPath = buildPath
  this.buildEntries = buildEntries
}
var proto = Svbtle.prototype
var themeName = 'blog-svbtle-theme'
require('../base-theme')(Svbtle, themeName, 'post', 'posts', __dirname)

module.exports = Svbtle

Svbtle.defaultConfig = {
  perPage       : 25,
  previewLength : 1200,
  tagCount      : 7,
  images        : {
    default: '657'
  }
}

Svbtle.configure = function(applicationConfig, userConfig){
  return _({}).extend(applicationConfig, Svbtle.defaultConfig, userConfig)
}

proto.generate = function(ecb, cb){
  var _this = this
  this.copyBaseThemeAssets(ecb, function(){
    _this.copyAsset(app.pathUtil.join(__dirname, 'assets', '/style.css')
    , _this.paths.themeAsset(themeName, '/style.css'), ecb, cb)
  })
}

proto.generatePost = function(post, ecb, cb){
  var _this = this
  var target = this.paths.post(post, {format: 'html'})
  app.debug('[blog-svbtle-theme] generating post ' + target)
  var data = {
    title       : post.title,
    currentPath : this.paths.post(post),
    post        : post,
    themeName    : themeName
  }
  _this.render('/post.html', data, ecb, function(html){
    data._content = html
    _this.renderTo('/layout.html', data, target, ecb, cb)
  })
}

proto.generatePostCollection = function(tag, page, pagesCount, posts, ecb, cb){
  app.debug('[blog-svbtle-theme] generating post collection, page ' + page)
  data = {
    title        : this.config.title,
    date         : _(posts).max(function(post){return post.date}).date,
    posts        : posts,
    nextPath     : this.paths.nextPosts({tag: tag, page: page, pagesCount: pagesCount}),
    previousPath : this.paths.previousPosts({tag: tag, page: page, pagesCount: pagesCount}),
    currentPath  : this.paths.posts({tag: tag, page: page}),
    themeName    : themeName
  }

  var _this = this
  var target = this.paths.posts({tag: tag, page: page, format: 'html'})
  this.render('/posts.html', data, ecb, function(html){
    data._content = html
    _this.renderTo('/layout.html', data, target, ecb, cb)
  })
}
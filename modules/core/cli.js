// Printing help.
var printHelp = function(){
  _([
    "",
    "Help",
    "",
    "  The eviltest is a static site generator.",
    "  Go to your site directory and type `eviltext build` to generate it",
    "  or `eviltext serve` to serve it locally.",
    "",
    "  To explicitly specify the source path and build path use",
    "  environment variables `srcPath='.' buildPath='./build' eviltext build`"
  ]).each(function(chunk){console.info(chunk)})
}

// Serving static content.
var serve = function(path, host, port){
  app.debug('[core] serving ' + path)
  var fspath = require('path')
  var fs = require('fs')
  var express = require('express')
  var server = express()
  server.use(function(req, res){
    app.debug("serving file " + req.path)
    // Setting cache.
    if(req.query.cache){
      var maxAge = /^[0-9]+$/.test(req.query.cache) ? parseInt(req.query.cache) : 31536000
      res.setHeader('Cache-Control', 'public, max-age=' + maxAge)
    }

    // Sending file.
    var relativePath = req.path
    var absolutePath = fspath.join(path, req.path)
    fs.stat(absolutePath, function(err, stat){
      var ecb = function(err){
        app.error("can't serve " + req.path)
        res.send(404)
      }
      if((err || !stat.isFile()) && !fspath.extname(relativePath)){
        // Trying to add `.html` as extension.
        _(['.html', '/index.html', '.htm', '/index.htm']).asyncEach(function(addon, i, ecb, next){
          var htmlRelativePath = (relativePath + addon).replace(/\/\//, '/')
          var htmlAbsolutePath = (absolutePath + addon).replace(/\/\//, '/')
          fs.stat(htmlAbsolutePath, function(err, stat){
            if(!err && stat.isFile()) res.sendfile(htmlAbsolutePath)
            else next()
          })
        }, ecb, ecb)
      }else res.sendfile(absolutePath)
    })
  })
  server.listen(port)
}

exports.run = function(){
  app.debug('[core] parsing command line')

  // Parsing command line options.
  var command = process.argv[2]
  command = command || 'build'
  var srcPath   = process.env['srcPath'] || '.'
  var buildPath = process.env['buildPath'] || './build'
  var host      = process.env['host'] || 'localhost'
  var port      = parseInt(process.env['port'] || 3000)

  srcPath = require('path').resolve(srcPath)
  buildPath = require('path').resolve(buildPath)

  if(command == 'build'){
    app.info('Generating site ' + srcPath)
    new app.generate(srcPath, buildPath, app.error, function(){
      app.info('Site generated to ' + buildPath)
      app.info('Type `eviltext serve` if you want to serve it locally.')
    })
  }else if(command == 'serve'){
    serve(buildPath, host, port)
    app.info("Site available at http://" + host + ':' + port)
  }else if(command == 'help'){
    printHelp()
  }else{
    app.info("\nThe command you entered - '" + command + "' is incorrect,")
    app.info("please read the help message below.")
    printHelp()
  }
}
require('./support')
require('./config')
var fs = require('fs-extra')
var fspath = require('path')

// Preventing from accidentally changing content outside of `build` directory.
app.ensurePathInBuildDirectory = function(path){
  if(/\/build\/|^build\//.test(path)) return path
  var error = new Error("can't change content outside of build directory!")
  error.path = path
  throw error
}

// Reading files into memory.
var _propagateUpdatedAt = function(entry){
  var parent = entry.parent
  if(!parent.updatedAt || parent.updatedAt < entry.updatedAt){
    parent.updatedAt = entry.updatedAt
    if(entry.parent) _propagateUpdatedAt(entry)
  }
}
var _readEntries = function(directory, path, entries, parent, ecb, cb){
  fs.readdir(fspath.join(directory, path), _.fork(ecb, function(fnames){
    // Reading stats for files.
    _(fnames).asyncEach(function(fname, i, ecb, next){
      // Skipping files.
      if(app.systemFiles.test(fname) || app.ignoreFiles.test(fname)) return next()

      // Adding files to entries.
      var absolutePath = fspath.join(directory, path, fname)
      var relativePath = fspath.join('/', path, fname)
      fs.stat(absolutePath, _.fork(ecb, function(stat){
        var entry = {
          name      : fname,
          path      : relativePath,
          parent    : parent
        }
        entries[relativePath] = entry
        parent.subtree[relativePath] = entry
        parent.children[fname] = entry

        if(stat.isFile()){
          entry.entry = 'file'

          var extensionWithDot = fspath.extname(fname)
          entry.basePath = relativePath.substring(0, relativePath.length - extensionWithDot.length)
          .toLowerCase()
          entry.baseName = fspath.basename(fname, extensionWithDot).toLowerCase()
          entry.extension = extensionWithDot.replace('.', '').toLowerCase()

          entry.updatedAt = stat.mtime.valueOf()
          _propagateUpdatedAt(entry)
          next()
        }else{
          entry.entry = 'directory'

          // Directories don't have extensions.
          entry.basePath = relativePath.toLowerCase()
          entry.baseName = fname.toLowerCase()

          entry.subtree = {}
          entry.children = {}
          _readEntries(directory, relativePath, entries, entry, ecb, next)
        }
      }))
    }, ecb, cb)
  }))
}
app.readEntries = function(directory, ecb, cb){
  app.debug('[core] reading entries ' + directory)
  var root = {
    entry     : 'directory',
    name      : '/',
    baseName  : '/',
    path      : '/',
    basePath  : '/',
    subtree   : {},
    children  : {},
    parent    : null
  }
  var entries = {'/': root}
  _readEntries(directory, '/', entries, root
  , function(err){
    // If directory not exist returning empty files instead of error.
    err.code == 'ENOENT' ? cb(entries) : ecb(err)
  }
  , function(){
    cb(entries)
  })
}

app.readFile = function(path, ecb, cb){fs.readFile(path, 'utf8', _.fork(ecb, cb))}

// Creates parent dirs and overwrites existing content.
app.writeFile = function(path, content, ecb, cb){
  // app.debug('[core] writing to ' + path)
  fs.outputFile(app.ensurePathInBuildDirectory(path), content, _.fork(function(err){
    // For some reason error returned as array, unwrapping it.
    if(_(err).isArray()) err = err[0]

    // It cannot overwrite directory with file or file with directory, deleting it and
    // trying to copy one more time.
    if(err.code == 'EPERM' || err.code == 'ENOTDIR'){
      // TODO clear build directory automatically.
      app.error("can't write file to " + to + " clear build directory and try one more time.")
    }
    ecb(err)
  }, cb))
}

// Creates parent dirs and overwrites existing content.
app.copyFile = function(from, to, ecb, cb){
  // app.debug('[core] copying ' + from + ' to ' + to)
  fs.copy(from, app.ensurePathInBuildDirectory(to), _.fork(function(err){
    // For some reason error returned as array, unwrapping it.
    if(_(err).isArray()) err = err[0]

    // It cannot overwrite directory with file or file with directory, deleting it and
    // trying to copy one more time.
    if(err.code == 'EPERM' || err.code == 'ENOTDIR'){
      // TODO clear build directory automatically.
      app.error("can't copy file to " + to + " clear build directory and try one more time.")
    }
    ecb(err)
  }, cb))
}

app.readJson = function(path, ecb, cb){fs.readJson(path, _.fork(ecb, cb))}
app.writeJson = function(path, data, ecb, cb){
  fs.outputJson(app.ensurePathInBuildDirectory(path), data, _.fork(ecb, cb))
}
var fspath = require('path')

app.Static = function(srcPath, buildPath, ecb, cb){
  this.srcPath = srcPath
  this.buildPath = buildPath
  this.initialize(ecb, cb)
}
var proto = app.Static.prototype

proto.initialize = function(ecb, cb){
  var _this = this
  app.readEntries(this.srcPath, ecb, function(srcEntries){
    _this.srcEntries = srcEntries
    _this._calculateBaseEntries()

    app.readEntries(_this.buildPath, ecb, function(buildEntries){
      _this.buildEntries = buildEntries

      _this._findConfigs()
      _this._readConfigs(ecb, function(){
        app.debug('[core] initialized')
        cb(_this)
      })
    })
  })
}

proto.generate = function(ecb, cb){
  var _this = this
  this._generateFiles(ecb, function(anyFileBeenUpdated){
    var proceed = function(){_this._generateApplications(ecb, cb)}
    // After generating files we need update `buildEntries` if there was any update.
    // TODO improve performance, keep track of updated files and update `buildEntries` without
    if(anyFileBeenUpdated){
      app.readEntries(_this.buildPath, ecb, function(buildEntries){
        _this.buildEntries = buildEntries
        proceed()
      })
    }else proceed()
  })
}

proto._generateApplications = function(ecb, cb){
  app.debug('[core] processing applications')
  var _this = this
  _(this.configs).asyncEach(function(config, path, ecb, next){
    var applicationName = config.application
    if(applicationName){
      var Application = app.applications[applicationName]
      if(!Application) return ecb(new Error('no application ' + applicationName))
      Application = Application()
      new Application(path, config, _this.srcPath, _this.srcBaseEntries
      , _this.buildPath, _this.buildEntries, ecb, function(application){
        application.generate(ecb, next)
      })
    }
  }, ecb, cb)
}

proto._generateFiles = function(ecb, cb){
  app.debug('[core] processing files')
  var _this = this
  var anyFileBeenUpdated = false
  _(this.srcBaseEntries).asyncEach(function(entry, basePath, ecb, next){
    if(entry.entry == 'directory') return next()

    if((entry.baseName == app.configBaseName) && (entry.parent.basePath in _this.configs)){
      // Processing config specially.
      var config = _this.configs[entry.parent.basePath]
      var targetPath = app.configTargetPath(entry.basePath)

      // Checking if config has been already processed.
      var targetEntry = _this.buildEntries[targetPath]
      if(app.regenerateFiles || !targetEntry || (entry.updatedAt > targetEntry.updatedAt)){
        app.debug('[core] processing config file ' + entry.path)
        anyFileBeenUpdated = true
        app.writeJson(fspath.join(_this.buildPath, targetPath), config, ecb, next)
      } else next()
    }else{
      // Processing ordinary entry.
      var processor = app.processors[entry.extension]
      if(processor){
        processor = processor()
        var config = _this._getConfigForEntry(entry)

        // Checking if entry has been already processed.
        var needsUpdate = false
        var targets = processor.targets(entry, config)
        for(var j = 0; j < targets.length; j++){
          var targetPath = targets[j]
          var targetEntry = _this.buildEntries[targetPath]
          if(
            app.regenerateFiles ||
            !targetEntry ||
            (entry.updatedAt > targetEntry.updatedAt) ||
            (config.updatedAt > targetEntry.updatedAt)
          ){
            needsUpdate = true
            break
          }
        }

        // Processing entry.
        if(needsUpdate){
          app.debug('[core] processing file ' + entry.path)
          anyFileBeenUpdated = true
          processor.process(_this.srcPath, _this.buildPath, entry, config, ecb, next)
        }else next()
      }else{
        // Target path is the same as file path, but lovercased.
        var targetPath = entry.path.toLowerCase()
        // Checking if entry has been already copied.
        var targetEntry = _this.buildEntries[targetPath]
        if(!targetEntry || (entry.updatedAt > targetEntry.updatedAt)){
          app.debug('[core] copying file ' + entry.path)
          anyFileBeenUpdated = true
          app.copyFile(fspath.join(_this.srcPath, entry.path)
          , fspath.join(_this.buildPath, targetPath), ecb, next())
        } else next()
      }
    }
  }, ecb, function(){cb(anyFileBeenUpdated)})
}

proto._calculateBaseEntries = function(){
  app.debug('[core] calculating base entries')
  this.srcBaseEntries = {}
  var _this = this

  convertedEntries = {}
  var convertEntry = function(entry){
    if(!entry) return null

    var convertedEntry = convertedEntries[entry.path]
    if(convertedEntry) return convertedEntry
    convertedEntry = _(entry).clone()
    convertedEntries[entry.path] = convertedEntry

    convertedEntry.parent = convertEntry(entry.parent)
    if(entry.entry == 'directory'){
      convertedEntry.subtree = {}
      convertedEntry.children = {}
      _(entry.subtree).each(function(e){convertedEntry.subtree[e.basePath] = convertEntry(e)})
      _(entry.children).each(function(e){convertedEntry.children[e.baseName] = convertEntry(e)})
    }
    return convertedEntry
  }

  _(this.srcEntries).each(function(entry, path){
    entry = convertEntry(entry)
    var existingEntry = _this.srcBaseEntries[entry.basePath]
    if(existingEntry){
      // Merging directories with files in case of same name.
      if(entry.entry == 'file'){
        entry.subtree = existingEntry.subtree
        entry.children = existingEntry.children
        _this.srcBaseEntries[entry.basePath] = entry
      }else{
        existingEntry.subtree = entry.subtree
        existingEntry.children = entry.children
      }
    }else _this.srcBaseEntries[entry.basePath] = entry
  })
}

proto._findConfigs = function(){
  app.debug('[core] searching for configs in ' + this.srcPath)
  this.configFiles = []
  var _this = this
  var checkAndAddConfig = function(directory){
    var configFile = directory.children[app.configBaseName]
    if(
      configFile && (configFile.entry == 'file') &&
      (configFile.extension in app.configProcessors)
    ) _this.configFiles.push(configFile)
  }
  // Checking first level.
  checkAndAddConfig(this.srcBaseEntries['/'])

  // Checking for second level configs.
  _(this.srcBaseEntries['/'].children).each(function(entry){
    if(entry.entry == 'directory') checkAndAddConfig(entry)
  })
}

proto._readConfigs = function(ecb, cb){
  app.debug('[core] reading configs ' + this.srcPath)
  this.configs = {}
  var _this = this
  _(this.configFiles).asyncEach(function(configFile, i, ecb, next){
    var targetPath = app.configTargetPath(configFile.basePath)
    var parentBasePath = configFile.parent.basePath

    if(
      app.regenerateFiles ||
      !(targetPath in _this.buildEntries) ||
      (configFile.updatedAt > _this.buildEntries[targetPath].updatedAt)
    ){
      // Processing and reading config.
      app.debug('[core] processing and reading config ' + configFile.path)
      _this._processConfigFile(configFile, ecb, function(data){
        _this.configs[parentBasePath] = data
        next()
      })
    }else{
      // Reading processed config.
      app.debug('[core] reading config ' + targetPath)
      app.readJson(fspath.join(_this.buildPath, targetPath), ecb, function(data){
        _this.configs[parentBasePath] = data
        next()
      })
    }
  }, ecb, cb)
}

proto._getConfigForEntry = function(entry){
  if(!this._entryConfigsCache) this._entryConfigsCache = {null: {}}

  var config = this._entryConfigsCache[(entry && entry.basePath) || null]
  if(!config){
    config = this.configs[entry.basePath] || this._getConfigForEntry(entry.parent)
    this._entryConfigsCache[entry.basePath] = config
  }
  return config
}

proto._processConfigFile = function(configFile, ecb, cb){
  var processor = app.configProcessors[configFile.extension]
  processor = processor()
  processor.processConfig(this.srcPath, this.buildPath, configFile, {}, ecb, function(data){
    if(!data) throw new Error("config processor return no data!")
    if(!data.updatedAt) throw new Error("config processor return no updatedAt!")

    // Adding data from application.
    var applicationName = data.application
    if(applicationName){
      var Application
      try{Application = app.getApplication(applicationName)}catch(err){return ecb(err)}
      data = Application.configure(configFile.parent.basePath, data)
    }
    cb(data)
  })
}




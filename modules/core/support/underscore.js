module.exports = _ = require('underscore')

_.mixin({
  fork: function(errCallback, cb){
    if(!errCallback) throw new Error('no cb for error for fork')
    return function(){
      var err = arguments[0]
      var argsWithoutError = [].slice.call(arguments, 1) || []
      if(err) return errCallback(err)
      if(cb) cb.apply(null, argsWithoutError)
    }
  },

  asyncEach: function(collection, eachCb, ecb, cb){
    var counter = 1
    var unwrapStack = function(fn){
      if(counter % 100 == 0) return fn
      else return function(){process.nextTick(fn)}
      counter = counter + 1
    }

    if(_(collection).isArray()){
      // Array.
      var each = function(i){
        if(i == collection.length) return cb()
        eachCb(collection[i], i, ecb, unwrapStack(function(){each(i + 1)}))
      }
      each(0)
    }else{
      // Hash.
      var keys = _(collection).keys()
      var each = function(i){
        if(i == keys.length) return cb()
        var key = keys[i]
        eachCb(collection[key], key, ecb, unwrapStack(function(){each(i + 1)}))
      }
      each(0)
    }
  }
})
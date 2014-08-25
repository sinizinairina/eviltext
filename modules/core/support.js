global.app = {}

// TODO remove CoffeeScript.
// CoffeeScript.
require('coffee-script/register')

// `p` helper.
global.p = function(){
  // var inspected = []
  // for(var i = 0; i < arguments.length; i++)
  //   inspected.push(JSON.stringify(arguments[i], null, 2))
  console.log.apply(console, arguments)
}

// info, warn and error
app.info = console.info.bind(console)
app.warn = console.warn.bind(console)
app.error = console.error.bind(console)

// app.debug
app.debugMode = !!(process.env['debug'] || process.env['DEBUG'])
if(app.debugMode){
  app.debug = function(){
    var args = Array.prototype.slice.call(arguments, 0);
    args.unshift('  ')
    console.log.apply(console, args)
  }
}else app.debug = function(){}

// Underscore.
require('./support/underscore-old')
global._ = require('./support/underscore')
global._s = require('./support/underscore.string')
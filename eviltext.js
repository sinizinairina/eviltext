#!/usr/bin/env node

require('./modules/core')
require('./modules/ru-attribute-translation')

var cli = require('./modules/core/cli')
cli.run()
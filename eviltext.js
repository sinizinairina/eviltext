#!/usr/bin/env node

require('./modules/core')

// Support for russian languages.
require('./modules/ru')

var cli = require('./modules/core/cli')
cli.run()
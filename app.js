#!/usr/bin/env node

var fs = require('fs')
var path = require('path')
var Q = require('q')
var minimist = require('minimist')
var utils = require('@tradle/utils')
var Builder = require('@tradle/chained-obj').Builder
var args = minimist(process.argv.slice(2), {
  alias: {
    d: 'data',
    a: 'attachment',
    t: 'dry-run', // print only
    p: 'port',
    h: 'host',
    i: 'infoHash'
  },
  default: {
    host: '127.0.0.1'
  },
  boolean: [
    'dry-run',
    'help'
  ]
})

if (args.help || !(args.port || args['dry-run'])) {
  runHelp()
} else if (args.version) {
  runVersion()
}

if (args.data) put()
else {
  if (args.infoHash) get()
  else {
    console.error('missing parameter "data", see usage:\n')
    runHelp()
  }
}

function get () {
  var Client = require('./')
  var client = new Client('http://localhost:' + args.port)
  client.getOne(args.infoHash)
    .then(function (data) {
      console.log(data)
      process.exit(0)
    })
    .catch(console.error)
}

function put () {
  if (/^@/.test(args.data)) args.data = fs.readFileSync(args.data.slice(1))
  else args.data = JSON.parse(args.data)

  var attachments
  if (args.attachment) {
    attachments = Array.isArray(args.attachment) ? args.attachment : [args.attachment]
    attachments = attachments.map(function (a) {
      a = a.split('=')
      return {
        name: a[0],
        path: path.resolve(a[1])
      }
    })

    attachments.every(function (a) {
      if (!fs.existsSync(a.path)) {
        throw new Error('attachment not found: ' + a.path)
      }
    })
  }

  var Client = require('./')
  var client = new Client('http://' + args.host + ':' + args.port)

  if (attachments) {
    throw new Error('not supported yet, include attachments in body')
    // attachments.forEach(builder.attach, builder)
  }

  var buf
  new Builder()
    .data(args.data)
    .build()
    .then(function (_buf) {
      buf = _buf
      return Q.ninvoke(utils, 'getInfoHash', buf)
    })
    .then(function (infoHash) {
      console.log(infoHash)
      if (args['dry-run']) return

      return client.put(infoHash, buf)
        .then(function (resp) {
          if (resp) console.log(resp)
        })
    })
    .done()
}

function runHelp () {
  console.log(function () {
    /*
    Usage:
        ./app.js -p [bitkeeper-server port] <other options>
    Example:
      put:
        ./app.js -p 25667 -d "@blah.json" -a headshot=a.png -a resume=b.pdf
      get:
        ./app.js -p 25667 -i 58cb56af3fe8043c3717acb6918de7d4f7526516
    Options:
        -h  --host                  keeper host
        -d, --data                  @{path/to/json} OR json string
        -a, --attachment            attachment, format: -a name=path/to/attachment
        --dry-run                   print, but don't execute "put"
        --version                   print the current version

    Please report bugs!  https://github.com/tradle/bitkeeper-client-js/issues
    */
  }.toString().split(/\n/).slice(2, -2).join('\n'))
  process.exit(0)
}

function runVersion () {
  console.log(require('./package.json').version)
  process.exit(0)
}

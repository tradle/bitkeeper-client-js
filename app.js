#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var minimist = require('minimist');
var utils = require('tradle-utils');
var Builder = require('chained-obj').Builder;
var args = minimist(process.argv.slice(2), {
  alias: {
    d: 'data',
    a: 'attachment',
    p: 'printOnly',
    h: 'help'
  },
  boolean: [
    'printOnly',
    'help'
  ]
});

if (args.help) {
  runHelp();
}
else if (args.version) {
  runVersion();
}

args.data = path.resolve(args.data);
if (!fs.existsSync(args.data)) {
  throw new Error('data file not found: ' + args.data);
}

var attachments;
if (args.attachment) {
  attachments = Array.isArray(args.attachment) ? args.attachment : [args.attachment];
  attachments = attachments.map(function(a) {
    a = a.split('=');
    a[1] = path.resolve(a[1]);
    return a;
  })

  attachments.every(function(a) {
    if (!fs.existsSync(a[1])) {
      throw new Error('attachment not found: ' + a[1]);
    }
  })
}

var data = require(args.data);
var Client = require('./');
var client = new Client(args._[0]);

var builder = new Builder().data(data);
if (attachments) {
  attachments.forEach(function(a) {
    builder.attach(a[0], a[1]);
  })
}

builder.build(function(err, buf) {
  if (err) throw err;

  utils.getInfoHash(buf, function(err, infoHash) {
    if (err) throw err;

    console.log(infoHash);
    if (args.printOnly) return;

    return client.put(infoHash, buf)
      .then(function(resp) {
        if (resp) console.log(resp);
      })
      .done();
  })
})

function runHelp() {
  console.log(function() {
  /*
  Usage:
      keep [bitkeeper-server url] <options>
  Example:
      keep http://localhost:25667/ -d "blah.json" -a headshot=a.png -a resume=b.pdf
  Options:
      -d, --data                  path to primary data file (json)
      -a, --attachment            attachment, format: -a name=path/to/attachment
      -p, --printOnly             print, but don't execute "put"
      --version                   print the current version

  Please report bugs!  https://github.com/tradle/bitkeeper-client-js/issues
  */
  }.toString().split(/\n/).slice(2, -2).join('\n'))
  process.exit(0)
}

function runVersion() {
  console.log(require('../package.json').version)
  process.exit(0)
}

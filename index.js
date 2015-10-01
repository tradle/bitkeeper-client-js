'use strict'

var Q = require('q')
var nets = require('nets')
var url = require('url')
var putString = !!global.fetch

function KeeperAPI (config) {
  if (typeof config === 'string') {
    if (config.indexOf('://') === -1) config = 'http://' + config

    config = url.parse(config)
    this._host = config.hostname
    this._port = config.port
  } else {
    this._host = config.host
    this._port = config.port
  }
}

KeeperAPI.prototype.baseUrl = function () {
  var protocol = this._host.indexOf('://') === -1 ? 'http://' : ''
  return protocol + this._host + ':' + this._port + '/'
}

KeeperAPI.prototype.urlFor = function (key) {
  return this.baseUrl() + key
}

KeeperAPI.prototype.put = function (key, value, callback) {
  if (Buffer.isBuffer(key)) key = key.toString('hex')

  var defer = Q.defer()
  nets({
    url: this.baseUrl() + key,
    body: putString ? value.toString('binary') : value,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/octet-stream'
    }
  }, function (err, resp) {
    if (err) return defer.reject(err)
    else if (resp.statusCode !== 200) return defer.reject(new Error(resp.body))
    else defer.resolve(resp.body)
  })

  return defer.promise
}

// separate requests for now
KeeperAPI.prototype.getMany = function (keys) {
  var self = this
  var tasks = keys.map(function (k) {
    return self.getOne(k)
  })

  return Q.allSettled(tasks)
    .then(function (results) {
      return results.map(function (r) {
        return r.value
      })
    })
}

KeeperAPI.prototype.isKeeper = function () {
  return false
}

KeeperAPI.prototype.getOne = function (key) {
  var defer = Q.defer()
  nets({ url: this.urlFor(key) }, function (err, resp, body) {
    if (err || resp.statusCode !== 200 || typeof body === 'undefined') {
      defer.reject(err || new Error('failed to retrieve file'))
    } else {
      if (typeof body === 'string') {
        body = new Buffer(body)
      }

      defer.resolve(body)
    }
  })

  return defer.promise
}

// compatibility with bitkeeper API
KeeperAPI.prototype.destroy = function () {}

module.exports = KeeperAPI

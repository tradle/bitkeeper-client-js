'use strict'

var Q = require('q')
var request = require('superagent')
var url = require('url')

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
  request.put(this.baseUrl() + key)
    .type('application/octet-stream')
    .send(value)
    .end(function (err, resp) {
      if (err) return defer.reject(err)
      else if (resp.status !== 200) return defer.reject(new Error(resp.body.message))
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
  var req = request.get(this.urlFor(key))
  return Q.ninvoke(req, 'end')
    .then(function (res) {
      if (res.status === 200) return res.body
    })
}

module.exports = KeeperAPI

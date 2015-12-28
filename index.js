'use strict'

var Q = require('q')
var nets = require('nets')
var putString
try {
  require('react-native')
} catch (err) {
  putString = true
}

function KeeperAPI (url) {
  if (typeof url !== 'string') {
    throw new Error('expected string')
  }

  if (url[url.length - 1] !== '/') {
    url += '/'
  }

  if (url.indexOf('://') === -1) {
    url = 'http://' + url
  }

  this._baseUrl = url
}

KeeperAPI.prototype._urlFor = function (key) {
  return this._baseUrl + key
}

KeeperAPI.prototype.put = function (key, value, callback) {
  if (Buffer.isBuffer(key)) key = key.toString('hex')

  var defer = Q.defer()
  nets({
    url: this._urlFor(key),
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
  nets({ url: this._urlFor(key) }, function (err, resp, body) {
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
KeeperAPI.prototype.destroy = function () {
  return Q()
}

module.exports = KeeperAPI

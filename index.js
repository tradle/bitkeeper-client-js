'use strict';

var Q = require('q');
var request = require('request');
var get = require('simple-get');
var url = require('url');

function KeeperAPI(config) {
  if (typeof config === 'string') {
    if (config.indexOf('://') === -1) config = 'http://' + config;

    config = url.parse(config);
    this._host = config.hostname;
    this._port = config.port;
  } else {
    this._host = config.host;
    this._port = config.port;
  }
}

KeeperAPI.prototype.baseUrl = function() {
  var protocol = this._host.indexOf('://') === -1 ? 'http://' : '';
  return protocol + this._host + ':' + this._port + '/';
}

KeeperAPI.prototype.urlFor = function(key) {
  return this.baseUrl() + key;
}

KeeperAPI.prototype.put = function(key, value, callback) {
  if (Buffer.isBuffer(key)) key = key.toString('hex');

  return Q.nfcall(request, {
      method: 'PUT',
      body: value,
      url: this.baseUrl() + key
    })
    .then(function(result) {
      return result[1]; // body
    })
}

// separate requests for now
KeeperAPI.prototype.getMany = function(keys) {
  var self = this;
  var tasks = keys.map(function(k) {
    return self.getOne(k);
  })

  return Q.allSettled(tasks)
    .then(function(results) {
      return results.map(function(r) {
        return r.value
      });
    });
}

KeeperAPI.prototype.isKeeper = function() {
  return false;
}

KeeperAPI.prototype.getOne = function(key) {
  return Q.ninvoke(get, 'concat', this.urlFor(key))
    .spread(function(data, res) {
      if (res.statusCode === 200) return data;
    })
}

module.exports = KeeperAPI;


var IDCF, Promise, crypto, querystring, request;

Promise = require('es6-promise').Promise;

crypto = require('crypto');

querystring = require('querystring');

request = require('request');

IDCF = (function() {
  function IDCF(arg) {
    this.endpoint = arg.endpoint, this.apiKey = arg.apiKey, this.secretKey = arg.secretKey;
  }

  IDCF.prototype.request = function(command, params) {
    var query;
    query = params;
    query.apiKey = this.apiKey;
    query.command = command;
    query.response = 'json';
    query.signature = this._buildSignature(query, this.secretKey);
    return this._request({
      url: this.endpoint,
      qs: query,
      json: true
    }).then(function(res) {
      var error, key, keys, ref;
      keys = Object.keys(res.body);
      if (keys.length === 0) {
        return res;
      }
      key = keys[0];
      if (((ref = res.body[key]) != null ? ref.errorcode : void 0) == null) {
        return res;
      }
      error = new Error();
      error.response = res;
      throw error;
    });
  };

  IDCF.prototype._buildSignature = function(query, secretKey) {
    var i, message, qs;
    qs = querystring.stringify(query);
    message = ((function() {
      var j, len, ref, results;
      ref = qs.split('&');
      results = [];
      for (j = 0, len = ref.length; j < len; j++) {
        i = ref[j];
        results.push(i.toLowerCase());
      }
      return results;
    })()).sort().join('&');
    return crypto.createHmac('sha1', secretKey).update(message).digest('base64');
  };

  IDCF.prototype._request = function(params) {
    return new Promise(function(resolve, reject) {
      return request(params, function(err, res) {
        if (err != null) {
          return reject(err);
        }
        return resolve(res);
      });
    });
  };

  return IDCF;

})();

module.exports = function(config) {
  return new IDCF(config);
};

module.exports.IDCF = IDCF;

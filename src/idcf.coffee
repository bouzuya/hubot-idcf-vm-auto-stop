{Promise} = require 'es6-promise'
crypto = require 'crypto'
querystring = require 'querystring'
request = require 'request'

class IDCF
  constructor: ({ @endpoint, @apiKey, @secretKey }) ->

  request: (command, params) ->
    query = params
    query.apiKey = @apiKey
    query.command = command
    query.response = 'json'
    query.signature = @_buildSignature query, @secretKey
    @_request
      url: @endpoint
      qs: query
      json: true
    .then (res) ->
      keys = Object.keys res.body
      return res if keys.length is 0
      key = keys[0]
      return res unless res.body[key]?.errorcode?
      error = new Error()
      error.response = res
      throw error

  _buildSignature: (query, secretKey) ->
    qs = querystring.stringify query
    message = (i.toLowerCase() for i in qs.split('&')).sort().join '&'
    crypto.createHmac('sha1', secretKey).update(message).digest 'base64'

  _request: (params) ->
    new Promise (resolve, reject) ->
      request params, (err, res) ->
        return reject(err) if err?
        resolve res

module.exports = (config) ->
  new IDCF config

module.exports.IDCF = IDCF

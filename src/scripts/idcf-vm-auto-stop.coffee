# Description
#   A Hubot script to stop all virtual machines in IDCF cloud
#
# Configuration:
#   HUBOT_IDCF_VM_AUTO_STOP_API_KEY
#   HUBOT_IDCF_VM_AUTO_STOP_CRON
#   HUBOT_IDCF_VM_AUTO_STOP_ENDPOINT
#   HUBOT_IDCF_VM_AUTO_STOP_ROOM
#   HUBOT_IDCF_VM_AUTO_STOP_SECRET_KEY
#
# Commands:
#   None
#
# Author:
#   bouzuya <m@bouzuya.net>
#
{CronJob} = require 'cron'
idcf = require '../idcf'
parseConfig = require 'hubot-config'

config = parseConfig 'idcf-vm-auto-stop',
  apiKey: null
  cron: null
  endpoint: null
  room: null
  secretKey: null

module.exports = (robot) ->

  action = ->
    machines = []
    client = idcf config
    client.request 'listVirtualMachines', {}
    .then (r) ->
      machines = r.body.listvirtualmachinesresponse.virtualmachine
      machines.reduce (promise, i) ->
        promise
        .then ->
          client.request 'stopVirtualMachine', { id: i.id }
        .then ->
          new Promise (resolve) ->
            setTimeout resolve, 1000
      , Promise.resolve()
    .then ->
      message = machines.map((i) -> i.displayname).join '\n'
      robot.messageRoom config.room, message
    .catch (e) ->
      robot.logger.error 'hubot-idcf-vm-auto-stop: error'
      robot.logger.error e
      res.send 'hubot-idcf-vm-auto-stop: error'

  new CronJob config.cron, action, null, true, 'Asia/Tokyo'

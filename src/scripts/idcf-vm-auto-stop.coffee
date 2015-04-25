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
#   hubot idcf vm auto stop add <id> ... add virtual machine to targets
#   hubot idcf vm auto stop list ... list targets
#   hubot idcf vm auto stop remove <id> ... remove virtual machine from targets
#   hubot idcf vm auto stop start ... start all targets
#   hubot idcf vm auto stop stop ... stop all targets
#
# Author:
#   bouzuya <m@bouzuya.net>
#
{CronJob} = require 'cron'
{Promise} = require 'es6-promise'
idcf = require 'idcf-cloud-api'
parseConfig = require 'hubot-config'

config = parseConfig 'idcf-vm-auto-stop',
  apiKey: null
  cron: null
  endpoint: null
  room: null
  secretKey: null
  timeout: '300000'

data = {}

confirm = (robot, action, machines) ->
  # wait [yes/no]
  data.action = action
  data.machines = machines.slice()
  data.timerId = setTimeout ->
    delete data.timerId
    robot.messageRoom config.room, 'hubot-idcf-vm-auto-stop: timeout'
  , parseInt(config.timeout, 10)
  message = """
    hubot-idcf-vm-auto-stop: #{action}
    #{machines.join('\n')}
    [yes/no] ?
  """
  robot.messageRoom config.room, message

actionAll = (robot, action, machines) ->
  client = idcf config
  machines.reduce (promise, i) ->
    promise
    .then ->
      client.request action, { id: i }
    .then ->
      new Promise (resolve) ->
        setTimeout resolve, 1000
  , Promise.resolve()
  .then ->
    machinesString = machines.map((i) -> i.displayname).join '\n'
    message = "hubot-idcf-vm-auto-stop: call #{action}\n#{machinesString}"
    robot.messageRoom config.room, message
  .catch (e) ->
    robot.logger.error 'hubot-idcf-vm-auto-stop: error'
    robot.logger.error e
    res.send 'hubot-idcf-vm-auto-stop: error'

module.exports = (robot) ->
  key = 'hubot-idcf-vm-auto-stop'

  robot.hear /^y(?:es)?$/i, (res) ->
    return unless data.timerId?
    return unless config.room is res.message.room
    clearTimeout data.timerId
    actionAll robot, data.action + 'VirtualMachine', data.machines

  robot.hear /^n(?:o)?$/i, (res) ->
    return unless data.timerId?
    return unless config.room is res.message.room
    clearTimeout data.timerId
    delete data.timerId
    res.send 'hubot-idcf-vm-auto-stop: canceled'

  robot.respond /idcf vm a(?:uto)?[ -]?s(?:top)? add ([-0-9a-f]+)/, (res) ->
    machines = robot.brain.get(key) ? []
    id = res.match[1]
    machines.push id
    robot.brain.set key, machines
    res.send 'hubot-idcf-vm-auto-stop: added ' + id

  robot.respond /idcf vm a(?:uto)?[ -]?s(?:top)? remove ([-0-9a-f]+)/, (res) ->
    machines = robot.brain.get(key) ? []
    id = res.match[1]
    machines = machines.filter (i) -> i isnt id
    robot.brain.set key, machines
    res.send 'hubot-idcf-vm-auto-stop: removed ' + id

  robot.respond /idcf vm a(?:uto)?[ -]?s(?:top)? list/, (res) ->
    machines = robot.brain.get(key) ? []
    res.send 'hubot-idcf-vm-auto-stop: list\n' + machines.join '\n'

  robot.respond /idcf vm a(?:uto)?[ -]?s(?:top)? start/, (res) ->
    machines = robot.brain.get(key) ? []
    confirm robot, 'start', machines

  robot.respond /idcf vm a(?:uto)?[ -]?s(?:top)? stop/, (res) ->
    machines = robot.brain.get(key) ? []
    confirm robot, 'stop', machines

  onTick = ->
    machines = robot.brain.get(key) ? []
    confirm robot, 'stop', machines

  new CronJob config.cron, onTick, null, true, 'Asia/Tokyo'

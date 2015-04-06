// Description
//   A Hubot script to stop all virtual machines in IDCF cloud
//
// Configuration:
//   HUBOT_IDCF_VM_AUTO_STOP_API_KEY
//   HUBOT_IDCF_VM_AUTO_STOP_CRON
//   HUBOT_IDCF_VM_AUTO_STOP_ENDPOINT
//   HUBOT_IDCF_VM_AUTO_STOP_ROOM
//   HUBOT_IDCF_VM_AUTO_STOP_SECRET_KEY
//
// Commands:
//   hubot idcf vm auto stop add <id> ... add virtual machine to targets
//   hubot idcf vm auto stop list ... list targets
//   hubot idcf vm auto stop remove <id> ... remove virtual machine from targets
//   hubot idcf vm auto stop start ... start all targets
//   hubot idcf vm auto stop stop ... stop all targets
//
// Author:
//   bouzuya <m@bouzuya.net>
//
var CronJob, Promise, actionAll, config, confirm, data, idcf, parseConfig;

CronJob = require('cron').CronJob;

Promise = require('es6-promise').Promise;

idcf = require('../idcf');

parseConfig = require('hubot-config');

config = parseConfig('idcf-vm-auto-stop', {
  apiKey: null,
  cron: null,
  endpoint: null,
  room: null,
  secretKey: null,
  timeout: '300000'
});

data = {};

confirm = function(robot, action, machines) {
  var message;
  data.action = action;
  data.machines = machines.slice();
  data.timerId = setTimeout(function() {
    delete data.timerId;
    return robot.messageRoom(config.room, 'hubot-idcf-vm-auto-stop: timeout');
  }, parseInt(config.timeout, 10));
  message = "hubot-idcf-vm-auto-stop: " + action + "\n" + (machines.join('\n')) + "\n[yes/no] ?";
  return robot.messageRoom(config.room, message);
};

actionAll = function(robot, action, machines) {
  var client;
  client = idcf(config);
  return machines.reduce(function(promise, i) {
    return promise.then(function() {
      return client.request(action, {
        id: i
      });
    }).then(function() {
      return new Promise(function(resolve) {
        return setTimeout(resolve, 1000);
      });
    });
  }, Promise.resolve()).then(function() {
    var machinesString, message;
    machinesString = machines.map(function(i) {
      return i.displayname;
    }).join('\n');
    message = "hubot-idcf-vm-auto-stop: call " + action + "\n" + machinesString;
    return robot.messageRoom(config.room, message);
  })["catch"](function(e) {
    robot.logger.error('hubot-idcf-vm-auto-stop: error');
    robot.logger.error(e);
    return res.send('hubot-idcf-vm-auto-stop: error');
  });
};

module.exports = function(robot) {
  var key, onTick;
  key = 'hubot-idcf-vm-auto-stop';
  robot.hear(/^y(?:es)?$/i, function(res) {
    if (data.timerId == null) {
      return;
    }
    if (config.room !== res.message.room) {
      return;
    }
    clearTimeout(data.timerId);
    return actionAll(robot, data.action + 'VirtualMachine', data.machines);
  });
  robot.hear(/^n(?:o)?$/i, function(res) {
    if (data.timerId == null) {
      return;
    }
    if (config.room !== res.message.room) {
      return;
    }
    clearTimeout(data.timerId);
    delete data.timerId;
    return res.send('hubot-idcf-vm-auto-stop: canceled');
  });
  robot.respond(/idcf vm a(?:uto)?[ -]?s(?:top)? add ([-0-9a-f]+)/, function(res) {
    var id, machines, ref;
    machines = (ref = robot.brain.get(key)) != null ? ref : [];
    id = res.match[1];
    machines.push(id);
    robot.brain.set(key, machines);
    return res.send('hubot-idcf-vm-auto-stop: added ' + id);
  });
  robot.respond(/idcf vm a(?:uto)?[ -]?s(?:top)? remove ([-0-9a-f]+)/, function(res) {
    var id, machines, ref;
    machines = (ref = robot.brain.get(key)) != null ? ref : [];
    id = res.match[1];
    machines = machines.filter(function(i) {
      return i !== id;
    });
    robot.brain.set(key, machines);
    return res.send('hubot-idcf-vm-auto-stop: removed ' + id);
  });
  robot.respond(/idcf vm a(?:uto)?[ -]?s(?:top)? list/, function(res) {
    var machines, ref;
    machines = (ref = robot.brain.get(key)) != null ? ref : [];
    return res.send('hubot-idcf-vm-auto-stop: list\n' + machines.join('\n'));
  });
  robot.respond(/idcf vm a(?:uto)?[ -]?s(?:top)? start/, function(res) {
    var machines, ref;
    machines = (ref = robot.brain.get(key)) != null ? ref : [];
    return confirm(robot, 'start', machines);
  });
  robot.respond(/idcf vm a(?:uto)?[ -]?s(?:top)? stop/, function(res) {
    var machines, ref;
    machines = (ref = robot.brain.get(key)) != null ? ref : [];
    return confirm(robot, 'stop', machines);
  });
  onTick = function() {
    var machines, ref;
    machines = (ref = robot.brain.get(key)) != null ? ref : [];
    return confirm(robot, 'stop', machines);
  };
  return new CronJob(config.cron, onTick, null, true, 'Asia/Tokyo');
};

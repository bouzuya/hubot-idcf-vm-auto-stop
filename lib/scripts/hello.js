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
//   None
//
// Author:
//   bouzuya <m@bouzuya.net>
//
var CronJob, config, idcf, parseConfig;

CronJob = require('cron').CronJob;

idcf = require('../idcf');

parseConfig = require('hubot-config');

config = parseConfig('idcf-vm-auto-stop', {
  apiKey: null,
  cron: null,
  endpoint: null,
  room: null,
  secretKey: null
});

module.exports = function(robot) {
  var action;
  action = function() {
    var client, machines;
    machines = [];
    client = idcf(config);
    return client.request('listVirtualMachines', {}).then(function(r) {
      machines = r.body.listvirtualmachinesresponse.virtualmachine;
      return machines.reduce(function(promise, i) {
        return promise.then(function() {
          return client.request('stopVirtualMachine', {
            id: i.id
          });
        }).then(function() {
          return new Promise(function(resolve) {
            return setTimeout(resolve, 1000);
          });
        });
      }, Promise.resolve());
    }).then(function() {
      var message;
      message = machines.map(function(i) {
        return i.displayname;
      }).join('\n');
      return robot.messageRoom(config.room, message);
    })["catch"](function(e) {
      robot.logger.error('hubot-idcf-vm: error');
      robot.logger.error(e);
      return res.send('hubot-idcf-vm: error');
    });
  };
  return new CronJob(config.cron, action, null, true, 'Asia/Tokyo');
};

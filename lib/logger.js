var winston = require('winston');

var logger = new (winston.Logger)({
  transports: [
    new winston.transports.Console({
      level: 'debug',
      timestamp: true,
      handleExceptions: false,
      colorize: true
    })
  ],
  exitOnError: true
});

module.exports = logger;

module.exports.middleware = function () {
  var morgan = require('morgan');
  var stream = {
    write: function (message, encoding) {
      logger.info(message);
    }
  };
  return morgan("dev", {stream: stream});
};
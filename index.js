var api = require('./lib/api')();

api.listen(process.env.PORT || 3000, process.env.IP || '0.0.0.0');
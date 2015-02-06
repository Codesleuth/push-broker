var api = require('./lib/api')();

var port = process.env.PORT || 3000;

api.listen(port);
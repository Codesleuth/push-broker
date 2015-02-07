var express = require('express'),
    socketio = require('socket.io'),
    morgan = require('morgan'),
    bodyParser = require('body-parser');

function handler(io, req, res) {
  var payload = req.body.payload;
  
  console.log('got push payload: ', payload);
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end();

  io.emit('payload', payload);
}

var app = express();
app.use(morgan('combined'));
app.use(bodyParser.urlencoded({ extended: true, parameterLimit: 1 }));

var server = require('http').Server(app);
var io = socketio(server);

app.post('/payload', handler.bind(app, io));

io.on('connection', function (socket) {
  console.log('connection event');
});

server.listen(process.env.PORT || 3000);
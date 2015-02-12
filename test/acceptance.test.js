var assert = require('assert'),
    sioClient = require('socket.io-client'),
    api = require('../lib/api'),
    request = require('request'),
    fs = require('fs'),
    url = require('url'),
    path = require('path');

describe('Acceptance Tests', function () {

  var urlBase;
  var urlPath;
  var urlFull;
  var server;

  before(function (done) {
    urlBase = 'http://127.0.0.1:3000';
    urlPath = '/webhook';
    urlFull = url.resolve(urlBase, urlPath);

    server = api();
    server.listen(process.env.PORT || 3000, done);
  });

  after(function (done) {
    server.close(done);
  });

  describe('PushEvent', function () {

    var socket;
    var expectedPayload;

    var response;
    var actualPayload;

    before(function (done) {
      expectedPayload = JSON.parse(fs.readFileSync(path.join(__dirname, 'assets', 'PushEvent.json')));

      socket = sioClient(urlBase, { forceNew: true });

      var payloadReceived, responseReceived;
      
      socket.on('PushEvent', function (data) {
        actualPayload = data;
        payloadReceived = true;

        if (responseReceived)
          done();
      });

      socket.on('connect', function (socket) {
        request.post({
          url: urlFull,
          body: expectedPayload,
          json: true,
          headers: {
            'X-Github-Event': 'push',
            'X-Github-Delivery': '72d3162e-cc78-11e3-81ab-4c9367dc0958'
          }
        }, function (err, res, body) {
          response = err || res.statusCode;
          responseReceived = true;

          if (payloadReceived)
            done();
        });
      });

    });

    it('should respond with 200 OK', function () {
      assert.strictEqual(response, 200);
    });

    it('should receive the payload from the connected socket', function () {
      assert.deepEqual(actualPayload, expectedPayload);
    });

    after(function () {
      socket.disconnect();
    });

  });

  describe('PushEvent with HMAC Signature', function () {

    var socket;
    var expectedPayload;

    var response;
    var actualPayload;

    before(function (done) {
      expectedPayload = JSON.parse(fs.readFileSync(path.join(__dirname, 'assets', 'PushEvent.json')));

      socket = sioClient(urlBase, { forceNew: true });

      var payloadReceived, responseReceived;
      
      socket.on('PushEvent', function (data) {
        actualPayload = data;
        payloadReceived = true;

        if (responseReceived)
          done();
      });

      socket.on('connect', function (socket) {
        request.post({
          url: urlFull,
          body: expectedPayload,
          json: true,
          headers: {
            'X-Github-Event': 'push',
            'X-Github-Delivery': '72d3162e-cc78-11e3-81ab-4c9367dc0958',
            'X-Hub-Signature': 'sha1=fead5cdf117469cb973f9ac60542ef3a51686c84' //test
          }
        }, function (err, res, body) {
          response = err || res.statusCode;
          responseReceived = true;

          if (payloadReceived)
            done();
        });
      });

    });

    it('should respond with 200 OK', function () {
      assert.strictEqual(response, 200);
    });

    it('should receive the payload from the connected socket', function () {
      assert.deepEqual(actualPayload, expectedPayload);
    });

    after(function () {
      socket.disconnect();
    });

  });

  describe('PushEvent with incorrect HMAC Signature', function () {

    var expectedPayload;
    var response;

    before(function (done) {
      expectedPayload = JSON.parse(fs.readFileSync(path.join(__dirname, 'assets', 'PushEvent.json')));
      
      request.post({
        url: urlFull,
        body: expectedPayload,
        json: true,
        headers: {
          'X-Github-Event': 'push',
          'X-Github-Delivery': '72d3162e-cc78-11e3-81ab-4c9367dc0958',
          'X-Hub-Signature': 'not valid'
        }
      }, function (err, res, body) {
        response = err || res.statusCode;
        done();
      });

    });

    it('should respond with 403 Forbidden', function () {
      assert.strictEqual(response, 403);
    });

  });

  describe('UnknownEvent', function () {

    var response;

    before(function (done) {
      request.post({
        url: urlFull,
        body: { some: 'payload' },
        json: true,
        headers: {
          'X-Github-Event': 'unknown',
          'X-Github-Delivery': '72d3162e-cc78-11e3-81ab-4c9367dc0958'
        }
      }, function (err, res, body) {
        response = err || res.statusCode;
        done();
      });

    });

    it('should respond with 400 Bad Request', function () {
      assert.strictEqual(response, 400);
    });

  });

});
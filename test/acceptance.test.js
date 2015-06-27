var assert = require('assert'),
    sioClient = require('socket.io-client'),
    api = require('../lib/api'),
    request = require('request'),
    fs = require('fs'),
    url = require('url'),
    path = require('path'),
    random = require('./random'),
    crypto = require('crypto'),
    log = require('../lib/logger');

function UUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

function HookshotID() {
  return 'xxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

describe('Acceptance Tests', function () {

  var urlBase;
  var urlPath;
  var urlFull;
  var examplePingEvent;
  var examplePushEvent;
  var server;

  before(function (done) {
    urlBase = 'http://127.0.0.1:3000';
    urlPath = '/webhook';
    urlFull = url.resolve(urlBase, urlPath);

    examplePingEvent = fs.readFileSync(path.join(__dirname, 'assets', 'PingEvent.json'));
    examplePushEvent = fs.readFileSync(path.join(__dirname, 'assets', 'PushEvent.json'));

    log.console.disable();

    server = api();
    server.listen(process.env.PORT || 3000, done);
  });

  after(function (done) {
    server.close(function () {
      done();
    });
  });

  describe('PingEvent with HMAC signature', function () {

    var socket;
    var response;
    var responseBody;
    var expectedSecret;
    var actualSecret;

    before(function (done) {
      expectedSecret = random.string();

      var hmac = crypto.createHmac('sha1', expectedSecret);
      var hash = hmac.update(examplePingEvent).digest('hex');

      socket = sioClient(urlBase, { forceNew: true });

      socket.on('connect', function () {
        socket.emit('secret', expectedSecret, function (setSecret) {
          actualSecret = setSecret;
          request.post({
            url: urlFull,
            body: examplePingEvent,
            headers: {
              'User-Agent': 'GitHub-Hookshot/' + HookshotID(),
              'Content-Type': 'application/json',
              'X-Github-Event': 'ping',
              'X-Github-Delivery': UUID(),
              'X-Hub-Signature': 'sha1=' + hash
            }
          }, function (err, res, body) {
            if (err) throw err;
            response = res;
            responseBody = body;
            done();
          });
        });
      });
    });

    it('should echo the secret when set', function () {
      assert.strictEqual(actualSecret, expectedSecret);
    });

    it('should respond with 200 OK', function () {
      assert.strictEqual(response.statusCode, 200);
    });

    it('should respond with an empty body', function () {
      assert.strictEqual(responseBody, '');
    });

    after(function () {
      socket.disconnect();
    });

  });

  describe('PingEvent without HMAC signature', function () {

    var socket;
    var response;
    var responseBody;

    before(function (done) {
      request.post({
        url: urlFull,
        body: examplePingEvent,
        headers: {
          'User-Agent': 'GitHub-Hookshot/' + HookshotID(),
          'Content-Type': 'application/json',
          'X-Github-Event': 'ping',
          'X-Github-Delivery': UUID()
        }
      }, function (err, res, body) {
        if (err) throw err;
        response = res;
        responseBody = body;
        done();
      });

    });

    it('should respond with 400 Bad Request', function () {
      assert.strictEqual(response.statusCode, 400);
    });

    it('should respond with the expected message', function () {
      assert.strictEqual(responseBody, 'A HMAC signature is required - specify a secrey key');
    });

  });

  describe('PingEvent without body', function () {

    var socket;
    var response;
    var responseBody;

    before(function (done) {
      request.post({
        url: urlFull,
        headers: {
          'User-Agent': 'GitHub-Hookshot/' + HookshotID(),
          'Content-Type': 'application/json',
          'X-Github-Event': 'ping',
          'X-Github-Delivery': UUID()
        }
      }, function (err, res, body) {
        if (err) throw err;
        response = res;
        responseBody = body;
        done();
      });

    });

    it('should respond with 400 Bad Request', function () {
      assert.strictEqual(response.statusCode, 400);
    });

    it('should respond with the expected message', function () {
      assert.strictEqual(responseBody, 'Payload is missing');
    });

  });

  describe('PingEvent with no listening clients', function () {

    var socket;
    var response;
    var responseBody;

    before(function (done) {
      request.post({
        url: urlFull,
        body: examplePingEvent,
        headers: {
          'User-Agent': 'GitHub-Hookshot/' + HookshotID(),
          'Content-Type': 'application/json',
          'X-Github-Event': 'ping',
          'X-Github-Delivery': UUID(),
          'X-Hub-Signature': 'sha1=unknown'
        }
      }, function (err, res, body) {
        if (err) throw err;
        response = res;
        responseBody = body;
        done();
      });

    });

    it('should respond with 403 Forbidden', function () {
      assert.strictEqual(response.statusCode, 403);
    });

    it('should respond with the expected message', function () {
      assert.strictEqual(responseBody, 'Unable to find any listening clients for the specified signature');
    });

  });

  describe('PushEvent with HMAC Signature', function () {

    var socket;
    var expectedDeliveryId;
    var expectedUserAgent;

    var response;
    var pushEventData;

    before(function (done) {
      expectedDeliveryId = UUID();
      expectedUserAgent = 'GitHub-Hookshot/' + HookshotID();

      var secret = random.string();

      var hmac = crypto.createHmac('sha1', secret);
      var hash = hmac.update(examplePushEvent).digest('hex');

      socket = sioClient(urlBase, { forceNew: true });

      var events = 2;
      
      socket.on('PushEvent', function (data) {
        pushEventData = data;

        if (!--events) done();
      });

      socket.on('connect', function () {
        socket.emit('secret', secret, function () {
          request.post({
            url: urlFull,
            body: examplePushEvent,
            headers: {
              'User-Agent': expectedUserAgent,
              'Content-Type': 'application/json',
              'X-Github-Event': 'push',
              'X-Github-Delivery': expectedDeliveryId,
              'X-Hub-Signature': 'sha1=' + hash
            }
          }, function (err, res, body) {
            if (err) throw err;
            response = res;

            if (!--events) done();
          });
        });
      });

    });

    it('should respond with 200 OK', function () {
      assert.strictEqual(response.statusCode, 200);
    });

    it('should receive the payload with the expected delivery id header', function () {
      assert.strictEqual(pushEventData.headers['X-Github-Delivery'], expectedDeliveryId);
    });

    it('should receive the payload with the expected user agent header', function () {
      assert.strictEqual(pushEventData.headers['User-Agent'], expectedUserAgent);
    });

    it('should receive the payload with the expected payload body', function () {
      assert.deepEqual(pushEventData.body, JSON.parse(examplePushEvent));
    });

    after(function () {
      socket.disconnect();
    });

  });

  describe('PushEvent without HMAC signature', function () {

    var socket;

    var response;
    var responseBody;
    var pushEventData;

    before(function (done) {
      request.post({
        url: urlFull,
        body: examplePushEvent,
        headers: {
          'User-Agent': 'GitHub-Hookshot/' + HookshotID(),
          'Content-Type': 'application/json',
          'X-Github-Event': 'push',
          'X-Github-Delivery': UUID()
        }
      }, function (err, res, body) {
        if (err) throw err;
        response = res;
        responseBody = body;
        done();
      });

    });

    it('should respond with 400 Bad Request', function () {
      assert.strictEqual(response.statusCode, 400);
    });

    it('should respond with the expected message', function () {
      assert.strictEqual(responseBody, 'A HMAC signature is required - specify a secrey key');
    });

  });

  describe('PushEvent without body', function () {

    var socket;
    var response;
    var responseBody;

    before(function (done) {
      request.post({
        url: urlFull,
        headers: {
          'User-Agent': 'GitHub-Hookshot/' + HookshotID(),
          'Content-Type': 'application/json',
          'X-Github-Event': 'push',
          'X-Github-Delivery': UUID()
        }
      }, function (err, res, body) {
        if (err) throw err;
        response = res;
        responseBody = body;
        done();
      });

    });

    it('should respond with 400 Bad Request', function () {
      assert.strictEqual(response.statusCode, 400);
    });

    it('should respond with the expected message', function () {
      assert.strictEqual(responseBody, 'Payload is missing');
    });

  });

  describe('PushEvent with no listening clients', function () {

    var response;
    var responseBody;

    before(function (done) {
      request.post({
        url: urlFull,
        body: examplePushEvent,
        headers: {
          'User-Agent': 'GitHub-Hookshot/044aadd',
          'Content-Type': 'application/json',
          'X-Github-Event': 'push',
          'X-Github-Delivery': '72d3162e-cc78-11e3-81ab-4c9367dc0958',
          'X-Hub-Signature': 'sha1=invalid'
        }
      }, function (err, res, body) {
        response = err || res;
        responseBody = body;
        done();
      });

    });

    it('should respond with 403 Forbidden', function () {
      assert.strictEqual(response.statusCode, 403);
    });

    it('should respond with the expected message', function () {
      assert.strictEqual(responseBody, 'Unable to find any listening clients for the specified signature');
    });

  });

  describe('UnknownEvent', function () {

    var response;
    var responseBody;

    before(function (done) {
      request.post({
        url: urlFull,
        body: { some: 'payload' },
        json: true,
        headers: {
          'User-Agent': 'GitHub-Hookshot/044aadd',
          'X-Github-Event': 'unknown',
          'X-Github-Delivery': '72d3162e-cc78-11e3-81ab-4c9367dc0958',
          'X-Hub-Signature': 'sha1=invalid'
        }
      }, function (err, res, body) {
        response = err || res;
        responseBody = body;
        done();
      });

    });

    it('should respond with 400 Bad Request', function () {
      assert.strictEqual(response.statusCode, 400);
    });

    it('should respond with the expected message', function () {
      assert.strictEqual(responseBody, 'Unknown event');
    });

  });

  describe('Root request', function () {

    var response;
    var responseBody;

    before(function (done) {
      request.get({
        url: urlBase,
        followRedirect: false
      }, function (err, res, body) {
        response = err || res;
        responseBody = body;
        done();
      });

    });

    it('should respond with 302 Found', function () {
      assert.strictEqual(response.statusCode, 302);
    });

    it('should respond with empty body', function () {
      assert.strictEqual(responseBody, '');
    });

    it('should respond with location header to https://codesleuth.github.io/push-broker', function () {
      assert.strictEqual(response.headers.location, 'https://codesleuth.github.io/push-broker');
    });

  });

  describe('Bad Path', function () {

    var response;
    var responseBody;

    before(function (done) {
      request.post({
        url: urlFull + '/asdad',
        body: { some: 'payload' },
        json: true,
        headers: {
          'User-Agent': 'GitHub-Hookshot/044aadd',
          'X-Github-Event': 'unknown',
          'X-Github-Delivery': '72d3162e-cc78-11e3-81ab-4c9367dc0958',
          'X-Hub-Signature': 'sha1=invalid'
        }
      }, function (err, res, body) {
        response = err || res;
        responseBody = body;
        done();
      });

    });

    it('should respond with 404 Not Found', function () {
      assert.strictEqual(response.statusCode, 404);
    });

    it('should respond with Not Found', function () {
      assert.strictEqual(responseBody, 'Not Found');
    });

  });

  describe('PushEvent with Invalid JSON body', function () {

    var response;
    var responseBody;

    before(function (done) {
      var jsonBody = 'clearly not valid JSON';

      var secret = random.string();

      var hmac = crypto.createHmac('sha1', secret);
      var hash = hmac.update(jsonBody).digest('hex');

      request.post({
        url: urlFull,
        body: jsonBody,
        headers: {
          'User-Agent': 'GitHub-Hookshot/055aadd',
          'Content-Type': 'application/json',
          'X-Github-Event': 'push',
          'X-Github-Delivery': 'd1626030-d9cb-4416-a24d-ca3746514254',
          'X-Hub-Signature': 'sha1=' + hash
        }
      }, function (err, res, body) {
        response = err || res;
        responseBody = body;
        done();
      });

    });

    it('should respond with 400 Bad Request', function () {
      assert.strictEqual(response.statusCode, 400);
    });

    it('should respond with Invalid JSON body', function () {
      assert.strictEqual(responseBody, 'Invalid JSON body');
    });

  });

});
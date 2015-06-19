(function (window, $) {

  var logPatch = function () {
    console.log(arguments);
  };

  var log = {
    info: logPatch,
    error: logPatch
  };

  var defaultUrl = 'https://push-broker.herokuapp.com';
  var nextUrl = defaultUrl;
  var socket;

  function connectSocket(url, pushHandler, disconnected) {
    var socket = io(url, { multiplex: true });

    socket.on('connect', function () {
      log.info('Socket.IO connected.');
      $('#service-uri').val(socket.io.uri);
      log.info(socket);
    });

    socket.on('PushEvent', function (data) {
      log.info('PushEvent received: ', data.headers['X-Github-Delivery']);
      pushHandler(data);
    });

    socket.on('disconnect', function () {
      log.info('Socket.IO disconnected.');
    });

    socket.on('reconnecting', function () {
      log.info('Socket.IO reconnecting...');
    });

    socket.on('reconnect', function () {
      log.info('Socket.IO reconnected.');
    });

    return socket;
  }

  function setSecret(secret, callback) {
    socket.emit('secret', secret, function (data) {
      log.info('Secret has been set.');
      callback(secret);
    });
  }

  $(function () {

    $events = $('#events');

    function createSystemEvent(type, title, body) {
      var eventDiv = $('.system-event-template', $events).clone();

      eventDiv.removeClass('system-event-template').addClass('panel-' + type);
      $('.panel-title', eventDiv).text(title);
      var now = new Date();
      $('.timeago', eventDiv).attr('datetime', now.toISOString()).text(now.toLocaleTimeString()).timeago();
      $('.panel-body', eventDiv).text(body);

      $events.prepend(eventDiv);
     
      $('.timeago', eventDiv).timeago();
    }

    function pushHandler(data) {
      var eventDiv = $('.event-template', $events).clone();
      eventDiv.attr('id', data.body.head_commit.id)
              .removeClass('event-template');

      var now = new Date();
      $('.event-id', eventDiv).text(data.headers['X-Github-Delivery']);
      $('.timeago', eventDiv).attr('datetime', now.toISOString()).text(now.toLocaleTimeString()).timeago();

      $('.payload', eventDiv).text(JSON.stringify(data.body, null, 2));
      $('.header-user-agent', eventDiv).text(data.headers['User-Agent']);
      $('.header-delivery', eventDiv).text(data.headers['X-Github-Delivery']);
      $('.header-sig', eventDiv).text(data.headers['X-Hub-Signature']);

      $events.prepend(eventDiv);

      $('.timeago', eventDiv).timeago();
    }

    createSystemEvent('info', 'Connecting...', 'Attempting to connect to the host: ' + defaultUrl);
    socket = connectSocket(nextUrl, pushHandler);

    socket.on('disconnect', function () {
      createSystemEvent('danger', 'Disconnected', 'The socket has disconnected from the host.');
    }).on('connect', function () {
      createSystemEvent('success', 'Connected', 'The socket has connected to the host.');
    });

    $('#set-secret').click(function (event) {
      event.preventDefault();
      setSecret($('#secret').val(), function (secret) {
        createSystemEvent('info', 'Secret Changed', secret);
      });
    });

  });

})(window, jQuery);
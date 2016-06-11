var API_KEY = 'neia0qp3tocg14i';

var app = {
	// private:
	_peer: null,
	_peerid: null,
	_view: null, // string
	_moviepath: null,
	_users: [], // list of online users

	// public: 
	setView: null, // function(view name)
	showAlert: null // function(type, message)
};

var views = {};


var init = function() {
	/*
		establish peer connection
	*/
	var setupPeer = (function(username, callback) {
		if (username.trim().length < 3)
			return alert("username length must be at least 5 characters or more!");

		var peer = new Peer(username, {key: API_KEY});

		peer.on("open", function(id) {
			app.showAlert('success', 'connected to peer network with id: ' + id);
			app._peerid = id;
			app._peer = peer;

			callback();
		});

		peer.on('error', function(err) {
			app.showAlert("danger", "" + err);
		});
	})

	/*
		add hooks
	*/
	$("#btn-create-lobby").on('click', function() {
		if ($("#input-movie-url").val().trim().length < 5) 
			return alert("please enter a valid movie url!");

		setupPeer($("#input-username").val(), function() {
			app._moviepath = $("#input-movie-url").val();

			app._mode = "host";
			app._host = app._peerid;
			app.setView("player");

			// handle connections correctly

      function syncVideoTime() {
        var vid = document.getElementById("video-player");
        app.broadcast({
          message: "playtime",
          time: vid.currentTime,
          paused: vid.paused
        });
      }

			app._peer.on('connection', function(conn) {
				app.showAlert('success', "connection from " + conn.peer);

				var newConn = app._peer.connect(conn.peer);
				newConn.on("open", function() {
					app.showAlert("success", "successfully connected back, sending sync data.");

					newConn.send({
						message: "source",
						data: app._moviepath
					});

          // sync the list of connected users when a new one connects
          app.broadcastUsers();

          // sync the video play time
          syncVideoTime();
				});

				newConn.on("error", function(error) { 
					app.showAlert("danger", "" + error);
				});
				
				conn.on('data', function(data) {
				});
			});

      $("#video-player").on("play", syncVideoTime);
      $("#video-player").on("pause", syncVideoTime);
      $("#video-player").on("seeking", syncVideoTime);
      $("#video-player").on("seeked", syncVideoTime);

		});
	});

	$("#btn-join-lobby").on('click', function() {
		if ($("#input-lobby-host-id").val().trim().length < 3) 
			return alert("please enter a valid host name!");

		setupPeer($("#input-username").val(), function() {
			app._host= $("#input-lobby-host-id").val();
			app._mode = "client";

			app.setView("player");

			var conn = app._peer.connect(app._host);
			app.showAlert("info", "connecting to remote peer " + app._host);
			
			conn.on("open", function() {
				app.showAlert("success", "successfully connected to peer!");
        app._serverpeer = conn;
			});

			conn.on("error", function(error) {
				app.showAlert("danger", "" + error);
			});

			app._peer.on('connection', function(conn) {
				app.showAlert("success", "received mesage back from server!");

				conn.on("data", function(data) {
					if (data.message === "source") {
						app._moviepath = data.data;
						app.updateView();

					} else if (data.message === "users") {
						app._users = data.users;
            app.updateView();

					} else if (data.message === "playtime") {
            var vid = document.getElementById("video-player");
            vid.currentTime = data.time;
            if (data.paused)
              vid.pause();
            else
              vid.play();
          }
				});
			});

		});
	});

	app.setView("lobby");

}

/*
	USER INTERFACE
*/

$(function() {
	$(".auto-validate").each(function() {
		$(this).focusout(function() {
			if ($(this).val().length == 0)
				$(this).parent().addClass("has-error");
			else
				$(this).parent().removeClass("has-error");
		});
	});
});

/* 
	PEER JS
*/

  // Goes through each active peer and calls FN on its connections.
function eachActiveConnection(fn) {
  Object.keys(app._peer.connections).forEach(function(key) {
    var conns = app._peer.connections[key];
    for (var i = 0, ii = conns.length; i < ii; i += 1) {
      var conn = conns[i];
      if (conn.open)
        fn(conn);
    }
  });
}




app.broadcast = function(message) {
	eachActiveConnection(function(conn) {
		if (conn.open)
			conn.send(message);
	});
}

app.broadcastUsers = function() {
	var message = {
		message: "users",
		users: []
	};

  eachActiveConnection(function(conn) {
		if (conn.open && message.users.indexOf(conn.peer) === -1) {
			message.users.push(conn.peer);
		}
	});

  app._users = message.users;

	app.broadcast(message);
  app.updateView();
}

/*
	VISIBILITY RULES
*/
app.setView = function updateVisibilityRules(view) {
	if (!view) view = app._view;
	app._view = view;
	$(".app-view").hide();
	setTimeout(function() {
		$("#view-" + app._view).show();
	}, 0);

	if (views[view]) {
		views[view].display();
		views[view].update();
	}
}
app.updateView = function updateView() {
	if (views[app._view]) {
		views[app._view].update();
	}
}

/*
	ALERTS
*/
app.showAlert = function showAlert(type, message, timeout) {
	console.log(type + ": " + message);
	timeout = timeout || 3000;

	var newDiv = $("<div />");
	$("#alerts").append(newDiv);

	ReactDOM.render(
		<div className={"alert alert-dismissible alert-" + type}>
			{message}
			<button type="button" className="close" data-dismiss="alert"><span>&times;</span></button>
		</div>
	, newDiv.get(0));

	newDiv.on('click', function() {
		this.remove();
	});
	if (timeout > 0)
	setInterval(function() {
		newDiv.fadeOut();
	}, timeout);
};

var PlayerInfoPanel = React.createClass({
  render: function() {
    return (
      <div>
        <p>
          <strong>HOSTNAME: </strong> {app._host} <br/> 
          <strong>USERNAME: </strong> {app._peerid} <br/>
          <strong>MOVIE PATH: </strong> {app._moviepath} <br/> 
          <strong>USERS: </strong> {app._users.join(", ")}
        </p>
      </div>
    );
  }
});



views.player = {
	display: function() {
    views.player.infoPanel = ReactDOM.render(
        <PlayerInfoPanel />
      , document.getElementById('player-info-panel'));
  },
	update: function() {
		views.player.infoPanel.forceUpdate();

    if (!views.player.videoLoaded && !!app._moviepath) {
      views.player.viedoLoaded = true;
      $("#video-player").attr("src", app._moviepath);
      if (app._mode === "host")
        $("#video-player").attr("controls", "");
      $("#video-player").load();
    }
	}
}

$(function() {
  $("#input-username").val("");
  $("#input-movie-url").val("http://techslides.com/demos/sample-videos/small.webm");
  $("#input-lobby-host-id").val("server");
});


/*
	load it
*/
$(init);
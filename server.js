var Game = require('./server/game');
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var _ = require('underscore');
var async = require('async');

// websockets configuration
io.configure(function () {
  io.set('log level', 1);
});

// serve all client contents statically
app.use('/client', express.static(__dirname + '/client'));
app.get('/', function(req, res) { res.sendfile(__dirname+'/client/worphles.html'); });

var games = {};
var lobbyists = {};

// start up the server
server.listen(process.env.PORT || 3000);

// handle each new player that connects
io.sockets.on('connection', function(socket) {

  var thisPlayer;
  var thisGameId;
  var connection = this;
  socket.on('name', function(name) {
    if (name) {
      thisPlayer = new Game.Player(socket.id, socket, name);
      socket.emit('hi', name);
      lobbyists[thisPlayer.id] = thisPlayer;
    } else {
      socket.emit('nameFail','youFail');
    }
  });

  socket.on('lobbyists', function() {
    socket.emit('lobbyists', Object.keys(lobbyists));
  });

  this.gameListData = function() {
    var gameList = [];
    _.each(games, function(game) {
      if (!game.started) {
        gameList.push( game.gameListInfo() );
      }
    });
    return gameList;
  };

  this.showLobbyists = function(message, data) {
    _.each(lobbyists, function(player) {
      player.socket.emit(message, data);
    });
  };

  socket.on('gameList', function(data) {
    socket.emit('gameList', connection.gameListData());
  });

  socket.on('joinGame', function(data) {
    var gameId = data && data.id;
    var password = data && data.password;
    thisGameId = gameId;
    if (gameId && games[gameId]) {
      games[gameId].addPlayer(thisPlayer, password, function(error) {
        if (error) {
          socket.emit('deniedGame', error);
        } else {
          delete lobbyists[thisPlayer.id];
          socket.emit('joinedGame', data);
          connection.showLobbyists('gameList', connection.gameListData());
        }
      });
    }
  });

  this.deleteGameIfEmpty = function(game) {
    if(game && Object.keys(game.players).length === 0) {
      delete games[thisGameId];
    }
  };

  socket.on('deleteEmptyGames', function() { //emit 'deleteEmptyGames' to delete empty games until we figure out this bug
    _.each(games, function(game) {
      if(game && Object.keys(game.players).length === 0) {
        delete games[game.id];
      }
    });
  });

  socket.on('disconnect', function() {
    var game = games[thisGameId];
    if (game && thisPlayer) {
      game.removePlayer(thisPlayer);
      connection.deleteGameIfEmpty(game);
      connection.showLobbyists('gameList', connection.gameListData());

      delete lobbyists[thisPlayer.id];
    }
  });

  socket.on('leaveGame', function() {
    var game = games[thisGameId];
    if (game && thisPlayer) {
      game.removePlayer(thisPlayer);
      connection.deleteGameIfEmpty(game);
      connection.showLobbyists('gameList', connection.gameListData());

      lobbyists[thisPlayer.id] = thisPlayer;
    }
  });

  socket.on('createGame', function(data) {
    if (!thisPlayer) {
      socket.emit('createFail', {message: 'Please refresh your browser'});
      return;
    }
    var name = data && data.name;
    if (!name) {
      socket.emit('createFail', {message: 'The game needs a name'});
      return;
    }
    var password = data && data.password;
    var size = data && data.size;
    var maxPlayers = data && data.maxPlayers;
    var time = data && data.time;
    var hackable = data && data.hackable;
    var gameSettings = new Game.Settings(time, maxPlayers, size, name, password, hackable);
    var game = new Game.Game(thisPlayer, gameSettings);
    games[game.id] = game;
    delete lobbyists[thisPlayer.id];
    thisGameId = game.id;
    connection.showLobbyists('gameList', connection.gameListData());

    socket.emit('gameCreated', {id: game.id});
  });

  socket.on('startGame', function(data) {
    if (!(thisPlayer && thisPlayer.id)) {
      return socket.emit('fail');
    }
    if (data.gameId && games[data.gameId]) {
      games[data.gameId].start(data.playerId);
      if (!games[data.gameId].started) {
        return socket.emit('startFail', {message: 'Could not start the game.'});
      }
    }
  });
});

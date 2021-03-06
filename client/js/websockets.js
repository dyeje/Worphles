var socket;

function initWebsockets() {
  socket = io.connect();

  socket.on('full', function(data) {
    $('#queue').text('Sorry, server\'s full');
  });

  socket.on('hi', function(data) {
    $('#startingButtons').fadeOut(function() {
      $('#lobbyButtons').fadeIn();
    });
  });

  socket.on('nameFail', function(data) {
    $('#nameForm').fadeIn();
  });

  socket.on('showStats', function(data) {
    var nameInput = $('#nameInput');
    var nameButton = $('#nameButton');
    if(data) {
      if(data.name) {
        nameInput.val(data.name);
      }

      if(data.name && data.name.length >= 3) {
        nameButton.removeAttr('disabled');
      }

      var muteSymbol = $('#muteSymbol');
      if(data.muted) {
        bgMusic.pause();
        muteSymbol.attr('class', 'fa fa-volume-off');
      } else {
        bgMusic.play();
        muteSymbol.attr('class', 'fa fa-volume-up');
      }
    }
  });

  socket.on('saveWorphleCookieId', function(data) {
    $.cookie('worphleSaveId', data);
  });

  socket.on('gameCreated', function(data) {
    gameId = data && data.id;
    $('#createGameModal').modal('hide');
    $('#mainTitle').fadeOut();
    $('#bookButtons').fadeOut();
    $('#lobbyButtons').fadeOut();
    $('#startGameButton').fadeIn();
    $('#leaveGameButton').fadeIn();
    $('#chatBar').fadeIn();
    $('#scoreboard').fadeIn();
  });

  socket.on('createFail', function(data) {
    alert('failed to create game', data);
  });

  socket.on('startFail', function(data) {
    alert('can\'t start because '+data.message);
  });

  socket.on('gameList', function(data) {
    mainLobby.update(data);
  });

  socket.on('joinedGame', function(data) {
    gameId = data && data.id;
    $('#joinGameModal').modal('hide');
    $('#mainTitle').fadeOut();
    $('#bookButtons').fadeOut();    
    $('#lobbyButtons').fadeOut();
    $('#chatBar').fadeIn();
    $('#scoreboard').fadeIn();
    $('#leaveGameButton').fadeIn();
  });

  socket.on('deniedGame', function(data) {
    alert("Couldn't join game: " + data);
  });

  socket.on('lobbyists', function(data) {
    console.log(data);
  });

  socket.on('players', function(data) {
    players = data.players;

    me = socket.socket.sessionid;
    scoreboard.update(data);

    if(data.host === me && !gameInProgress) {
      $('#startGameButton').fadeIn();
    }
  });

  socket.on('start', function(game) {
    initGame(game);
  });

  socket.on('gameOver', function(data) {
    gameInProgress = false;
    $('#gameStatus').fadeOut();
    removeCube();
    for(var i = 0; i < Object.keys(data.scores).length; i++) {
      var playerId = Object.keys(data.scores)[i];
      players[playerId].score = data.scores[playerId];
      players[playerId].words = data.words[playerId];
      scoreboard.updateScoreDisplay(playerId, data.scores[playerId]);
    };
    var awardsBody = $('#awardsBody');
    awardsBody.empty();
    for (var i = 0; i < Object.keys(data.awards).length; i++) {
      var key = Object.keys(data.awards)[i];
      var award = data.awards[key];

      $('<tr/>', {
        id: key,
        title: award.description,
        class: 'awardRow'
      }).appendTo(awardsBody);
      var thisAward = $('#'+key);

      $('<i/>', {
        class: 'fa ' + award.icon
      }).appendTo(thisAward);

      $('<td/>', {
        text: award.name,
        class: 'awardName'
      }).appendTo(thisAward);

      $('<td/>', {
        text: players[award.player].name,
        class: 'awardPlayer'
      }).appendTo(thisAward);
    }

    $('.awardRow').tooltip({
      placement: 'right'
    });
    $('#endGameModal').modal('show');
  });

  socket.on('stillhere?', function(data, callback) {
    callback();
  });

  socket.on('successfulMove', function(data) {
    for (var i in data) {
      updateTile(i, data[i].letter, data[i].owner, data[i].strength);
    }
  });

  socket.on('unsuccessfulMove', function(data) {
    for (var i in data) {
      colorTile(data[i]);
    }
  });

  socket.on('partialMove', function(data) {
    colorTile(data.tile, scaledColor(players[data.player].color, 1.5));
  });

  socket.on('chat', showChat);

  socket.on('scoreboardUpdate', function(update) {
    var player = update.player;
    var scores = update.scores;
    var popoverId = 'score'+player.id;

    for(var i = 0; i < Object.keys(scores).length; i++) {
      var playerId = Object.keys(scores)[i];
      players[playerId].score = scores[playerId];
      scoreboard.updateScoreDisplay(playerId, scores[playerId]);
    }

    scoreboard.showPopover(popoverId, player.word);
    setTimeout(function() {
      scoreboard.hidePopover(popoverId);
    }, 3000);
  });
}

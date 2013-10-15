var dictionary = require('./dictionary');
var pathValidator = require('./path_validator.js');
var cubeGrid = require('./cube_grid').getGrid();
var _ = require('underscore');


/**
 * game psuedo constants
 */

// all time is in milliseconds
var MS_PER_SEC = 1000;
var MS_PER_MIN = MS_PER_SEC * 60;

var DEFAULTS = {
  ROUND_TIME: 240 * MS_PER_SEC,
  MAX_PLAYERS: 2,
  GRID_SIZE: 4
};

var COLORS = {
  RED: new Color(1,0,0),
  BLUE: new Color(0,0,1),
  GREEN: new Color(0,1,0),
  YELLOW: new Color(1,1,0),
  MAGENTA: new Color(1,0,1),
  CYAN: new Color(0,1,1)
};


/**
 * Create a new Color
 */
function Color(r,g,b) {
  this.r = r;
  this.g = g;
  this.b = b;
};


/**
 * List of available player colors
 */
var playerColorOptions = [COLORS.RED,COLORS.BLUE,COLORS.GREEN,COLORS.YELLOW,COLORS.MAGENTA,COLORS.CYAN];

function Player(id, socket, color, name, score, safe) {
  this.id = id;
  this.socket = socket;
  this.color = color;
  this.name = name;
  this.score = score || 0;

  if (!safe) {
    this.safeCopy = function() {
      return new Player(this.id, null, this.color, this.name, this.score, true);
    };
  }
};


/**
 * Returns a random player color
 */
Player.randomColor = function(i) {
  return playerColorOptions[i%playerColorOptions.length];
};


/**
 * Create a new tile 
 */
function Tile(letter) {
  this.letter = letter;
  this.owner = null;
  this.strength = null; //not needed yet
  
  /**
   * Randomize this tile's letter.
   */
  this.randomize = function() {
    this.letter = Tile.randomLetter();
  };
};


/**
 * Returns a random letter.
 */
Tile.randomLetter = function() {
  return dictionary.makeLetter();
};


/**
 * Game Settings 
 */
function Settings(roundTime, maxPlayers, gridSize) {
  this.roundTime = roundTime || DEFAULTS.ROUND_TIME;
  this.maxPlayers = maxPlayers || DEFAULTS.MAX_PLAYERS;
  this.gridSize = gridSize || DEFAULTS.GRID_SIZE;
};


/**
 * Instance of a Game
 */
function Game(id, players, settings) {
  this.id = id;
  this.settings = settings || new Settings();

  this.tiles = [];
  for (var i = 0; i < this.settings.gridSize * this.settings.gridSize * 6; i++) {
    this.tiles.push(new Tile(Tile.randomLetter()));
  }

  this.players = {};
  _.each(players, function(player) {
    this.players[player.id] = player;
  }, this);

  this.getPlayerScores = function() {
    var scores = {};
    _.each(this.players, function(player) {
      scores[player.id] = player.score;
    });
    return scores;
  }

  this.tileUpdate = function(id, tiles) {
    var newTiles = {};
    for (var i = 0; i < tiles.length; i++) {
      var newLetter = Tile.randomLetter();
      var tileToUpdate = this.tiles[tiles[i]];
      var oldOwner = this.players[tileToUpdate.owner];
      var newOwner = this.players[id];
      tileToUpdate.owner = id;

      if(oldOwner)
        oldOwner.score--;
      if(newOwner)
        newOwner.score++;

      tileToUpdate.letter = newLetter;
      newTiles[tiles[i]] = {letter: newLetter, owner: id};
    }
    return newTiles;
  };

  this.safeCopy = function() {
    var gameClone = _.clone(this);
    gameClone.players = {};
    _.each(this.players, function(player) {
      gameClone.players[player.id] = player.safeCopy();
    });
    return gameClone;
  };

  this.validateWord = function(player, inputTiles) {
    var word = "";
    _.each(inputTiles, function(tile) {
      word += this.tiles[tile].letter;
    }, this);

    if (dictionary.isAWord(word) && pathValidator.isAPath(inputTiles, this.settings.gridSize)) {
      this.showEveryone('successfulMove', this.tileUpdate(player, inputTiles));
      this.showEveryone('scoreboardUpdate', this.getPlayerScores());
    } else {
      this.showEveryone('unsuccessfulMove', inputTiles);
    }
  };

  this.showPartialMove = function(tile) {
    this.showEveryone('partialMove', tile);
  }

  this.showEveryone = function(message, data) {
    _.each(this.players, function(player) {
      player.socket.emit(message, data);
    });
  }
};


/**
 * Public game constructor
 */
module.exports.newGame = function(players, settings) {
  return new Game(players, settings);
};


/**
 * Default Game Settings
 */
module.exports.defaultSettings = function() {
  return new Settings();
};

module.exports.Settings = Settings;
module.exports.Game = Game;
module.exports.Player = Player;
module.exports.DEFAULTS = DEFAULTS;

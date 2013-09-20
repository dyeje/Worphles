var fs = Npm.require('fs');

var text = fs.readFileSync('localhost:3000/words.txt', "utf-8"); //replace this with relative path
var wordList = text.split("\n");

var dictionary = {};

for(var i = 0; i < wordList.length; i++)
  dictionary[wordList[i]] = true;

exports.isAWord = function (word) {
  if (word.length > 2) {
    return dictionary[word] ? true : false;
  } else {
    return false
  }
}
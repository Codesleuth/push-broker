var randomNumber = function (min, max) {
  min = min || 0;
  max = max || Number.MAX_VALUE - 1;
  return Math.random() * (max - min + 1) + min;
}

var randomInteger = function (min, max) {
  min = min || 0;
  max = max || 4294967296;
  return Math.floor(randomNumber(min, max));
}

var randomBoolean = function () {
  return randomInteger(0, 1) === 1;
}

var randomCharacter = function (min, max) {
  min = min || 'a';
  max = max || 'z';
  var n = randomInteger(min.charCodeAt(0), max.charCodeAt(0));
  return String.fromCharCode(n);
}

var randomString = function (length, min, max) {
  length = length || 50;
  var result = "";
  for (var i = 0; i < length; i++) {
    result += randomCharacter(min, max);
  };
  return result;
}

module.exports = {
  number: randomNumber,
  integer: randomInteger,
  character: randomCharacter,
  string: randomString,
  boolean: randomBoolean
};
const Node = require('./Node');
const Types = require('./Types');

module.exports = class Support extends Node {

  constructor () {
    super();
  }

  get type () {
    return Types.Support;
  }
}
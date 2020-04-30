const Node = require('./Node');
const Types = require('./Types');

module.exports = class AntNode extends Node {
  constructor (pixel) {
    super();

    this.data = undefined;
    this.color = undefined;
    if (Array.isArray(pixel)) {
      this.color = pixel;
    } else {
      this.data = pixel;
      if (typeof pixel === 'object' && pixel) {
        this.color = pixel.color;
      } else {
        throw new Error('A pixel was not truthy, or did not contain { color } information');
      }
    }

    // The node this ant is currently sitting on
    // This can be any type of node
    this.terrain = null;
  }

  get type () {
    return Types.Ant;
  }

  connect (other) {
    this.place(other);
    other.add(this);
  }
}

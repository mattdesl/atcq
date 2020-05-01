const Node = require('./Node');
const Types = require('./Types');

module.exports = class ClusterNode extends Node { // Children of support
  constructor (alpha, channels = 3) {
    super();
    this.alpha = alpha;
    // number of ants on this cluster
    this.size = 0;
    this.channels = channels;
    // RGB sum of all ants connected to this cluster
    this.colorSum = new Array(channels).fill(0);
    // current RGB color average
    this.color = this.colorSum.slice();
    // the sum of the similarities between each ant in this subtree 
    // and the color of this subtree when the ant was included in it
    this.error = 0;
  }

  get relativeError () {
    return (this.error / this.size) * this.alpha;
  }

  get type () {
    return Types.Cluster;
  }

  contribute (color, distance = 0) {
    this.size++;
    this.error += distance;
    for (let i = 0; i < this.colorSum.length; i++) {
      this.colorSum[i] += color[i];
      this.color[i] = this.colorSum[i] / this.size;
    }
  }

  consumeColor (otherCluster) {
    this.size++;
    for (let i = 0; i < this.colorSum.length; i++) {
      this.colorSum[i] += otherCluster.color[i];
      this.color[i] = this.colorSum[i] / this.size;
    }
  }
}

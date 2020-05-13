const Types = require('./lib/Types');
const AntNode = require('./lib/AntNode');
const ClusterNode = require('./lib/ClusterNode');
const SupportNode = require('./lib/SupportNode');
const util = require('./lib/util');
const { getMinimumSpanningTree, getDisjointedSubsets } = require('./lib/mst');

// Core API
module.exports = ATCQ;

// Simple sync API
module.exports.quantizeSync = quantizeSync;
function quantizeSync (pixels, opt = {}) {
  const atcq = ATCQ(opt);
  atcq.addData(pixels);
  atcq.quantizeSync();
  return atcq.getPalette();
}

// Simple async API
module.exports.quantizeAsync = quantizeAsync;
async function quantizeAsync (pixels, opt = {}) {
  const atcq = ATCQ(opt);
  atcq.addData(pixels);
  await atcq.quantizeAsync();
  return atcq.getPalette();
}

module.exports.SupportNode = SupportNode;
module.exports.ClusterNode = ClusterNode;
module.exports.AntNode = AntNode;
module.exports.NodeType = Types;

// Not exposed atm...
// module.exports.getMinimumSpanningTree = getMinimumSpanningTree;
// module.exports.getDisjointedSubsets = getDisjointedSubsets;

// Utilities
module.exports.traverse = util.traverse;
module.exports.traverseDepthFirst = util.traverseDepthFirst;
module.exports.traverseBreadthFirst = util.traverseBreadthFirst;
module.exports.detachTree = util.detachTree;
module.exports.findCluster = util.findCluster;

function ATCQ (opt = {}) {
  const maxColors = opt.maxColors != null ? opt.maxColors : 32;
  const nodeChildLimit = opt.nodeChildLimit != null ? opt.nodeChildLimit : Math.max(2, maxColors);
  const distanceFunc = opt.distance || util.distanceSquared;
  const disconnects = Boolean(opt.disconnects);
  const alpha = opt.alpha != null ? opt.alpha : 0.25;
  const minDistance = opt.minDistance != null && isFinite(opt.minDistance) ? opt.minDistance : -Infinity;
  const random = opt.random != null ? opt.random : (() => Math.random());
  const maxIterations = opt.maxIterations != null && isFinite(opt.maxIterations) ? opt.maxIterations : 1;

  const processed = opt.processed || (() => {});
  const progress = opt.progress || (() => {});
  const step = opt.step || (() => {});
  
  const dimensions = opt.dimensions != null ? opt.dimensions : 3;
  const progressInterval = opt.progressInterval != null ? opt.progressInterval : 0.2;
  const windowSize = opt.windowSize || null;

  if (maxIterations < 1) throw new Error('maxIterations must be > 0');
  if (nodeChildLimit < 2) throw new Error('Invalid child limit: must be >= 2');
  if (maxColors < 1) throw new Error('Invalid max colors, must be > 0');

  const rootNode = new SupportNode();
  const ants = [];

  let started = false;
  let finished = false;
  let lastProgress = 0;
  let antIndex = 0;
  let iterations = 0;

  return {
    get ants () {
      return ants;
    },
    get finished () {
      return finished;
    },
    get started () {
      return started;
    },
    getClusters () {
      return [ ...rootNode.children ];
    },
    countAntsMoving,
    countProgress,
    addData,
    addPixels,
    addPixels1D,
    addPixel,
    step: stepOnce,
    restart,
    clear,
    finish,
    quantizeSync,
    quantizeAsync,
    getPalette,
    getWeightedPalette,
    getDisparateClusters
  }

  function countAntsMoving () {
    let moving = 0;
    ants.forEach(ant => {
      if (ant.moving) moving++;
    });
    return moving;
  }

  function countProgress () {
    return _computeProgress(countAntsMoving());
  }

  function quantizeSync () {
    while (!finished) {
      stepOnce();
    }
  }

  function quantizeAsync (opt = {}) {
    if (finished) return Promise.resolve();
    const { interval = 1 } = opt;
    return new Promise((resolve) => {
      let handle = setInterval(() => {
        stepOnce();
        if (finished) {
          clearInterval(handle);
          resolve();
          return;
        }
      }, interval);
    });
  }

  function clear () {
    restart();
    ants.length = 0;
  }

  function restart () {
    antIndex = 0;
    lastProgress = 0;
    started = false;
    util.detachTree(rootNode);
    finished = false;
  }

  function nextIteration () {
    ants.forEach(ant => {
      ant.disconnect();
      ant.lift();
      // mark as not-yet-disconnected
      ant.hasDisconnected = false;
    });
  }

  function addData (obj) {
    if (Array.isArray(obj)) {
      // got an array
      if (obj.length === 0 || Array.isArray(obj[0]) || (typeof obj[0] === 'object' && obj[0])) {
        // got nested pixel array
        addPixels(obj);
      } else if (typeof obj[0] === 'number') {
        // got flat array
        addPixels1D(obj);
      } else {
        throw new Error('Expected arrays to be in the form [ r1, g1, b1, ... ] or [ pixel0, pixel1, ... ]');
      }
    } else if (obj && obj.byteLength != null) {
      // got a Buffer or typed array
      addPixels1D(obj);
    } else if (obj && obj.data != null) {
      // got an image data object
      addPixels1D(obj.data);
    } else {
      throw new Error('Unexpected type for addData()');
    }
  }

  function addPixels1D (array, stride = 4, channels = 3) {
    if (array.length % stride !== 0) {
      throw new Error('Flat 1D array has a stride that does not divide the length evenly');
    }
    for (let i = 0; i < array.length / stride; i++) {
      const pixel = [];
      for (let j = 0; j < channels; j++) {
        const d = array[i * stride + j];
        pixel.push(d);
      }
      addPixel(pixel);
    }
  }

  function addPixels (pixels) {
    if (typeof pixels[0] === 'number') {
      throw new Error('It looks like you are providing data as a flat RGBA array, you need to first split them into pixels, or use addPixels1D');
    }
    pixels.forEach(data => addPixel(data));
  }

  function addPixel (data) {
    // create a new ant
    const ant = new AntNode(data);

    // Move them to the root node initially
    ant.place(rootNode);

    // append to array
    ants.push(ant);
  }

  function stepOnce () {
    // algorithm is done, skip
    if (finished) return;
    if (!started) {
      started = true;
    }

    let antCount = 0;
    const curWindowSize = windowSize != null && isFinite(windowSize) ? windowSize : ants.length;
    const antsPerStep = Math.min(ants.length, curWindowSize);

    // Go through as many ants as we can using our sliding window
    for (let c = 0; c < antsPerStep; c++) {
      const nextAnt = ants[(c + antIndex) % ants.length];
      antCount++;
      // if the ant is moving, i.e. not in the graph yet
      if (nextAnt.moving) {
        // we got at least one, not yet done iterating
        if (!nextAnt.terrain || nextAnt.terrain === rootNode) {
          // Ant is on the support node, create a new cluster if we can
          supportCase(nextAnt);
        } else {
          // Ant is child of a cluster or another ant
          if (disconnects) {
            // run disconnect algorithm
            notSupportCase(nextAnt);
          } else {
            const otherNode = nextAnt.terrain;
            // run simpler non-disconnect algorithm
            nextAnt.place(otherNode);
            otherNode.add(nextAnt);
          }
        }
      }
      // an event each time an ant is processed
      processed(nextAnt);
    }
    antIndex += antCount;
    if (antIndex >= ants.length) {
      antIndex = antIndex % ants.length;
    }

    step();

    const remaining = countAntsMoving();
    const newProgress = _computeProgress(remaining);
    let reportProgress = true;

    if (remaining <= 0) {
      iterations++;
      if (iterations < maxIterations) {
        nextIteration();
      } else {
        reportProgress = false;
        finish();
        progress(1);
      }
    }
    
    if (reportProgress) {
      if (Math.abs(newProgress - lastProgress) >= progressInterval) {
        lastProgress = newProgress;
        progress(newProgress);
      }
    }
  }

  function finish () {
    finished = true;
  }

  function supportCase (ant) {
    let createCluster = false;
    if (rootNode.childCount === 0) {
      createCluster = true;
    } else {
      // Some clusters exist, find best candidate
      const { cluster, distance } = util.findMostSimilarCluster(rootNode, ant, distanceFunc);
      const T = cluster.relativeError;
      let allowCreation = distance > minDistance;
      if (allowCreation && distance < T && rootNode.childCount < maxColors) {
        createCluster = true;
      } else {
        // Move ant toward child of cluster without linking
        ant.place(cluster);
        cluster.contribute(ant.color, distance);
      }
    }

    if (createCluster) {
      // No clusters yet in tree
      // Create a new cluster
      const cluster = new ClusterNode(alpha, dimensions);
      // add the cluster to the tree
      rootNode.add(cluster);
      // place the ant on the cluster
      ant.place(cluster);
      // add the ant to the cluster
      cluster.add(ant);
      // contribute ant to cluster
      cluster.contribute(ant.color);
    }
  }

  function notSupportCase (ant) {
    const otherNode = ant.terrain;
    if (!otherNode) throw new Error('Ant terrain is null');

    const children = [ ...otherNode.children ];
    if (children.length === 0) {
      // the node has no children, i.e. no ants connected
      // to it, so we add this ant
      ant.place(otherNode);
      otherNode.add(ant);
    } else if (children.length === 2 && !children[1].hasDisconnected) {
      const second = children[1];
      util.detachTree(second);
      ant.place(otherNode);
      otherNode.add(ant);
    } else {
      const cluster = util.findCluster(ant);
      if (!cluster) {
        // Ant is free-roaming, i.e. it was on a tree that got killed
        // Move this ant back to support as with all its descendents
        util.detachTree(ant);
        return;
      }

      const a0 = children[Math.floor(random() * children.length)];
      const T = cluster.relativeError;
      const dist = distanceFunc(ant.color, a0.color);

      // Note: We diverge from the original ATCQ algorithm here
      // to better support images with, for example, all black pixels
      // where the distance === T.
      if (dist <= T && children.length < nodeChildLimit) {
        ant.place(otherNode);
        otherNode.add(ant);
      } else {
        ant.place(a0);
      }
    }
  }

  function getDisparateClusters (targetColors, opt = {}) {
    let clusters = [ ...rootNode.children ];
    if (targetColors == null) return clusters;
    if (targetColors < 0) throw new Error('Expected targetColors to be > 0');

    if (clusters.length <= targetColors) {
      return clusters;
    }

    const {
      maxIterations = Infinity,
    } = opt;

    const distCluster = (a, b) => distanceFunc(a.color, b.color);

    let iterations = 0;
    let results = [];
    while (clusters.length > targetColors && iterations++ < maxIterations) {
      const links = getMinimumSpanningTree(clusters, distCluster, opt);
      links.sort((a, b) => b.distance - a.distance);

      while (links.length > 0 && clusters.length > targetColors) {
        // trim away the smallest pair, i.e. most similar color links
        const link = links.pop();
        const { from: clusterA, to: clusterB } = link;
        const clusterASmaller = clusterA.size < clusterB.size;
        const clusterToKill = clusterASmaller ? clusterA : clusterB;
        const clusterToSave = clusterASmaller ? clusterB : clusterA;

        const idx = clusters.indexOf(clusterToKill);
        if (idx !== -1) {
          // Haven't yet killed this one, so merge it into save cluster
          clusters.splice(idx, 1);
        }
      }
    }
    return clusters;
  }

  function getWeightedPalette (n) {
    let clusters = [ ...rootNode.children ];
    if (n != null && n > 0) {
      clusters = getDisparateClusters(n);
    }
    const totalSize = clusters.reduce((sum, a) => sum + a.size, 0);
    return clusters.map(cluster => {
      return {
        color: cluster.color,
        weight: cluster.size / totalSize
      };
    }).sort((a, b) => b.weight - a.weight);
  }

  function getPalette (n) {
    const clusters = getWeightedPalette(n);
    return clusters.map(n => n.color);
  }

  function _computeProgress (nLenMoving) {
    return (1 - nLenMoving / ants.length) * (1 / maxIterations) + iterations / maxIterations;
  }
}

const Types = require('./Types');

module.exports.traverse = traverseDepthFirst;
module.exports.traverseDepthFirst = traverseDepthFirst;
function traverseDepthFirst (root, cb) {
  const stack = [ root ];
  while (stack.length > 0) {
    const node = stack.shift();
    const ret = cb(node, root);
    if (ret === false) return;
    const children = [ ...node.children ];
    if (children.length > 0) {
      stack.unshift(...children);
    }
  }
}

module.exports.traverseBreadthFirst = traverseBreadthFirst;
function traverseBreadthFirst (root, cb) {
  const stack = [ root ];
  while (stack.length > 0) {
    const node = stack.shift();
    const ret = cb(node, root);
    if (ret === false) return;
    const children = [ ...node.children ];
    if (children.length > 0) {
      stack.push(...children);
    }
  }
}

// Take a node (typically ant) that is on some
// terrain, and may or may not be connected to it
// Then walk up the terrain until we find a cluster
module.exports.findCluster = findCluster;
function findCluster (node) {
  let original = node;
  while (node) {
    if (node.type === Types.Cluster) return node;
    if (node.terrain === node) {
      // should never happen, avoid infinite loop
      throw new Error('findCluster reached a node terrain that references itself');
    }
    if (!node.terrain) {
      // Node is a support, or is on the support
      return null;
    }
    node = node.terrain;
  }
  return null;
}

module.exports.detachTree = detachTree;
function detachTree (node, newTerrain = null) {
  const nodes = [];
  traverseDepthFirst(node, n => {
    nodes.push(n);
  });
  nodes.forEach(n => {
    n.disconnect();
    n.lift();
    if (n.type === Types.Ant) n.place(newTerrain);
  });
}

module.exports.distanceSquared = distanceSquared;
function distanceSquared (a, b) {
  const [ r1, g1, b1 ] = a;
  const [ r2, g2, b2 ] = b;
  const dr = r2 - r1;
  const dg = g2 - g1;
  const db = b2 - b1;
  return dr * dr + dg * dg + db * db;
}

module.exports.distance = distance;
function distance (a, b) {
  return Math.sqrt(distanceSquared(a, b));
}

module.exports.findMostSimilarCluster = findMostSimilarCluster;
function findMostSimilarCluster (rootNode, node, distanceFunc) {
  let minDist = Infinity;
  let candidate;
  rootNode.children.forEach(cluster => {
    if (cluster !== node) {
      const dist = distanceFunc(node.color, cluster.color);
      if (dist < minDist) {
        minDist = dist;
        candidate = cluster;
      }
    }
  });
  return {
    cluster: candidate,
    distance: minDist
  };
}
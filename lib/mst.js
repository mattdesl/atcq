const disjointSet = require('disjoint-set');

module.exports.getMinimumSpanningTree = getMinimumSpanningTree;
function getMinimumSpanningTree (items, distFunc, opt = {}) {
  const {
    maxSteps = Infinity
  } = opt;
  if (items.length <= 1) return [];
  let indices = new Map();
  items.forEach((c, i) => {
    indices.set(c, i);
  });
  let connected = new Set(items.slice(0, 1));
  let remaining = new Set(items.slice(1));
  let connections = new Map();
  let steps = 0;
  let results = [];
  while (remaining.size != 0 && steps++ < maxSteps) {
    const result = findWithDistance(connected, remaining, distFunc);
    if (!result || !isFinite(result.distance)) continue;

    const {
      from,
      to,
      distance
    } = result;

    let keys = [ indices.get(from), indices.get(to) ];
    const indexList = keys.slice();
    keys.sort();
    const key = keys.join(':');
    if (!connections.has(key)) {
      connections.set(key, true);
      results.push({ ...result, indices: indexList, key });
      connected.add(to);
      remaining.delete(to);
    }
  }
  return results;
}

function findWithDistance (connected, remaining, distanceFn) {
  let minDist = Infinity;
  let from, candidate;
  for (let a of connected) {
    for (let b of remaining) {
      let dist = distanceFn(a, b);
      if (dist < minDist) {
        minDist = dist;
        from = a;
        candidate = b;
      }
    }
  }
  return { from, to: candidate, distance: minDist };
}

module.exports.getDisjointedSubsets = getDisjointedSubsets;
function getDisjointedSubsets (items, distFunc, k, opt = {}) {
  if (k < 1) throw new Error('k must be 1 or greater');
  if (items.length <= 0) return { connections: [], subsets: [] };
  let connections = getMinimumSpanningTree(items, distFunc, opt);

  connections = connections.slice();
  if (opt.maxDistance != null) {
    connections = connections.filter(c => c.distance < opt.maxDistance);
  }
  connections.sort((a, b) => a.distance - b.distance);
  if (k === 1) return { connections, subsets: [ items ] };

  let clusters = null;
  while (connections.length > 2) {
    let newConnections = connections.slice();
    newConnections.pop();

    const set = disjointSet();
    items.forEach(v => set.add(v));
    newConnections.forEach(({ from, to }) => {
      set.union(from, to);
    });
    const newClusters = set.extract()
    set.destroy();

    const oldClusters = clusters;
    if (clusters == null) {
      clusters = newClusters;
    } else {
      if (newClusters.length > k || (oldClusters && newClusters.length < oldClusters.length)) {
        // use old cluster
        break;
      } else {
        // use new cluster
        clusters = newClusters;
      }
    }

    connections = newConnections;
    clusters = newClusters;

    if (clusters.length >= k) break;
  }
  return { connections, subsets: clusters };
}

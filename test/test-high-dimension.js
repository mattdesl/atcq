const { promisify } = require('util');
const getPixels = promisify(require('get-pixels'));
const ATCQ = require('../atcq');
const Color = require('canvas-sketch-util/color')
const path = require('path');

function distanceSquared (p0, p1) {
  const a = p0;
  const b = p1;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const dx = a[i] - b[i];
    sum += dx * dx;
  }
  return sum;
}

(async () => {
  // load your image data as RGBA array
  const palettes = [
    { name: 'ant 1', palette: [ [ 255, 0, 0 ], [ 50, 255, 0 ], [ 30, 128, 0 ] ] },
    { name: 'ant 2 A', palette: [ [ 255, 128, 0 ], [ 0, 55, 20 ], [ 0, 50, 100 ] ] },
    { name: 'ant 2 B', palette: [ [ 250, 120, 0 ], [ 0, 50, 10 ], [ 0, 40, 90 ] ] },
    { name: 'ant 3 A', palette: [ [ 50, 15, 100 ], [ 100, 15, 0 ], [ 20, 150, 50 ] ] },
    { name: 'ant 3 B', palette: [ [ 49, 14, 100 ], [ 100, 5, 0 ], [ 25, 140, 50 ] ] },
    { name: 'ant 3 C', palette: [ [ 51, 10, 100 ], [ 100, 4, 0 ], [ 20, 145, 50 ] ] }
  ];
  const size = palettes.length;
  const colors = palettes.map(p => {
    return {
      ...p,
      color: p.palette.flat(Infinity)
    }
  });
  console.log(colors[0])
  const data = new Array(size * size).fill(0).map((_, i) => {
    return colors[i % colors.length];
  });
  console.log('Quantizing...');

  console.log('Dimensions', colors[0].color.length)
  const maxColors = 3;
  const atcq = ATCQ({
    maxColors,
    alpha: 0.95,
    maxIterations: 7,
    dimensions: colors[0].color.length,
    distance: distanceSquared,
    progress (t) {
      console.log(`Progress: ${Math.floor(t * 100)}%`);
    }
  });
  atcq.addData(data);
  await atcq.quantizeAsync();

  const palette = atcq.getWeightedPalette();

  // Convert resulting RGB floats to hex code
  console.log('Finished quantizing:');
  console.log(palette);

  const clusters = atcq.getClusters();
  clusters.sort((a, b) => b.size - a.size);
  clusters.forEach((cluster, i) => {
    console.log(`cluster ${i} -------`)
    ATCQ.traverse(cluster, node => {
      if (node.type === ATCQ.NodeType.Ant) {
        console.log(node.data.name)
      }
    })
  })
})();

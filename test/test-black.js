const { promisify } = require('util');
const getPixels = promisify(require('get-pixels'));
const ATCQ = require('../atcq');
const Color = require('canvas-sketch-util/color')
const path = require('path');

(async () => {
  // load your image data as RGBA array
  const size = 128;
  const colors = [
    [ 0, 0, 0 ],
    [ 0, 255, 0 ],
    [ 0, 0, 255 ],
    [ 255, 0, 0 ]
  ]
  const data = new Array(size * size).fill(0).map((_, i) => {
    return colors[i % colors.length];
  });
  console.log('Quantizing...');

  const maxColors = 4;
  const atcq = ATCQ({
    maxColors,
    alpha: 0.95,
    maxIterations: 7,
    progress (t) {
      console.log(`Progress: ${Math.floor(t * 100)}%`);
    }
  });
  atcq.addData(data);
  await atcq.quantizeAsync();

  const palette = atcq.getWeightedPalette()
    .map(p => {
      // convert to hex
      return {
        ...p,
        color: Color.parse(p.color).hex
      };
    });

  // Convert resulting RGB floats to hex code
  console.log('Finished quantizing:');
  console.log(palette);
})();

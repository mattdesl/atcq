const { promisify } = require('util');
const getPixels = promisify(require('get-pixels'));
const ATCQ = require('../atcq');
const Color = require('canvas-sketch-util/color')

const file = process.argv[2];
if (!file) throw new Error('Must supply filename; e.g. node extract image.png');

(async () => {
  // load your image data as RGBA array
  const { data } = await getPixels(file);

  console.log('Quantizing...');

  const maxColors = 32;
  const targetColors = 5;
  const atcq = ATCQ({
    maxColors,
    disconnects: false,
    maxIterations: 5,
    progress (t) {
      console.log(`Progress: ${Math.floor(t * 100)}%`);
    }
  });
  atcq.addData(data);
  await atcq.quantizeAsync();

  const palette = atcq.getWeightedPalette(targetColors)
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

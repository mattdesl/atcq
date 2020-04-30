const canvasSketch = require('canvas-sketch');
const load = require('load-asset');
const getPixels = require('get-image-pixels');
const Color = require('canvas-sketch-util/color');
const ATCQ = require('../atcq');
const quantizeSimple = require('quantize');
const colorSpace = require('color-space')
const { lab2rgb, rgb2lab } = require('./util/lab');
const cie94 = require('./util/cie94');
const cie2000 = require('./util/cie2000');

const settings = {
  dimensions: [ 2048, 2048 ]
};

const sketch = async ({ render }) => {
  const maxColors = 32;
  const targetColors = 6;
  const useLab = true;
  const distanceFunc = useLab ? cie2000 : undefined;

  let atcq = ATCQ({
    maxColors,
    distance: distanceFunc,
    // nodeChildLimit: 2,
    step() { render(); },
    errorSigma: 0.5
  });

  let image, palette, simplePalette, simpleTargetPalette0, simpleTargetPalette1;

  async function quantize (src) {
    image = await load(src);
    render(); // after image is loaded, draw it

    atcq.clear();

    let rgba = getPixels(image);
    let inputData = useLab ? convertRGBAToLab(rgba) : rgba;
    atcq.addData(inputData);
    render();
    console.log('Quantizing...');
    await atcq.quantizeAsync();
    console.log('Done');
    render();
  }

  quantize('demo/baboon.png');

  return (props) => {
    const { width, height, context } = props;

    context.fillStyle = 'white';
    context.fillRect(0, 0, width, height);

    if (image) context.drawImage(image, 0, 0, width, height);

    const clusterTypes = [
      atcq.getClusters().sort((a, b) => b.size - a.size),
      atcq.getMinimumClusters(targetColors).sort((a, b) => b.size - a.size)
    ];

    const paletteSize = 100;
    clusterTypes.forEach((c, i) => {
      if (c && c.length > 0) {
        drawAdaptivePalette(c, {
          ...props, y: paletteSize * i, height: paletteSize
        });
      }
    });
  };

  function drawAdaptivePalette (clusters, props) {
    const { width, height, context } = props;

    if (clusters.length <= 0) return;

    const minDist = clusters.reduce((min, a) => Math.min(min, a.size), Infinity);
    const maxDist = clusters.reduce((max, a) => Math.max(max, a.size), -Infinity);
    const totalSize = clusters.reduce((sum, a) => sum + a.size, 0);
    let { x = 0, y = 0 } = props;

    clusters.forEach((cluster, i, list) => {
      const xyzData = cluster.color;
      const rgb = useLab ? lab2rgb(xyzData) : xyzData;
      // const err = `${(cluster.relativeError * 1000).toFixed(1)}`;
      let w = Math.round(cluster.size / totalSize * width);
      if (i === list.length - 1) {
        w = width - x;
      }
      let h = height;
      context.fillStyle = Color.parse({ rgb }).hex;
      context.fillRect(
        x,
        y,
        w,
        h
      );
      x += w;
    });
  }
};

canvasSketch(sketch, settings);

function convertRGBAToLab (array) {
  const pixels = [];
  const channels = 3;
  const stride = 4;
  for (let i = 0; i < array.length / stride; i++) {
    const pixel = [];
    for (let j = 0; j < channels; j++) {
      const d = array[i * stride + j];
      pixel.push(d);
    }
    pixels.push(rgb2lab(pixel));
  }
  return pixels;
}

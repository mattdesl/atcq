const canvasSketch = require('canvas-sketch');
const load = require('load-asset');
const getPixels = require('get-image-pixels');
const Color = require('canvas-sketch-util/color');
const ATCQ = require('../');
const { getDisjointedSubsets } = require('../lib/mst');
const colorSpace = require('color-space')
const { lab2rgb, rgb2lab } = require('./util/lab');
const cie94 = require('./util/cie94');
const cie2000 = require('./util/cie2000');
const imageQ = require

const settings = {
  dimensions: [ 2048, 2048 ]
};

const sketch = async ({ render, update }) => {
  const maxColors = 32;
  const targetColors = 6;
  const useLab = true;
  const distanceFunc = useLab ? cie94.textiles : undefined;
  const paletteSize = 20;
  const paletteTypes = [
    maxColors,
    targetColors
  ];

  let atcq = ATCQ({
    maxColors,
    disconnects: true,
    distance: distanceFunc,
    // windowSize: 1024 * 10,
    // nodeChildLimit: 2,
    step() { render(); },
    errorSigma: 0.25
  });

  let image, palette, simplePalette, simpleTargetPalette0, simpleTargetPalette1;

  async function quantize (src) {
    image = await load(src);
    update({
      dimensions: [
        image.width,
        image.height + paletteTypes.length * paletteSize
      ]
    });
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

  const f = 'baboon.png';
  quantize(`demo/${f}`);

  return (props) => {
    const { width, height, context } = props;

    context.fillStyle = 'white';
    context.fillRect(0, 0, width, height);

    if (image) context.drawImage(image, 0, 0, image.width, image.height);

    paletteTypes.map(t => atcq.getWeightedPalette(t)).forEach((c, i) => {
      if (c && c.length > 0) {
        drawPalette(c, {
          ...props,
          y: height - paletteTypes.length * paletteSize + i * paletteSize,
          height: paletteSize
        });
      }
    });
  };

  // function getDisjointedClusters () {
  //   const dist = (a, b) => distanceFunc(a.color, b.color);
  //   const result = getDisjointedSubsets(atcq.getClusters(), dist, targetColors)
  //   const { subsets } = result;
  //   return subsets.map(group => {
  //     if (group.length <= 0) return [];
  //     if (group.length === 1) return group[0];
  //     group.sort((a, b) => b.size - a.size);
  //     const sum = {
  //       size: 0,
  //       color: [ 0, 0, 0 ]
  //     };
  //     const count = group.length;
  //     group.reduce((sum, g) => {
  //       sum.size += g.size;
  //       for (let i = 0; i < sum.color.length; i++) {
  //         sum.color[i] += g.color[i];
  //       }
  //       return sum;
  //     }, sum);
  //     sum.color = sum.color.map(n => n / count);
  //     sum.size /= count;
  //     return sum;
  //   })
  // }

  function drawPalette (palette, props) {
    const { width, height, context, adaptive = true } = props;

    if (palette.length <= 0) return;

    let { x = 0, y = 0 } = props;

    palette.forEach((cluster, i, list) => {
      const xyzData = cluster.color;
      const rgb = useLab ? lab2rgb(xyzData) : xyzData;
      let w = adaptive
        ? Math.round(cluster.weight * width)
        : Math.round(1 / palette.length * width);
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

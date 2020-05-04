const canvasSketch = require('canvas-sketch');
const load = require('load-asset');
const getPixels = require('get-image-pixels');
const Color = require('canvas-sketch-util/color');
const ATCQ = require('../');
const { getDisjointedSubsets } = require('../lib/mst');
const colorSpace = require('color-space')
const { lab2rgb, rgb2lab } = require('./util/lab');
const ImageQ = require('image-q');
const cie94 = require('./util/cie94');
const cie2000 = require('./util/cie2000');

const settings = {
  dimensions: [ 256, 100 ]
};

const sketch = async ({ render, update, height }) => {
  const maxColors = 6;
  const targetColors = 6;
  const useLab = true;
  const sortResult = false;
  const adaptive = true;
  const atcqDistFuncs = {
    euclidean: undefined,
    'cie94-textiles': cie94.textiles,
    'ciede2000': cie2000
  };

  const colorDistanceFormula = 'ciede2000';
  const distanceFunc = useLab ? atcqDistFuncs[colorDistanceFormula] : undefined;
  const paletteOnly = true;
  const paletteSize = height;
  const mainPalette = targetColors;
  const mode = 'atcq';
  // used by image-q
  const paletteQuantization = 'wuquant';

  const paletteTypes = paletteOnly ? [ mainPalette ] : [
    maxColors,
    targetColors
  ];

  const alpha = 0.9;
  const disconnects = false;
  let atcq = ATCQ({
    maxColors,
    disconnects,
    maxIterations: 100,
    distance: distanceFunc,
    // windowSize: 1024 * 10,
    // nodeChildLimit: 2,
    progress (p) { console.log(Math.floor(p * 100)); },
    step() { render(); },
    alpha
  });

  let image, palette;

  async function quantize (src) {
    image = await load(src);
    if (!paletteOnly) {
      update({
        dimensions: [
          image.width,
          image.height + paletteTypes.length * paletteSize
        ]
      });
    }

    atcq.clear();

    let rgba = getPixels(image);

    if (mode === 'atcq') {
      let inputData = useLab ? convertRGBAToLab(rgba) : rgba;
      atcq.addData(inputData);
      update({
        suffix: [
          'atcq',
          useLab ? 'lab' : 'rgb',
          useLab ? colorDistanceFormula : 'euclidean',
          `a${alpha}`,
          disconnects ? 'disconnects' : 'no-disconnects',
          `max${maxColors}`,
          `q${mainPalette}`
        ].join('-')
      })
      render();
      console.log('Quantizing...');
      await atcq.quantizeAsync();
      console.log('Done');
      render();
    } else {
      const pc = ImageQ.utils.PointContainer.fromUint8Array(rgba, image.width, image.height);
      console.log('Quantizing...');
      const p = await ImageQ.buildPalette([pc], {
        // colorDistanceFormula,
        paletteQuantization,
        colors: mainPalette
      });
      palette = p.getPointContainer().getPointArray().map(p => ([ p.r, p.g, p.b ]));
      console.log('Done');
      update({
        suffix: [
          paletteQuantization,
          colorDistanceFormula,
          `q${mainPalette}`
        ].join('-')
      })
      render();
    }
  }

  const f = 'baboon.png';
  quantize(`demo/${f}`);

  return (props) => {
    const { width, height, context } = props;

    context.fillStyle = 'white';
    context.fillRect(0, 0, width, height);

    if (image && !paletteOnly) context.drawImage(image, 0, 0, image.width, image.height);

    if (mode === 'atcq') {
      paletteTypes.map(t => atcq.getWeightedPalette(t)).forEach((c, i) => {
        if (c && c.length > 0) {
          drawPalette(c, {
            ...props,
            adaptive,
            y: height - paletteTypes.length * paletteSize + i * paletteSize,
            height: paletteSize
          });
        }
      });
    } else {
      if (palette) {
        const c = palette.map(p => {
          return { weight: 1 / palette.length, color: p };
        });
        drawPalette(c, {
          ...props,
          adaptive,
          y: height - paletteSize,
          height: paletteSize
        });
      }
    }
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
    palette = palette.slice();
    if (useLab && mode === 'atcq') {
      palette = palette.map(p => {
        return {
          ...p,
          color: lab2rgb(p.color)
        };
      });
    }
    if (sortResult) {
      palette.sort((ca, cb) => {
        const a = ca.color;
        const b = cb.color;
        const len0 = a[0] * a[0] + a[1] * a[1] + a[2] * a[2];
        const len1 = b[0] * b[0] + b[1] * b[1] + b[2] * b[2];
        return len1 - len0;
      });
    }

    let { x = 0, y = 0 } = props;

    palette.forEach((cluster, i, list) => {
      const rgb = cluster.color;
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

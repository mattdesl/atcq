# atcq

[![experimental](http://badges.github.io/stability-badges/dist/experimental.svg)](http://github.com/badges/stability-badges)

An implementation of Ant-Tree Color Quantization (ATCQ), described by Pérez-Delgado in various papers including: [[1]](https://ieeexplore.ieee.org/document/8815696), [[2]](https://www.sciencedirect.com/science/article/abs/pii/S1568494615005086).

This library is not yet fully documented or tested but you can see some examples below:

## Simple Example

```js
const ATCQ = require('atcq');

const pixels = /* ... rgb pixels ... */
const palette = ATCQ.quantizeSync(pixels, {
  maxColors: 32
});

// array of 32 quantized RGB colors
console.log(palette);
```

Here `pixels` can be a flat RGBA array, an array of `[ r, g, b ]` pixels, or an ImageData object.

## Async Example

Or, an async example, that uses an interval to reduce blocking the thread:

```js
const ATCQ = require('atcq');

(async () => {
  const pixels = /* ... rgb pixels ... */
  const palette = await ATCQ.quantizeAsync(pixels, {
    maxColors: 32,
    // Max number of pixels to process in a single step
    windowSize: 1024 * 50
  });
})();


// array of 32 quantized RGB colors
console.log(palette);
```

## Weighted Palettes

A more advanced example, producing a weighted palette and a further reduced 'disparate' palette.

```js
const actq = ATCQ({
  maxColors: 32,
  progress: (p) => console.log('Progress:', p)
});

// add data into system
actq.addData(pixels);

(async () => {
  // run quantizer
  // while its running you can visualize the palettes etc...
  await actq.quantizeAsync();

  const palette = actq.getWeightedPalette();

  console.log(palette[0]);
  // { color: [ r, g, b ], weight: N }

  // You can get a 'disparate' palette like so:
  const minColors = 5;
  const bestColors = actq.getWeightedPalette(minColors);
})();
```

## License

MIT, see [LICENSE.md](http://github.com/mattdesl/atcq/blob/master/LICENSE.md) for details.

// All taken from https://github.com/ibezkrovnyi/image-quantization

const refX = 0.95047; // ref_X =  95.047   Observer= 2°, Illuminant= D65
const refY = 1.0; // ref_Y = 100.000
const refZ = 1.08883; // ref_Z = 108.883

const LAB_MIN = [0,-100,-100];
const LAB_MAX = [100,100,100];

module.exports.lab2rgb = lab2rgb;
module.exports.rgb2lab = rgb2lab;
module.exports.xyz2lab = xyz2lab;
module.exports.lab2xyz = lab2xyz;
module.exports.xyz2rgb = xyz2rgb;

function rgb2lab(rgb) {
  rgb = rgb.map(n => inRange0to255Rounded(n));
  const xyz = rgb2xyz(rgb);
  return xyz2lab(xyz);
}

function lab2rgb(lab) {
  lab = lab.map((n, i) => {
    return Math.max(LAB_MIN[i], Math.min(LAB_MAX[i], n));
  });
  const xyz = lab2xyz(lab);
  return xyz2rgb(xyz);
}

function pivot_xyz2lab(n) {
  return n > 0.008856 ? Math.pow(n, (1 / 3)) : 7.787 * n + 16 / 116;
}

function xyz2lab([ x, y, z ]) {
  x = pivot_xyz2lab(x / refX);
  y = pivot_xyz2lab(y / refY);
  z = pivot_xyz2lab(z / refZ);

  if (116 * y - 16 < 0) throw new Error('Invalid input for XYZ');
  return [
    Math.max(0, 116 * y - 16),
    500 * (x - y),
    200 * (y - z),
  ];
}

function rgb2xyz([ r, g, b ]) {
  // gamma correction, see https://en.wikipedia.org/wiki/SRGB#The_reverse_transformation
  r = correctGamma_rgb2xyz(r / 255);
  g = correctGamma_rgb2xyz(g / 255);
  b = correctGamma_rgb2xyz(b / 255);

  // Observer. = 2°, Illuminant = D65
  return [
    r * 0.4124 + g * 0.3576 + b * 0.1805,
    r * 0.2126 + g * 0.7152 + b * 0.0722,
    r * 0.0193 + g * 0.1192 + b * 0.9505
  ];
}

function lab2xyz([ L, a, b ]) {
  const y = (L + 16) / 116;
  const x = a / 500 + y;
  const z = y - b / 200;

  return [
    refX * pivot_lab2xyz(x),
    refY * pivot_lab2xyz(y),
    refZ * pivot_lab2xyz(z)
  ];
}
function pivot_lab2xyz(n) {
  return n > 0.206893034 ? Math.pow(n, 3) : (n - 16 / 116) / 7.787;
}

function correctGamma_rgb2xyz(n) {
  return n > 0.04045 ? Math.pow(((n + 0.055) / 1.055), 2.4) : n / 12.92;
}

// // gamma correction, see https://en.wikipedia.org/wiki/SRGB#The_reverse_transformation
function correctGamma_xyz2rgb(n) {
  return n > 0.0031308 ? 1.055 * Math.pow(n, (1 / 2.4)) - 0.055 : 12.92 * n;
}

function xyz2rgb([x, y, z]) {
  // Observer. = 2°, Illuminant = D65
  const r = correctGamma_xyz2rgb(x * 3.2406 + y * -1.5372 + z * -0.4986);
  const g = correctGamma_xyz2rgb(x * -0.9689 + y * 1.8758 + z * 0.0415);
  const b = correctGamma_xyz2rgb(x * 0.0557 + y * -0.204 + z * 1.057);

  return [
    inRange0to255Rounded(r * 255),
    inRange0to255Rounded(g * 255),
    inRange0to255Rounded(b * 255)
  ];
}

function inRange0to255Rounded(n) {
  n = Math.round(n);
  if (n > 255) n = 255;
  else if (n < 0) n = 0;
  return n;
}

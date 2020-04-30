// All taken from https://github.com/ibezkrovnyi/image-quantization

const Textiles = [ 2.0, 0.048, 0.014, (0.25 * 50) / 255 ];
const GraphicArts = [ 1.0, 0.045, 0.015, (0.25 * 100) / 255 ];

const graphicArtsFunc = createCIE94(GraphicArts);
module.exports = graphicArtsFunc;
module.exports.createCIE94 = createCIE94;
module.exports.textiles = createCIE94(Textiles);
module.exports.graphicArts = graphicArtsFunc;

function createCIE94 (constants) {
  const [ _Kl, _K1, _K2, _kA ] = constants;
  const _whitePoint = [99.99999999999973, -0.002467729614430425, -0.013943706067887085];

  return (lab1, lab2) => {
    const dL = lab1[0] - lab2[0];
    const dA = lab1[1] - lab2[1];
    const dB = lab1[2] - lab2[2];
    const c1 = Math.sqrt(lab1[1] * lab1[1] + lab1[2] * lab1[2]);
    const c2 = Math.sqrt(lab2[1] * lab2[1] + lab2[2] * lab2[2]);
    const dC = c1 - c2;

    let deltaH = dA * dA + dB * dB - dC * dC;
    deltaH = deltaH < 0 ? 0 : Math.sqrt(deltaH);

    return Math.sqrt(
      Math.pow((dL / _Kl), 2) +
        Math.pow((dC / (1.0 + _K1 * c1)), 2) +
        Math.pow((deltaH / (1.0 + _K2 * c1)), 2)
    );
  }
}

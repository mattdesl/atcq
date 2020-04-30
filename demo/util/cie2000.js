// All taken from https://github.com/ibezkrovnyi/image-quantization

module.exports = distance;

function degrees2radians (n) {
  return n * (Math.PI / 180);
}

/**
 * Weight in distance: 0.25
 * Max DeltaE: 100
 * Max DeltaA: 255
 */
const _kA = (0.25 * 100) / 255;
const _pow25to7 = Math.pow(25, 7);
const _deg360InRad = degrees2radians(360);
const _deg180InRad = degrees2radians(180);
const _deg30InRad = degrees2radians(30);
const _deg6InRad = degrees2radians(6);
const _deg63InRad = degrees2radians(63);
const _deg275InRad = degrees2radians(275);
const _deg25InRad = degrees2radians(25);

function _calculatehp(b, ap) {
  const hp = Math.atan2(b, ap);
  if (hp >= 0) return hp;
  return hp + _deg360InRad;
}

function _calculateRT(ahp, aCp) {
  const aCp_to_7 = Math.pow(aCp, 7.0);
  const R_C = 2.0 * Math.sqrt(aCp_to_7 / (aCp_to_7 + _pow25to7)); // 25^7
  const delta_theta =
    _deg30InRad *
    Math.exp(
      -(Math.pow(((ahp - _deg275InRad) / _deg25InRad), 2.0)),
    );
  return -Math.sin(2.0 * delta_theta) * R_C;
}

function _calculateT(ahp) {
  return (
    1.0 -
    0.17 * Math.cos(ahp - _deg30InRad) +
    0.24 * Math.cos(ahp * 2.0) +
    0.32 * Math.cos(ahp * 3.0 + _deg6InRad) -
    0.2 * Math.cos(ahp * 4.0 - _deg63InRad)
  );
}

function _calculate_ahp(
  C1pC2p,
  h_bar,
  h1p,
  h2p
) {
  const hpSum = h1p + h2p;
  if (C1pC2p === 0) return hpSum;
  if (h_bar <= _deg180InRad) return hpSum / 2.0;
  if (hpSum < _deg360InRad) {
    return (hpSum + _deg360InRad) / 2.0;
  }
  return (hpSum - _deg360InRad) / 2.0;
}

function _calculate_dHp(
  C1pC2p,
  h_bar,
  h2p,
  h1p
) {
  let dhp;
  if (C1pC2p === 0) {
    dhp = 0;
  } else if (h_bar <= _deg180InRad) {
    dhp = h2p - h1p;
  } else if (h2p <= h1p) {
    dhp = h2p - h1p + _deg360InRad;
  } else {
    dhp = h2p - h1p - _deg360InRad;
  }
  return 2.0 * Math.sqrt(C1pC2p) * Math.sin(dhp / 2.0);
}

function distance (lab1, lab2) {
   // Get L,a,b values for color 1
   const L1 = lab1[0];
   const a1 = lab1[1];
   const b1 = lab1[2];

   // Get L,a,b values for color 2
   const L2 = lab2[0];
   const a2 = lab2[1];
   const b2 = lab2[2];

   // Calculate Cprime1, Cprime2, Cabbar
   const C1 = Math.sqrt(a1 * a1 + b1 * b1);
   const C2 = Math.sqrt(a2 * a2 + b2 * b2);
   const pow_a_C1_C2_to_7 = Math.pow(((C1 + C2) / 2.0), 7.0);

   const G =
     0.5 *
     (1.0 -
       Math.sqrt(pow_a_C1_C2_to_7 / (pow_a_C1_C2_to_7 + _pow25to7))); // 25^7
   const a1p = (1.0 + G) * a1;
   const a2p = (1.0 + G) * a2;

   const C1p = Math.sqrt(a1p * a1p + b1 * b1);
   const C2p = Math.sqrt(a2p * a2p + b2 * b2);
   const C1pC2p = C1p * C2p;

   // Angles in Degree.
   const h1p = _calculatehp(b1, a1p);
   const h2p = _calculatehp(b2, a2p);
   const h_bar = Math.abs(h1p - h2p);
   const dLp = L2 - L1;
   const dCp = C2p - C1p;
   const dHp = _calculate_dHp(C1pC2p, h_bar, h2p, h1p);
   const ahp = _calculate_ahp(C1pC2p, h_bar, h1p, h2p);

   const T = _calculateT(ahp);

   const aCp = (C1p + C2p) / 2.0;
   const aLp_minus_50_square = Math.pow(((L1 + L2) / 2.0 - 50.0), 2.0);
   const S_L =
     1.0 +
     (0.015 * aLp_minus_50_square) / Math.sqrt(20.0 + aLp_minus_50_square);
   const S_C = 1.0 + 0.045 * aCp;
   const S_H = 1.0 + 0.015 * T * aCp;

   const R_T = _calculateRT(ahp, aCp);

   const dLpSL = dLp / S_L; // S_L * kL, where kL is 1.0
   const dCpSC = dCp / S_C; // S_C * kC, where kC is 1.0
   const dHpSH = dHp / S_H; // S_H * kH, where kH is 1.0

   return Math.pow(dLpSL, 2) + Math.pow(dCpSC, 2) + Math.pow(dHpSH, 2) + R_T * dCpSC * dHpSH;
}
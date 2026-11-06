const esc = (s) =>
  String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]);
const hex2rgb = (h) => {
  h = String(h).trim();
  if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const light = (h) => {
  const [r, g, b] = hex2rgb(h);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
};
const mix = (a, b, t) => {
  const A = hex2rgb(a),
    B = hex2rgb(b);
  return (
    '#' +
    A.map((v, i) =>
      Math.round(v + (B[i] - v) * t)
        .toString(16)
        .padStart(2, '0'),
    ).join('')
  );
};
// true for white-ish colours (partner logos need a white plate on anything else)
const nearWhite = (h) => {
  const [r, g, b] = hex2rgb(h);
  return Math.min(r, g, b) > 235;
};

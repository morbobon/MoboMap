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
// WCAG contrast between two hex colours (non-hex values – patterns, 'none' – count as fine)
const isHex = (h) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(h).trim());
const relLum = (h) => {
  const [r, g, b] = hex2rgb(h).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  if (!isHex(a) || !isHex(b)) return 21;
  const x = relLum(a),
    y = relLum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
// First candidate whose contrast reaches `min` against every background in `on` (a colour or a list),
// drawn with opacity `op`; else the best of near-black, black and white.
function readable(cands, on, min, op = 1) {
  const bgs = (Array.isArray(on) ? on : [on]).filter(isHex);
  if (!bgs.length) return cands.find(isHex) || '#161616';
  const worst = (c) => Math.min(...bgs.map((b) => contrast(op < 1 ? mix(c, b, 1 - op) : c, b)));
  for (const c of cands) if (isHex(c) && worst(c) >= min) return c;
  for (const c of ['#161616', '#ffffff']) if (worst(c) >= min) return c;
  return worst('#000000') >= worst('#ffffff') ? '#000000' : '#ffffff';
}
// numeric key for a unit code (municipality numbers, or a hash of ISO3 / admin-1 codes)
const codeNum = (c) => {
  const n = parseInt(c);
  if (!isNaN(n)) return n;
  let h = 0;
  for (const ch of String(c)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
};

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
// SHA-256 of a text (UTF-8), as hex. Synchronous and self-contained: crypto.subtle is missing on file:// pages.
function sha256(text) {
  const rr = (v, n) => (v >>> n) | (v << (32 - n));
  // the constants: fractional parts of the square and cube roots of the first primes
  const K = [],
    Hs = [];
  for (let n = 2; K.length < 64; n++) {
    let prime = true;
    for (let d = 2; d * d <= n; d++) if (n % d === 0) prime = false;
    if (!prime) continue;
    if (Hs.length < 8) Hs.push((Math.sqrt(n) * 4294967296) | 0);
    K.push((Math.cbrt(n) * 4294967296) | 0);
  }
  const bytes = new TextEncoder().encode(text),
    n = bytes.length,
    w = new Int32Array((((n + 8) >> 6) + 1) << 4),
    m = new Int32Array(64);
  for (let i = 0; i < n; i++) w[i >> 2] |= bytes[i] << (24 - (i % 4) * 8);
  w[n >> 2] |= 0x80 << (24 - (n % 4) * 8);
  w[w.length - 2] = Math.floor(n / 0x20000000);
  w[w.length - 1] = n << 3;
  for (let o = 0; o < w.length; o += 16) {
    let [a, b, c, d, e, f, g, h] = Hs;
    for (let i = 0; i < 64; i++) {
      if (i < 16) m[i] = w[o + i];
      else {
        const x = m[i - 15],
          y = m[i - 2];
        m[i] = (m[i - 16] + (rr(x, 7) ^ rr(x, 18) ^ (x >>> 3)) + m[i - 7] + (rr(y, 17) ^ rr(y, 19) ^ (y >>> 10))) | 0;
      }
      const t1 = (h + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + m[i]) | 0,
        t2 = ((rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }
    [a, b, c, d, e, f, g, h].forEach((v, i) => (Hs[i] = (Hs[i] + v) | 0));
  }
  return Hs.map((v) => (v >>> 0).toString(16).padStart(8, '0')).join('');
}

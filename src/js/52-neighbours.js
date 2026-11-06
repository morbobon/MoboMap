function utm32(lon, lat) {
  const a = 6378137,
    f = 1 / 298.257223563,
    k0 = 0.9996,
    e2 = f * (2 - f),
    ep2 = e2 / (1 - e2),
    l0 = 9 * RAD,
    ph = lat * RAD,
    la = lon * RAD;
  const sp = Math.sin(ph),
    cp = Math.cos(ph),
    tp = Math.tan(ph);
  const N = a / Math.sqrt(1 - e2 * sp * sp),
    T = tp * tp,
    C = ep2 * cp * cp,
    A = cp * (la - l0);
  const Mm =
    a *
    ((1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 ** 3) / 256) * ph -
      ((3 * e2) / 8 + (3 * e2 * e2) / 32 + (45 * e2 ** 3) / 1024) * Math.sin(2 * ph) +
      ((15 * e2 * e2) / 256 + (45 * e2 ** 3) / 1024) * Math.sin(4 * ph) -
      ((35 * e2 ** 3) / 3072) * Math.sin(6 * ph));
  return [
    k0 * N * (A + ((1 - T + C) * A ** 3) / 6 + ((5 - 18 * T + T * T + 72 * C - 58 * ep2) * A ** 5) / 120) + 500000,
    k0 *
      (Mm +
        N *
          tp *
          ((A * A) / 2 +
            ((5 - T + 9 * C + 4 * C * C) * A ** 4) / 24 +
            ((61 - 58 * T + T * T + 600 * C - 330 * ep2) * A ** 6) / 720)),
  ];
}
function worldPt(x, y) {
  if (GEO.geo) return P(x, y);
  const [E, N] = utm32(x - 180, 90 - y);
  return [((E - 441000) / 300) * sc + ox, ((6403000 - N) / 300) * sc + oy];
}
const NBR = {};
function nbRings(u) {
  if (NBR[u.c]) return NBR[u.c];
  const a = DATA.adm1[u.c];
  return (NBR[u.c] = a && a.l ? decRings(a.l) : u.s);
}
function neighboursPath() {
  const key = 'nb|' + S.country;
  if (cache[key] != null) return cache[key];
  const b = S.map === 'dk' ? [188, 32.2, 195.2, 35.5] : GEO.main;
  const m = Math.max(10, (b[2] - b[0]) * 1.2, (b[3] - b[1]) * 1.2);
  const win = [b[0] - m, b[1] - m, b[2] + m, b[3] + m];
  let d = '';
  for (const u of DATA.world.units) {
    if (u.c === (S.country || 'DNK')) continue;
    if (u.b[2] < win[0] || u.b[0] > win[2] || u.b[3] < win[1] || u.b[1] > win[3]) continue;
    for (const r of nbRings(u)) {
      const rb = bboxR([r]);
      if (rb[2] < win[0] || rb[0] > win[2] || rb[3] < win[1] || rb[1] > win[3]) continue;
      for (let i = 0; i < r.length; i += 2) {
        const cx = Math.min(win[2], Math.max(win[0], r[i])),
          cy = Math.min(win[3], Math.max(win[1], r[i + 1]));
        const [x, y] = worldPt(cx, cy);
        d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
      }
      d += 'Z';
    }
  }
  return (cache[key] = d);
}

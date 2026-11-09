// Cities: markers and "zoom to a city" focus (S.focus = 'city:<name>') for country views.
// Denmark has its own town list (tools/build.mjs); other countries use Natural Earth's major cities.
const CITY_PREFIX = 'city:';
const cityList = () =>
  S.map === 'world'
    ? []
    : (GEO.cityList || []).filter((c) => (S.map === 'dk' ? !(S.far === 'hide' && c.x - 180 > 14.5) : !!cityUnit(c)));
// point in polygon (flat [x, y, …] rings, even-odd)
function pipRings(x, y, rings) {
  let inside = false;
  for (const r of rings)
    for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
      const xi = r[i],
        yi = r[i + 1],
        xj = r[j],
        yj = r[j + 1];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-12) + xi) inside = !inside;
    }
  return inside;
}
// the unit a city lies in (or the nearest within ~1°), cached per dataset object
const CITY_UNIT = new WeakMap();
function cityUnit(c) {
  let m = CITY_UNIT.get(GEO);
  if (!m) CITY_UNIT.set(GEO, (m = {}));
  if (c.n in m) return m[c.n];
  const p = cityRaw(c);
  let u = GEO.units.find(
    (k) => p.x >= k.b[0] && p.x <= k.b[2] && p.y >= k.b[1] && p.y <= k.b[3] && pipRings(p.x, p.y, k.s),
  );
  if (!u) {
    const near = GEO.units.map((k) => [k, Math.hypot(k.p[0] - p.x, k.p[1] - p.y)]).sort((a, b) => a[1] - b[1])[0];
    u = near && near[1] < (GEO.geo ? 1.2 : 120) ? near[0] : null;
  }
  return (m[c.n] = u || null);
}
// a city focus inside Denmark's Bornholm inset: Bornholm is then drawn in place
const insetCityFocus = () => {
  const fc = S.map === 'dk' && S.focus && S.focus.startsWith(CITY_PREFIX) ? focusCity() : null;
  return !!fc && fc.x - 180 > 14.5;
};
// position in data coordinates, before any inset
function cityRaw(c) {
  if (GEO.geo) return { x: c.x, y: c.y };
  const [E, N] = utm32(c.x - 180, 90 - c.y);
  return { x: (E - 441000) / 300, y: (6403000 - N) / 300 };
}
function focusCity() {
  if (!S.focus || !S.focus.startsWith(CITY_PREFIX)) return null;
  const n = S.focus.slice(CITY_PREFIX.length);
  return cityList().find((c) => c.n === n) || null;
}
// Position in the dataset's coordinates (+ the inset it is drawn in: Rønne on Bornholm)
function cityXY(c) {
  const p = cityRaw(c);
  if (GEO.geo) {
    // cities in far-away parts follow them into their inset box (no focus set)
    const u = GEO.insetOf && !S.focus ? cityUnit(c) : null;
    return { x: p.x, y: p.y, ins: u ? GEO.insetOf[u.c] || null : null };
  }
  return { x: p.x, y: p.y, ins: I && c.x - 180 > 14.5 && !insetCityFocus() ? I : null };
}
const cityPt = (c) => {
  const p = cityXY(c);
  return P(p.x, p.y, p.ins);
};
// Radius of the zoom window in km, by population (a metropolis needs its suburbs)
const cityKm = (c) =>
  c.pop > 5e6 ? 60 : c.pop > 1e6 ? 32 : c.pop > 2e5 ? 24 : c.pop > 1e5 ? 19 : c.pop > 4e4 ? 15 : 12;
// Zoom window in data coordinates: [x0, y0, x1, y1]
function cityWin(c) {
  const p = cityXY(c),
    km = cityKm(c);
  if (GEO.geo) {
    const lat = 90 - c.y,
      dy = km / 111,
      dx = km / (111 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
    return [p.x - dx, p.y - dy, p.x + dx, p.y + dy];
  }
  const r = (km * 1000) / 300;
  return [p.x - r, p.y - r, p.x + r, p.y + r];
}
// Frame (map space, before scaling) for a city focus
function cityFrame(c) {
  const w = cityWin(c),
    ins = cityXY(c).ins;
  const pts = [];
  for (const fx of [0, 0.5, 1])
    for (const fy of [0, 0.5, 1]) {
      let x = w[0] + (w[2] - w[0]) * fx,
        y = w[1] + (w[3] - w[1]) * fy;
      if (GEO.geo) [x, y] = prj(x, y);
      else if (ins) ((x += ins.dx), (y += ins.dy));
      pts.push([x, y]);
    }
  return [
    Math.min(...pts.map((p) => p[0])),
    Math.min(...pts.map((p) => p[1])),
    Math.max(...pts.map((p) => p[0])),
    Math.max(...pts.map((p) => p[1])),
  ];
}
// Units around a focused city (for dimming / hiding outside the focus and the local projection centre)
function cityUnits(c) {
  const w = cityWin(c),
    own = cityUnit(c);
  const u = GEO.units.filter(
    (k) => k === own || (k.b[0] <= w[2] && k.b[2] >= w[0] && k.b[1] <= w[3] && k.b[3] >= w[1] && pipBoxOverlap(k, w)),
  );
  if (u.length) return u;
  // no unit centre inside a small window: the unit containing the city (nearest centre)
  const p = cityXY(c);
  const near = GEO.units
    .slice()
    .sort((a, b) => Math.hypot(a.p[0] - p.x, a.p[1] - p.y) - Math.hypot(b.p[0] - p.x, b.p[1] - p.y));
  return near.slice(0, 1);
}
// Cities to draw: the biggest at country level, everything inside the window when zoomed to a city
function citiesToDraw() {
  const all = cityList();
  const fc = focusCity();
  if (fc) {
    const w = cityWin(fc);
    const pad = (w[2] - w[0]) * 0.15;
    return all.filter((c) => {
      const p = cityXY(c);
      return p.x >= w[0] - pad && p.x <= w[2] + pad && p.y >= w[1] - pad && p.y <= w[3] + pad;
    });
  }
  return all
    .slice()
    .sort((a, b) => b.cap - a.cap || b.pop - a.pop)
    .slice(0, 8);
}

// a unit really reaches into the window (one of its vertices or its centre inside), not only its bbox
function pipBoxOverlap(k, w) {
  if (k.p[0] >= w[0] && k.p[0] <= w[2] && k.p[1] >= w[1] && k.p[1] <= w[3]) return true;
  for (const r of k.s)
    for (let i = 0; i < r.length; i += 2)
      if (r[i] >= w[0] && r[i] <= w[2] && r[i + 1] >= w[1] && r[i + 1] <= w[3]) return true;
  return false;
}

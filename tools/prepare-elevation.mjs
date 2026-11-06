// Elevation contours for the topographic layer.
// Downloads ETOPO1 (NOAA, public domain) through NOAA CoastWatch ERDDAP at a 0.25° stride, cached in
// assets/geo/source-etopo.csv (gitignored), and writes assets/geo/elevation.json:
//   { levels: [m, …], bands: [encoded rings, …] }
// Band i is the area at or above levels[i] (below it for negative levels = sea depths), as rings of
// 0.01° integers (x = lon+180, y = 90-lat), delta-encoded like admin1 – decoded by decRings() in the app.
// Run: npm run elevation
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { contours } from 'd3-contour';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'assets/geo/source-etopo.csv');
const OUT = path.join(root, 'assets/geo/elevation.json');
const STEP = 0.25; // degrees (ETOPO1 is 1′; stride 15)
const URL =
  'https://coastwatch.pfeg.noaa.gov/erddap/griddap/etopo180.csv?altitude%5B(-90):15:(90)%5D%5B(-180):15:(180)%5D';
const LAND = [100, 200, 500, 1000, 1500, 2000, 3000, 4000, 5000];
const SEA = [-200, -2000];
const TOL = 0.06; // Douglas-Peucker tolerance in degrees
const MIN_AREA = 0.15; // drop rings smaller than this (square degrees)

if (!fs.existsSync(SRC)) {
  console.log('downloading ETOPO1 (0.25°) …');
  const r = await fetch(URL);
  if (!r.ok) throw new Error('ERDDAP ' + r.status);
  fs.writeFileSync(SRC, Buffer.from(await r.arrayBuffer()));
}
const lines = fs.readFileSync(SRC, 'utf8').split(/\r?\n/).slice(2).filter(Boolean);
const NX = Math.round(360 / STEP) + 1,
  NY = Math.round(180 / STEP) + 1;
if (lines.length !== NX * NY) throw new Error(`expected ${NX * NY} values, got ${lines.length}`);
// CSV rows run latitude -90 → 90 (outer) and longitude -180 → 180 (inner). Flip to north-up rows.
const z = new Float64Array(NX * NY);
lines.forEach((l, i) => {
  const row = Math.floor(i / NX),
    col = i % NX;
  z[(NY - 1 - row) * NX + col] = +l.slice(l.lastIndexOf(',') + 1);
});

// Closed rings start and end on the same point: simplify the two halves separately.
const dpRing = (r, tol) => {
  const m = r.length >> 1;
  return [...dp(r.slice(0, m + 1), tol).slice(0, -1), ...dp(r.slice(m), tol)];
};
function dp(pts, tol) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a],
      [bx, by] = pts[b];
    const dx = bx - ax,
      dy = by - ay,
      L = Math.hypot(dx, dy) || 1;
    let md = 0,
      mi = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / L;
      if (d > md) ((md = d), (mi = i));
    }
    if (md > tol) {
      keep[mi] = 1;
      stack.push([a, mi], [mi, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}
const area = (r) =>
  Math.abs(r.reduce((s, p, i) => s + p[0] * r[(i + 1) % r.length][1] - r[(i + 1) % r.length][0] * p[1], 0)) / 2;
function encode(rings) {
  return rings
    .map((r) => {
      const out = [];
      let px = 0,
        py = 0;
      for (const [x0, y0] of r) {
        const x = Math.round(x0 * 100),
          y = Math.round(y0 * 100);
        if (out.length && x === px && y === py) continue;
        out.push(out.length ? x - px + ',' + (y - py) : x + ',' + y);
        px = x;
        py = y;
      }
      return out.length >= 3 ? out.join(',') : '';
    })
    .filter(Boolean)
    .join(';');
}

const levels = [...SEA, ...LAND];
const bands = [];
for (const lv of levels) {
  // Sea levels: contour the negated grid so the band is "deeper than |lv|".
  const vals = lv < 0 ? z.map((v) => -v) : z;
  const [mp] = contours()
    .size([NX, NY])
    .smooth(true)
    .thresholds([Math.abs(lv)])(vals);
  const rings = [];
  for (const poly of mp.coordinates)
    for (const ring of poly) {
      // grid coords: pixel centres at i+0.5 → degrees in app space (x = lon+180, y = 90-lat)
      const r = ring.map(([gx, gy]) => [
        Math.max(0, Math.min(360, (gx - 0.5) * STEP)),
        Math.max(0, Math.min(180, (gy - 0.5) * STEP)),
      ]);
      if (area(r) < MIN_AREA) continue;
      const s = dpRing(r, TOL);
      if (s.length >= 4) rings.push(s);
    }
  const enc = encode(rings);
  bands.push(enc);
  console.log(`${String(lv).padStart(6)} m: ${rings.length} rings, ${(enc.length / 1024).toFixed(0)} KB`);
}
fs.writeFileSync(OUT, JSON.stringify({ source: 'ETOPO1 (NOAA NCEI), 0.25°', levels, bands }));
console.log('wrote', path.relative(root, OUT), (fs.statSync(OUT).size / 1024).toFixed(0), 'KB');

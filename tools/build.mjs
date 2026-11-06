// Bygger én selvstændig HTML-fil (index.html) fra src/app.html + assets.
// Kør: node tools/build.mjs
import fs from 'fs';
import path from 'path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const A = (p) => path.join(root, 'assets', p);
const readJSON = (p) => JSON.parse(fs.readFileSync(A(p), 'utf8'));

// ---------- Geometri ----------
const X0 = 441000, Y0 = 6403000, S = 300; // 1 kortenhed = 300 m
const r1 = (v) => Math.round(v * 10) / 10;
const tx = ([x, y]) => [r1((x - X0) / S), r1((Y0 - y) / S)];

const geoms = (fc) => (fc.features ? fc.features.map((f) => f.geometry) : fc.geometries || [fc]);
function polys(g) {
  if (!g) return [];
  if (g.type === 'Polygon') return [g.coordinates];
  if (g.type === 'MultiPolygon') return g.coordinates;
  if (g.type === 'GeometryCollection') return g.geometries.flatMap(polys);
  return [];
}
function lines(g) {
  if (!g) return [];
  if (g.type === 'LineString') return [g.coordinates];
  if (g.type === 'MultiLineString') return g.coordinates;
  if (g.type === 'GeometryCollection') return g.geometries.flatMap(lines);
  return [];
}
// Ring -> flad talrække [x0,y0,x1,y1,...] (uden lukkepunkt)
function flatRing(ring) {
  const pts = ring.map(tx);
  if (pts.length > 1) {
    const a = pts[0], b = pts[pts.length - 1];
    if (a[0] === b[0] && a[1] === b[1]) pts.pop();
  }
  // fjern dubletter
  const out = [];
  for (const p of pts) {
    const q = out[out.length - 1];
    if (!q || q[0] !== p[0] || q[1] !== p[1]) out.push(p);
  }
  return out.flat();
}
const flatLine = (l) => l.map(tx).flat();
const ringsOf = (g) => polys(g).flatMap((poly) => poly.map(flatRing)).filter((r) => r.length >= 6);

function bboxOf(rings) {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  for (const r of rings) for (let i = 0; i < r.length; i += 2) {
    b[0] = Math.min(b[0], r[i]); b[1] = Math.min(b[1], r[i + 1]);
    b[2] = Math.max(b[2], r[i]); b[3] = Math.max(b[3], r[i + 1]);
  }
  return b.map(r1);
}
function areaOf(rings) {
  let a = 0;
  for (const r of rings) { let s = 0; for (let i = 0; i < r.length; i += 2) { const j = (i + 2) % r.length; s += r[i] * r[j + 1] - r[j] * r[i + 1]; } a += s / 2; }
  return Math.round(Math.abs(a));
}

const kd = readJSON('geo/k_detail.json');
const ks = readJSON('geo/k_simple.json');
const pts = readJSON('geo/points.json');
const ptBy = Object.fromEntries(pts.features.map((f) => [f.properties.lau_1, tx(f.geometry.coordinates)]));
const simpleBy = Object.fromEntries(ks.features.map((f) => [f.properties.lau_1, ringsOf(f.geometry)]));

const REGION = { 'DK-81': 'Nordjylland', 'DK-82': 'Midtjylland', 'DK-83': 'Syddanmark', 'DK-84': 'Hovedstaden', 'DK-85': 'Sjælland' };
const kommuner = kd.features.map((f) => {
  const p = f.properties;
  const d = ringsOf(f.geometry);
  return {
    c: p.lau_1.padStart(3, '0'), n: p.label_dk, r: p.iso_3166_2,
    p: ptBy[p.lau_1], b: bboxOf(d), a: areaOf(d),
    d, s: simpleBy[p.lau_1] || d,
  };
}).sort((a, b) => a.n.localeCompare(b.n, 'da'));

const bh = kommuner.find((k) => k.c === '400');
// Indsat boks til Bornholm øverst til højre (som på klassiske danmarkskort)
const mainB = bboxOf(kommuner.filter((k) => k !== bh).flatMap((k) => k.d));
const bw = bh.b[2] - bh.b[0], bhh = bh.b[3] - bh.b[1];
const pad = 14;
const box = [r1(mainB[2] - bw - 2 * pad), r1(mainB[1] + 6), r1(mainB[2]), r1(mainB[1] + 6 + bhh + 2 * pad)];
const inset = { dx: r1(box[0] + pad - bh.b[0]), dy: r1(box[1] + pad - bh.b[1]), box };

const data = {
  unit: S, main: mainB, inset, regions: REGION,
  kommuner,
  land: { d: ringsOf(geoms(readJSON('geo/land_detail.json'))[0]), s: ringsOf(geoms(readJSON('geo/land_simple.json'))[0]) },
  inner: { d: geoms(readJSON('geo/inner_detail.json')).flatMap(lines).map(flatLine), s: geoms(readJSON('geo/inner_simple.json')).flatMap(lines).map(flatLine) },
  rlines: { d: geoms(readJSON('geo/regionlines_detail.json')).flatMap(lines).map(flatLine), s: geoms(readJSON('geo/regionlines_simple.json')).flatMap(lines).map(flatLine) },
};

// ---------- Fonte & logo ----------
const b64 = (p) => fs.readFileSync(A(p)).toString('base64');
const fonts = {
  'Arvo': b64('fonts/arvo700.woff2'),
  'Work Sans': b64('fonts/worksans.woff2'),
  'Roboto Slab': b64('fonts/robotoslab.woff2'),
  'Space Grotesk': b64('fonts/spacegrotesk.woff2'),
  'DM Serif Display': b64('fonts/dmserif.woff2'),
  'IBM Plex Mono': b64('fonts/plexmono.woff2'),
};

// ---------- Designsystemer (designsystems/**/*.json; private/ er gitignored) ----------
const DSDIR = path.join(root, 'designsystems');
const mime = (p) => ({ '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf' })[path.extname(p).toLowerCase()] || 'application/octet-stream';
const dataURI = (p) => 'data:' + mime(p) + ';base64,' + fs.readFileSync(p).toString('base64');
function imageAspect(p) {
  const buf = fs.readFileSync(p);
  if (buf.slice(1, 4).toString() === 'PNG') return buf.readUInt32BE(16) / buf.readUInt32BE(20);
  if (/\.svg$/i.test(p)) { const t = buf.toString('utf8'); const vb = t.match(/viewBox="[\d.\-]+ [\d.\-]+ ([\d.]+) ([\d.]+)"/); if (vb) return +vb[1] / +vb[2]; const w = t.match(/\swidth="([\d.]+)/), h = t.match(/\sheight="([\d.]+)/); if (w && h) return +w[1] / +h[1]; }
  return null;
}
const PUBLIC = process.argv.includes('--public'); // udelad designsystems/private/
const OUT = (process.argv.find((a) => a.startsWith('--out=')) || '--out=index.html').slice(6);
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? (PUBLIC && e.name === 'private' ? [] : walk(path.join(d, e.name))) : (e.name.endsWith('.json') ? [path.join(d, e.name)] : []));
const designSystems = walk(DSDIR).sort((a, b) => path.basename(a).localeCompare(path.basename(b))).map((f) => {
  const dir = path.dirname(f);
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  const inlineLogo = (L, what) => {
    if (!L || !L.src || /^data:/.test(L.src)) return;
    const lp = path.join(dir, L.src);
    if (!fs.existsSync(lp)) throw new Error(path.relative(root, f) + ': ' + what + ' mangler: ' + L.src);
    L.aspect = L.aspect || imageAspect(lp) || 4;
    L.src = dataURI(lp);
  };
  if (d.logo) { d.company = d.company || {}; d.company.logo = d.company.logo || d.logo; delete d.logo; }
  inlineLogo(d.company && d.company.logo, 'logo');
  for (const p of d.partners || []) { if (typeof p.logo === 'string') p.logo = { src: p.logo }; inlineLogo(p.logo, 'partnerlogo ' + p.name); }
  for (const face of (d.fonts && d.fonts.faces) || []) if (face.src && !/^data:/.test(face.src)) face.src = dataURI(path.join(dir, face.src));
  return d;
});
console.log('designsystemer:', designSystems.map((d) => d.id).join(', '));

let html = fs.readFileSync(path.join(root, 'src', 'app.html'), 'utf8');
html = html.replace('/*__DATA__*/', () => 'const DK = ' + JSON.stringify(data) + ';')
  .replace('/*__FONTS__*/', () => 'const FONTS = ' + JSON.stringify(fonts) + ';')
  .replace('/*__JSPDF__*/', () => fs.readFileSync(A('jspdf.umd.min.js'), 'utf8'))
  .replace('/*__DESIGNSYSTEMS__*/[]', () => JSON.stringify(designSystems));
fs.mkdirSync(path.dirname(path.join(root, OUT)), { recursive: true });
fs.writeFileSync(path.join(root, OUT), html);
console.log(OUT, (html.length / 1024).toFixed(0) + ' KB', 'kommuner:', kommuner.length, 'inset:', JSON.stringify(inset));

// Builds one self-contained HTML file (index.html) from src/ + assets/ + designsystems/.
// Usage: node tools/build.mjs [--public] [--out=path]   (--public skips designsystems/private/)
import fs from 'fs';
import path from 'path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const A = (p) => path.join(root, 'assets', p);
const readJSON = (p) => JSON.parse(fs.readFileSync(A(p), 'utf8'));

// ---------- Geometry helpers ----------
const r1 = (v) => Math.round(v * 10) / 10;
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
function bboxOf(rings) {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  for (const r of rings)
    for (let i = 0; i < r.length; i += 2) {
      b[0] = Math.min(b[0], r[i]);
      b[1] = Math.min(b[1], r[i + 1]);
      b[2] = Math.max(b[2], r[i]);
      b[3] = Math.max(b[3], r[i + 1]);
    }
  return b.map(r1);
}
function areaOf(rings) {
  let a = 0;
  for (const r of rings) {
    let s = 0;
    for (let i = 0; i < r.length; i += 2) {
      const j = (i + 2) % r.length;
      s += r[i] * r[j + 1] - r[j] * r[i + 1];
    }
    a += s / 2;
  }
  return Math.round(Math.abs(a));
}

// A dataset = units (municipalities/countries) + landmass + inner borders + group borders, all in map units
// where (X0, Y0) is the top-left corner and S is source units (metres or degrees) per map unit.
function dataset({ X0, Y0, S, files, key, unit, groups, sort }) {
  const tx = ([x, y]) => [r1((x - X0) / S), r1((Y0 - y) / S)];
  function flatRing(ring) {
    const pts = ring.map(tx);
    if (pts.length > 1) {
      const a = pts[0],
        b = pts[pts.length - 1];
      if (a[0] === b[0] && a[1] === b[1]) pts.pop();
    }
    const out = [];
    for (const p of pts) {
      const q = out[out.length - 1];
      if (!q || q[0] !== p[0] || q[1] !== p[1]) out.push(p);
    }
    return out.flat();
  }
  const flatLine = (l) => l.map(tx).flat();
  const ringsOf = (g) =>
    polys(g)
      .flatMap((poly) => poly.map(flatRing))
      .filter((r) => r.length >= 6);
  const kd = readJSON(files.detail),
    ks = readJSON(files.simple),
    pts = readJSON(files.points);
  const ptBy = Object.fromEntries(pts.features.map((f) => [key(f.properties), tx(f.geometry.coordinates)]));
  const simpleBy = Object.fromEntries(ks.features.map((f) => [key(f.properties), ringsOf(f.geometry)]));
  const units = kd.features
    .map((f) => {
      const p = f.properties,
        d = ringsOf(f.geometry),
        c = key(p);
      return Object.assign({ c, p: ptBy[c], b: bboxOf(d), a: areaOf(d), d, s: simpleBy[c] || d }, unit(p));
    })
    .sort(sort);
  const linesOf = (file) => geoms(readJSON(file)).flatMap(lines).map(flatLine);
  return {
    unitM: S,
    units,
    groups,
    land: { d: ringsOf(geoms(readJSON(files.land_d))[0]), s: ringsOf(geoms(readJSON(files.land_s))[0]) },
    inner: { d: linesOf(files.inner_d), s: linesOf(files.inner_s) },
    rlines: { d: linesOf(files.rl_d), s: linesOf(files.rl_s) },
  };
}

// ---------- Denmark: 98 municipalities, UTM 32N, 1 unit = 300 m ----------
const dk = dataset({
  X0: 441000,
  Y0: 6403000,
  S: 300,
  files: {
    detail: 'geo/k_detail.json',
    simple: 'geo/k_simple.json',
    points: 'geo/points.json',
    land_d: 'geo/land_detail.json',
    land_s: 'geo/land_simple.json',
    inner_d: 'geo/inner_detail.json',
    inner_s: 'geo/inner_simple.json',
    rl_d: 'geo/regionlines_detail.json',
    rl_s: 'geo/regionlines_simple.json',
  },
  key: (p) => p.lau_1.padStart(3, '0'),
  unit: (p) => ({ n: p.label_dk, r: p.iso_3166_2 }),
  groups: {
    'DK-81': 'Nordjylland',
    'DK-82': 'Midtjylland',
    'DK-83': 'Syddanmark',
    'DK-84': 'Hovedstaden',
    'DK-85': 'Sjælland',
  },
  sort: (a, b) => a.n.localeCompare(b.n, 'da'),
});
{
  // Bornholm in an inset box top right
  const bh = dk.units.find((k) => k.c === '400');
  const mainB = bboxOf(dk.units.filter((k) => k !== bh).flatMap((k) => k.d));
  const bw = bh.b[2] - bh.b[0],
    bhh = bh.b[3] - bh.b[1],
    pad = 14;
  const box = [r1(mainB[2] - bw - 2 * pad), r1(mainB[1] + 6), r1(mainB[2]), r1(mainB[1] + 6 + bhh + 2 * pad)];
  dk.main = mainB;
  dk.inset = { unit: '400', dx: r1(box[0] + pad - bh.b[0]), dy: r1(box[1] + pad - bh.b[1]), box };
}
// Danish towns (≥ about 20,000 inhabitants, urban areas, Danmarks Statistik 2024, rounded) + Rønne: [name, lat, lon, pop]
{
  const T = [
    ['København', 55.6761, 12.5683, 1381000, 1],
    ['Aarhus', 56.1567, 10.2108, 290000],
    ['Odense', 55.3959, 10.3883, 182000],
    ['Aalborg', 57.0488, 9.9217, 143000],
    ['Esbjerg', 55.4703, 8.4519, 71000],
    ['Randers', 56.4607, 10.0364, 63000],
    ['Kolding', 55.4904, 9.4722, 63000],
    ['Horsens', 55.8607, 9.8503, 62000],
    ['Vejle', 55.7093, 9.5357, 61000],
    ['Roskilde', 55.6415, 12.0803, 52000],
    ['Herning', 56.1393, 8.9738, 51000],
    ['Silkeborg', 56.1697, 9.5451, 51000],
    ['Helsingør', 56.0361, 12.6136, 47000],
    ['Næstved', 55.2299, 11.7609, 44000],
    ['Fredericia', 55.5657, 9.7526, 41000],
    ['Viborg', 56.4532, 9.402, 41000],
    ['Køge', 55.458, 12.1821, 38000],
    ['Holstebro', 56.3601, 8.616, 37000],
    ['Hillerød', 55.9267, 12.3109, 36000],
    ['Slagelse', 55.4028, 11.3546, 34000],
    ['Holbæk', 55.7175, 11.7128, 29000],
    ['Sønderborg', 54.9138, 9.7922, 28000],
    ['Svendborg', 55.0598, 10.6068, 27000],
    ['Hjørring', 57.4642, 9.9823, 25000],
    ['Ringsted', 55.4426, 11.79, 23000],
    ['Haderslev', 55.2531, 9.4891, 22000],
    ['Frederikshavn', 57.4407, 10.5366, 22000],
    ['Skive', 56.5657, 9.0272, 20000],
    ['Nykøbing Falster', 54.7691, 11.8743, 16000],
    ['Thisted', 56.9552, 8.6943, 13000],
    ['Rønne', 55.1009, 14.7065, 13000],
  ];
  const r3 = (v) => Math.round(v * 1000) / 1000;
  dk.cityList = T.map(([n, lat, lon, pop, cap]) => ({ n, x: r3(lon + 180), y: r3(90 - lat), pop, cap: cap ? 1 : 0 }));
  // sea labels: [x fraction, y fraction, i18n key]
  // sea / neighbour names: [longitude, latitude, i18n key]
  dk.sea = [
    [6.7, 56.45, 'sea_north'],
    [11.45, 56.95, 'sea_kattegat'],
    [13.7, 54.72, 'sea_baltic'],
    [14.3, 56.65, 'land_sweden'],
  ];
  dk.alias = {
    kbh: '101',
    copenhagen: '101',
    århus: '751',
    ålborg: '851',
    nørresundby: '851',
    brønderslev: '810',
    'brønderslev-dronninglund': '810',
    åbenrå: '580',
    als: '540',
    mors: '773',
    thy: '787',
    møn: '390',
    falster: '376',
    'nykøbing falster': '376',
    skagen: '813',
    amager: '101',
    lyngby: '173',
    taastrup: '169',
  };
}

// ---------- World: 176 countries in degrees (projected at runtime) ----------
const extra = readJSON('geo/world-extra.json');
const CONT = {
  Africa: 'AF',
  Asia: 'AS',
  Europe: 'EU',
  'North America': 'NA',
  'South America': 'SA',
  Oceania: 'OC',
  'Seven seas (open ocean)': 'OC',
  Antarctica: 'AN',
};
const world = dataset({
  X0: -180,
  Y0: 90,
  S: 1, // grader: x = lon+180, y = 90-lat; projiceres i appen (valgbar projektion)
  files: {
    detail: 'geo/w_detail.json',
    simple: 'geo/w_simple.json',
    points: 'geo/wpoints.json',
    land_d: 'geo/wland_detail.json',
    land_s: 'geo/wland_simple.json',
    inner_d: 'geo/winner_detail.json',
    inner_s: 'geo/winner_simple.json',
    rl_d: 'geo/wregionlines_detail.json',
    rl_s: 'geo/wregionlines_simple.json',
  },
  key: (p) => p.ADM0_A3,
  unit: (p) => ({
    n: p.NAME_EN,
    r: CONT[p.CONTINENT] || 'OC',
    names: {
      da: extra.names_da[p.ADM0_A3] || p.NAME_EN,
      de: p.NAME_DE,
      fr: p.NAME_FR,
      es: p.NAME_ES,
      sv: p.NAME_SV,
      nl: p.NAME_NL,
      it: p.NAME_IT,
    },
    at: {
      un: p.REGION_UN,
      sub: p.SUBREGION,
      eco: p.ECONOMY.replace(/^\d\. /, ''),
      inc: p.INCOME_GRP.replace(/^\d\. /, ''),
      pop: p.POP_EST,
      gdp: p.GDP_MD,
      rel: extra.religion[p.ADM0_A3] || 'unknown',
    },
  }),
  groups: { AF: 'Africa', AS: 'Asia', EU: 'Europe', NA: 'North America', SA: 'South America', OC: 'Oceania' },
  sort: (a, b) => a.n.localeCompare(b.n, 'en'),
});
world.geo = true; // koordinater i grader -> runtime-projektion
world.main = bboxOf(world.units.flatMap((k) => k.d));
world.inset = null;
world.lists = { eu: extra.eu, nato: extra.nato, g20: extra.g20, nordic: extra.nordic };
dk.lists = { fyn: extra.dk_fyn, storkbh: extra.dk_storkbh };
// Country statistics (Our World in Data, see tools/prepare-stats.mjs): unit.st = { indicator: value }
{
  const stats = readJSON('geo/world-stats.json');
  for (const u of world.units) u.st = stats.values[u.c] || {};
  world.statsMeta = stats.meta;
}
// Major cities per country (Natural Earth 50m populated places): capital first, then up to 8 by population
{
  const places = readJSON('geo/source-places.geojson').features.map((f) => f.properties);
  const by = {};
  for (const p of places) {
    (by[p.adm0_a3] = by[p.adm0_a3] || []).push({
      n: String(p.name).replace(/\s+/g, ' ').trim(),
      x: r1(p.longitude + 180),
      y: r1(90 - p.latitude),
      pop: p.pop_max,
      cap: p.adm0cap === 1 ? 1 : 0,
    });
  }
  world.cities = {};
  for (const [c, arr] of Object.entries(by))
    world.cities[c] = arr.sort((a, b) => b.cap - a.cap || b.pop - a.pop).slice(0, 8);
}
// ocean names: [longitude, latitude, i18n key]
world.sea = [
  [-38, 27, 'sea_atlantic'],
  [-142, 4, 'sea_pacific'],
  [78, -23, 'sea_indian'],
  [12, 79, 'sea_arctic'],
];
world.alias = {
  uk: 'GBR',
  'united kingdom': 'GBR',
  britain: 'GBR',
  england: 'GBR',
  us: 'USA',
  usa: 'USA',
  'united states': 'USA',
  america: 'USA',
  holland: 'NLD',
  czechia: 'CZE',
  'south korea': 'KOR',
  'north korea': 'PRK',
  russia: 'RUS',
  'ivory coast': 'CIV',
  'dr congo': 'COD',
  congo: 'COG',
  burma: 'MMR',
  eswatini: 'SWZ',
  swaziland: 'SWZ',
  macedonia: 'MKD',
  bosnia: 'BIH',
  uae: 'ARE',
  emirates: 'ARE',
  palestine: 'PSX',
  'east timor': 'TLS',
  'timor-leste': 'TLS',
};

// ---------- Admin-1 for all countries (compact): coordinates as 0.01° integers (x=lon+180, y=90-lat), delta-encoded ----------
const adm1 = {};
{
  const A1 = 'geo/admin1.json';
  if (fs.existsSync(A(A1))) {
    const src = readJSON(A1);
    const q = ([lon, lat]) => [Math.round((lon + 180) * 100), Math.round((90 - lat) * 100)];
    const enc = (rings) =>
      rings
        .map((r) => {
          const out = [];
          let px = 0,
            py = 0;
          for (const c of r) {
            const [x, y] = q(c);
            if (out.length && x === px && y === py) continue;
            out.push(out.length ? x - px + ',' + (y - py) : x + ',' + y);
            px = x;
            py = y;
          }
          return out.join(',');
        })
        .filter((s) => s.split(',').length >= 6)
        .join(';');
    const ringsOfGeo = (g) => polys(g).flatMap((p) => p);
    const linesOfGeo = (gs) => gs.flatMap(lines);
    const wn = Object.fromEntries(world.units.map((u) => [u.c, u.n]));
    for (const [iso, c] of Object.entries(src)) {
      const groups = {};
      let gi = 0;
      const gkey = {};
      for (const u of c.units) {
        const g = u.p.grp;
        if (g && !(g in gkey)) {
          gkey[g] = 'g' + gi++;
          groups[gkey[g]] = g;
        }
      }
      adm1[iso] = {
        n: wn[iso] || c.units[0].p.name,
        g: groups,
        u: c.units.map((u) => {
          const p = u.p,
            names = {};
          for (const l of ['de', 'fr', 'es', 'sv', 'nl', 'it']) {
            const v = p['name_' + l];
            if (v && v !== (p.name_en || p.name)) names[l] = v;
          }
          const cc = u.c ? q(u.c) : null;
          return [
            p.adm1_code,
            p.name_en || p.name,
            Object.keys(names).length ? names : 0,
            p.grp ? gkey[p.grp] : 0,
            p.type_en || '',
            cc ? cc[0] : 0,
            cc ? cc[1] : 0,
            enc(ringsOfGeo(u.g)),
          ];
        }),
        l: enc(ringsOfGeo(c.land)),
        r: c.rlines.length ? enc(linesOfGeo(c.rlines)) : '',
      };
    }
  }
}
// Elevation contours for the terrain relief (tools/prepare-elevation.mjs)
const elev = fs.existsSync(A('geo/elevation.json')) ? readJSON('geo/elevation.json') : null;
const data = { dk, world, adm1, elev };

// ---------- Fonte ----------
const b64 = (p) => fs.readFileSync(A(p)).toString('base64');
const fonts = {
  Arvo: b64('fonts/arvo700.woff2'),
  'Work Sans': b64('fonts/worksans.woff2'),
  'Roboto Slab': b64('fonts/robotoslab.woff2'),
  'Space Grotesk': b64('fonts/spacegrotesk.woff2'),
  'DM Serif Display': b64('fonts/dmserif.woff2'),
  'IBM Plex Mono': b64('fonts/plexmono.woff2'),
};

// ---------- Designsystemer (designsystems/**/*.json; private/ er gitignored) ----------
const DSDIR = path.join(root, 'designsystems');
const mime = (p) =>
  ({
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
  })[path.extname(p).toLowerCase()] || 'application/octet-stream';
const dataURI = (p) => 'data:' + mime(p) + ';base64,' + fs.readFileSync(p).toString('base64');
function imageAspect(p) {
  const buf = fs.readFileSync(p);
  if (buf.slice(1, 4).toString() === 'PNG') return buf.readUInt32BE(16) / buf.readUInt32BE(20);
  if (/\.svg$/i.test(p)) {
    const t = buf.toString('utf8');
    const vb = t.match(/viewBox="[\d.\-]+ [\d.\-]+ ([\d.]+) ([\d.]+)"/);
    if (vb) return +vb[1] / +vb[2];
    const w = t.match(/\swidth="([\d.]+)/),
      h = t.match(/\sheight="([\d.]+)/);
    if (w && h) return +w[1] / +h[1];
  }
  return null;
}
const PUBLIC = process.argv.includes('--public'); // udelad designsystems/private/
const OUT = (process.argv.find((a) => a.startsWith('--out=')) || '--out=index.html').slice(6);
const walk = (d) =>
  fs
    .readdirSync(d, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? PUBLIC && e.name === 'private'
          ? []
          : walk(path.join(d, e.name))
        : e.name.endsWith('.json')
          ? [path.join(d, e.name)]
          : [],
    );
const designSystems = walk(DSDIR)
  .sort((a, b) => path.basename(a).localeCompare(path.basename(b)))
  .map((f) => {
    const dir = path.dirname(f);
    const d = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (path.relative(DSDIR, f).split(path.sep)[0] === 'private') d.private = true;
    const inlineLogo = (L, what) => {
      if (!L || !L.src || /^data:/.test(L.src)) return;
      const lp = path.join(dir, L.src);
      if (!fs.existsSync(lp)) throw new Error(path.relative(root, f) + ': ' + what + ' missing: ' + L.src);
      L.aspect = L.aspect || imageAspect(lp) || 4;
      L.src = dataURI(lp);
    };
    if (d.logo) {
      d.company = d.company || {};
      d.company.logo = d.company.logo || d.logo;
      delete d.logo;
    }
    inlineLogo(d.company && d.company.logo, 'logo');
    for (const p of d.partners || []) {
      if (typeof p.logo === 'string') p.logo = { src: p.logo };
      inlineLogo(p.logo, 'partnerlogo ' + p.name);
    }
    for (const face of (d.fonts && d.fonts.faces) || [])
      if (face.src && !/^data:/.test(face.src)) face.src = dataURI(path.join(dir, face.src));
    return d;
  });
console.log('design systems:', designSystems.map((d) => d.id).join(', '));

// ---------- App source: markup + css + js modules (src/js/NN-*.js, concatenated in name order) ----------
const SRC = path.join(root, 'src');
const jsFiles = fs
  .readdirSync(path.join(SRC, 'js'))
  .filter((f) => f.endsWith('.js'))
  .sort();
const appJs = jsFiles.map((f) => `// ---- ${f} ----\n` + fs.readFileSync(path.join(SRC, 'js', f), 'utf8')).join('\n');
let html = fs
  .readFileSync(path.join(SRC, 'app.html'), 'utf8')
  .replace('/*__CSS__*/', () => fs.readFileSync(path.join(SRC, 'app.css'), 'utf8'))
  .replace('/*__JS__*/', () => appJs);
html = html
  .replace('/*__DATA__*/', () => 'const DATA = ' + JSON.stringify(data) + ';')
  .replace('/*__FONTS__*/', () => 'const FONTS = ' + JSON.stringify(fonts) + ';')
  .replace('/*__JSPDF__*/', () => fs.readFileSync(A('jspdf.umd.min.js'), 'utf8'))
  .replace(/\/\*__DESIGNSYSTEMS__\*\/\s*\[\]/, () => JSON.stringify(designSystems))
  .replace(/\/\*__DEFAULT_PROJECT__\*\/\s*null/, () =>
    JSON.stringify(JSON.parse(fs.readFileSync(path.join(root, 'src', 'default-project.json'), 'utf8'))),
  )
  .replace(/\/\*__I18N__\*\/\s*\{\}/, () => {
    const a = JSON.parse(fs.readFileSync(path.join(root, 'src', 'i18n.json'), 'utf8'));
    const bfile = path.join(root, 'src', 'i18n-extra.json');
    if (fs.existsSync(bfile)) {
      const b = JSON.parse(fs.readFileSync(bfile, 'utf8'));
      for (const l of Object.keys(b)) a[l] = Object.assign(a[l] || {}, b[l]);
    }
    return JSON.stringify(a);
  });
fs.mkdirSync(path.dirname(path.resolve(root, OUT)), { recursive: true });
fs.writeFileSync(path.resolve(root, OUT), html);
console.log(
  OUT,
  (html.length / 1024).toFixed(0) + ' KB',
  'dk:',
  dk.units.length,
  'world:',
  world.units.length,
  'world bbox:',
  JSON.stringify(world.main),
);

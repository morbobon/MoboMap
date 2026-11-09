const MAPS = {
  dk: { unitKey: 'municipality', defaults: ['101', '751'], ex: 'København, Aarhus' },
  world: { unitKey: 'country', defaults: ['DNK', 'SWE', 'NOR', 'FIN', 'ISL'], ex: 'Denmark, Germany, Brazil' },
  adm1: { unitKey: 'region_units', defaults: [], ex: '' },
};
let TH = { l: 0, h: 0, big: 0 };
// Dataset for a country: Denmark = municipalities (DATA.dk); otherwise admin-1 decoded from DATA.adm1
// (delta-encoded integers in 0.01°, x = lon+180, y = 90-lat), cached in ADMC.
const ADMC = {};
function decRings(str) {
  if (!str) return [];
  return str.split(';').map((r) => {
    const v = r.split(',').map(Number);
    const o = new Array(v.length);
    let x = 0,
      y = 0;
    for (let i = 0; i < v.length; i += 2) {
      if (i === 0) {
        x = v[0];
        y = v[1];
      } else {
        x += v[i];
        y += v[i + 1];
      }
      o[i] = x / 100;
      o[i + 1] = y / 100;
    }
    return o;
  });
}
function bboxR(rings) {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  for (const r of rings)
    for (let i = 0; i < r.length; i += 2) {
      if (r[i] < b[0]) b[0] = r[i];
      if (r[i + 1] < b[1]) b[1] = r[i + 1];
      if (r[i] > b[2]) b[2] = r[i];
      if (r[i + 1] > b[3]) b[3] = r[i + 1];
    }
  return b;
}
function areaR(rings) {
  let a = 0;
  for (const r of rings) {
    let s = 0;
    for (let i = 0; i < r.length; i += 2) {
      const j = (i + 2) % r.length;
      s += r[i] * r[j + 1] - r[j] * r[i + 1];
    }
    a += s / 2;
  }
  return Math.abs(a);
}
function countryData(iso) {
  if (iso === 'DNK') return DATA.dk;
  if (ADMC[iso]) return ADMC[iso];
  const c = DATA.adm1[iso];
  if (!c) return null;
  const allR = decRings(c.l);
  let big = null,
    ba = 0,
    tot = 0;
  for (const r of allR) {
    const a = areaR([r]);
    tot += a;
    if (a > ba) {
      ba = a;
      big = r;
    }
  }
  const bb = big ? bboxR([big]) : [0, 0, 0, 0],
    c0 = [(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2];
  const near = (r) => {
    const b = bboxR([r]);
    let dx = Math.abs((b[0] + b[2]) / 2 - c0[0]);
    dx = Math.min(dx, 360 - dx);
    const dy = Math.abs((b[1] + b[3]) / 2 - c0[1]);
    return Math.hypot(dx, dy) < 25 || areaR([r]) > 0.15 * tot;
  };
  const units = c.u
    .map((u) => {
      // far rings are dropped, unless the whole unit is far and not tiny (Hawaii, Canaries …: insets)
      const all = decRings(u[7]);
      let d = all.filter(near);
      if (!d.length && areaR(all) > 0.05) d = all;
      const b = bboxR(d);
      return {
        c: u[0],
        n: u[1] || u[0],
        names: u[2] || null,
        r: u[3] || '_',
        typ: u[4],
        p: u[5] ? [u[5] / 100, u[6] / 100] : [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2],
        b,
        a: areaR(d),
        d,
        s: d,
        st: (c.s && c.s[u[0]]) || null, // regional statistics (Eurostat, CDC …)
      };
    })
    .filter((u) => u.d.length);
  const groups = Object.keys(c.g).length ? Object.assign({}, c.g) : { _: c.n };
  if (units.some((u) => u.r === '_') && !groups._) groups._ = c.n;
  const keepFar = units.filter((u) => !u.d.some(near));
  const land = decRings(c.l).filter((r) => {
    if (near(r)) return true;
    const b = bboxR([r]);
    return keepFar.some(
      (u) => b[0] >= u.b[0] - 0.01 && b[2] <= u.b[2] + 0.01 && b[1] >= u.b[1] - 0.01 && b[3] <= u.b[3] + 0.01,
    );
  });
  const lb = bboxR(land);
  const wu = DATA.world.units.find((u) => u.c === iso);
  return (ADMC[iso] = {
    iso,
    geo: true,
    units,
    groups,
    land: { d: land, s: land },
    inner: { d: [], s: [] },
    rlines: { d: decRings(c.r), s: decRings(c.r) },
    main: lb,
    inset: null,
    sea: [],
    alias: {},
    cityList: (DATA.world.cities || {})[iso] || [],
    cname: c.n,
    cnames: wu && wu.names,
    statsMeta: DATA.regionMeta,
  });
}
const countryName = (iso) => {
  const w = DATA.world.units.find((u) => u.c === iso);
  return w ? nm(w) : (DATA.adm1[iso] || {}).n || iso;
};

// ---- current dataset, names and lookup ----
let GEO,
  M,
  I,
  mw,
  mh,
  byName = {},
  REGC = {},
  REGI = {};
const nm = (k) => (k.names && k.names[S.lang]) || k.n;
const norm = (s) =>
  s
    .toLowerCase()
    .replace(/\s+(kommune|municipality|county)$/, '')
    .replace(/aa/g, 'å')
    .replace(/[^\p{L}\-\s]/gu, '')
    .trim();
function setData(id) {
  if (id === 'dk') id = 'DNK';
  if (!id || id === 'world') {
    S.country = '';
    S.map = 'world';
    GEO = DATA.world;
  } else {
    const g = countryData(id);
    if (!g) {
      S.country = '';
      S.map = 'world';
      GEO = DATA.world;
    } else {
      S.country = id;
      S.map = id === 'DNK' ? 'dk' : 'adm1';
      GEO = g;
    }
  }
  GEO = applyFar(GEO);
  I = GEO.inset;
  S.focus = '';
  S.zoom = { k: 1, x: 0, y: 0 };
  LC = null;
  for (const k in cache) delete cache[k];
  M = computeMain();
  mw = M[2] - M[0];
  mh = M[3] - M[1];
  const ar = GEO.units.map((u) => u.a).sort((a, b) => a - b);
  const q = (f) => ar[Math.min(ar.length - 1, Math.floor(ar.length * f))] || 0;
  TH = { l: q(0.3), h: q(0.5), big: q(0.85) };
  byName = {};
  GEO.units.forEach((k) => {
    if (k.n) byName[norm(k.n)] = k.c;
    byName[k.c.toLowerCase()] = k.c;
    if (k.names) for (const v of Object.values(k.names)) if (v) byName[norm(v)] = k.c;
  });
  REGC = {};
  REGI = {};
  Object.keys(GEO.groups).forEach((r, i) => {
    REGI[r] = i;
    let sx = 0,
      sy = 0,
      sa = 0;
    for (const k of GEO.units)
      if (k.r === r && !isBH(k)) {
        sx += k.p[0] * k.a;
        sy += k.p[1] * k.a;
        sa += k.a;
      }
    if (sa) REGC[r] = [sx / sa, sy / sa];
  });
  for (const k in cache) delete cache[k];
}
function lookup(t) {
  const n = norm(t);
  if (!n) return null;
  if (byName[n]) return byName[n];
  if (GEO.alias && GEO.alias[n]) return GEO.alias[n];
  const cand = GEO.units.filter(
    (k) =>
      norm(nm(k)).startsWith(n) ||
      norm(k.n).startsWith(n) ||
      norm(k.n)
        .split(/[\s\-]/)
        .includes(n),
  );
  return cand.length === 1 ? cand[0].c : null;
}

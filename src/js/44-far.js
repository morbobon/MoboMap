// Far-away parts of a country (Alaska and Hawaii, the Canary Islands, Bornholm …):
// shown in place, in inset boxes (each with its own equal-area projection) or hidden – S.far.
const FAR_MODES = ['inset', 'show', 'hide'];

// Which units and land rings are "far": everything not reachable from the largest landmass in steps
// shorter than a quarter of that landmass's size. Cached on the raw dataset.
function farParts(g) {
  if (g._far !== undefined) return g._far;
  if (g === DATA.dk) return (g._far = { far: new Set([g.inset.unit]) });
  if (!g.geo || !g.iso) return (g._far = null);
  let big = null,
    ba = 0;
  for (const r of g.land.s) {
    const a = areaR([r]);
    if (a > ba) ((ba = a), (big = r));
  }
  if (!big) return (g._far = null);
  const B = bboxR([big]);
  const T = 0.25 * Math.max(B[2] - B[0], B[3] - B[1], 4);
  const dist = (x, y) => Math.hypot(Math.max(0, B[0] - x, x - B[2]), Math.max(0, B[1] - y, y - B[3]));
  // near = centre within T, or bbox practically touching (Papua next to West Papua). Gap between a unit's bbox and B (units across the 180° line, e.g. Alaska, use their centre)
  const gap = (u) =>
    u.b[2] - u.b[0] > 180
      ? dist(u.p[0], u.p[1])
      : Math.hypot(Math.max(0, B[0] - u.b[2], u.b[0] - B[2]), Math.max(0, B[1] - u.b[3], u.b[1] - B[3]));
  const near = new Set();
  for (let grew = true; grew;) {
    grew = false;
    for (const u of g.units) {
      if (near.has(u.c) || (dist(u.p[0], u.p[1]) > T && gap(u) > T * 0.15)) continue;
      near.add(u.c);
      grew = true;
      if (u.b[2] - u.b[0] < 180)
        ((B[0] = Math.min(B[0], u.b[0])),
          (B[1] = Math.min(B[1], u.b[1])),
          (B[2] = Math.max(B[2], u.b[2])),
          (B[3] = Math.max(B[3], u.b[3])));
    }
  }
  let farU = g.units.filter((u) => !near.has(u.c));
  if (!farU.length) return (g._far = null);
  // clusters: far units close to each other share an inset
  const clusters = [];
  for (const u of farU) {
    const c = clusters.find((cl) => cl.some((v) => Math.hypot(v.p[0] - u.p[0], v.p[1] - u.p[1]) < T));
    if (c) c.push(u);
    else clusters.push([u]);
  }
  // a group that is a big share of the country's real area is not "far" (Peninsular Malaysia vs Borneo)
  const realA = (us) => us.reduce((t, u) => t + u.a * Math.cos(((90 - u.p[1]) * Math.PI) / 180), 0);
  const total = realA(g.units);
  for (let i = clusters.length - 1; i >= 0; i--)
    if (realA(clusters[i]) > 0.25 * total) {
      clusters[i].forEach((u) => near.add(u.c));
      clusters.splice(i, 1);
    }
  farU = clusters.flat();
  if (!farU.length) return (g._far = null);
  // a land ring is far only if it lies in a far unit (units across the 180° line: by distance alone)
  const ringNear = (r) => {
    const b = bboxR([r]),
      x = (b[0] + b[2]) / 2,
      y = (b[1] + b[3]) / 2;
    if (dist(x, y) <= T) return true;
    return !farU.some((u) => u.b[2] - u.b[0] > 180 || (x >= u.b[0] && x <= u.b[2] && y >= u.b[1] && y <= u.b[3]));
  };
  const land = g.land.s.filter(ringNear);
  return (g._far = { far: new Set(farU.map((u) => u.c)), clusters, land, main: bboxR(land) });
}

// The dataset as drawn: far units in place, in insets or removed. `xland` are units drawn in addition
// to the land outline (insets), `insets` the adm1 inset boxes.
function applyFar(g) {
  const f = farParts(g);
  if (!f) return g;
  const mode = FAR_MODES.includes(S.far) ? S.far : 'inset';
  if (g === DATA.dk) {
    const bh = g.units.find((u) => u.c === g.inset.unit);
    if (mode === 'inset') return Object.assign({}, g, { xland: [bh] });
    if (mode === 'show') {
      const m = g.main.slice();
      m[0] = Math.min(m[0], bh.b[0]);
      m[1] = Math.min(m[1], bh.b[1]);
      m[2] = Math.max(m[2], bh.b[2]);
      m[3] = Math.max(m[3], bh.b[3]);
      return Object.assign({}, g, { inset: null, xland: [bh], main: m });
    }
    return Object.assign({}, g, { inset: null, units: g.units.filter((u) => u !== bh) });
  }
  if (mode === 'show') return g;
  const units = g.units.filter((u) => mode === 'inset' || !f.far.has(u.c));
  const v = Object.assign({}, g, { units, land: { s: f.land, d: f.land }, main: f.main });
  if (mode === 'inset') {
    v.insets = f.clusters.map((cl) => ({ units: cl, c: laeaCenter(cl) }));
    v.insetOf = {};
    v.insets.forEach((ins) => ins.units.forEach((u) => (v.insetOf[u.c] = ins)));
    v.xland = f.clusters.flat();
  }
  return v;
}
function laeaCenter(units) {
  let sx = 0,
    sy = 0,
    sz = 0;
  for (const k of units) {
    const lo = (k.p[0] - 180) * RAD,
      la = (90 - k.p[1]) * RAD,
      w = Math.sqrt(k.a) || 1;
    sx += Math.cos(la) * Math.cos(lo) * w;
    sy += Math.cos(la) * Math.sin(lo) * w;
    sz += Math.sin(la) * w;
  }
  return [Math.atan2(sy, sx), Math.atan2(sz, Math.hypot(sx, sy))];
}
// Inset that a unit is drawn in (adm1 insets only while no focus is set; Bornholm always)
function insOf(k) {
  if (GEO.insetOf) return S.focus ? null : GEO.insetOf[k.c] || null;
  return I && k.c === I.unit ? I : null;
}
// Unit coordinates (x = lon+180, y = 90-lat) in the inset's own projection, before box placement
function insPrj(ins, x, y) {
  const [a, b] = laeaAt(ins.c, (x - 180) * RAD, (90 - y) * RAD);
  return [a * 100, -b * 100];
}
// Places the inset boxes in the corner of the frame b (projected map space) that covers the least of the
// mainland, and returns b extended to include them.
function layoutInsets(b) {
  const mw = b[2] - b[0],
    mh = b[3] - b[1];
  const pad = mh * 0.025;
  for (const ins of GEO.insets) {
    if (!ins.pb) {
      const pb = [Infinity, Infinity, -Infinity, -Infinity];
      for (const u of ins.units)
        for (const r of u.s)
          for (let i = 0; i < r.length; i += 2) {
            const [x, y] = insPrj(ins, r[i], r[i + 1]);
            pb[0] = Math.min(pb[0], x);
            pb[1] = Math.min(pb[1], y);
            pb[2] = Math.max(pb[2], x);
            pb[3] = Math.max(pb[3], y);
          }
      ins.pb = pb;
    }
    const pw = Math.max(1e-6, ins.pb[2] - ins.pb[0]),
      ph = Math.max(1e-6, ins.pb[3] - ins.pb[1]);
    ins.s = Math.min(1, (mh * 0.3) / ph, (mw * 0.28) / pw);
    ins.w = pw * ins.s + 2 * pad;
    ins.h = ph * ins.s + 2 * pad;
  }
  const hMax = Math.max(...GEO.insets.map((i) => i.h));
  const gapX = mw * 0.015;
  const rowW = GEO.insets.reduce((t, i) => t + i.w, 0) + gapX * (GEO.insets.length - 1);
  // mainland outline points (projected) to keep clear of
  const pts = [];
  for (const k of GEO.units)
    if (!GEO.insetOf[k.c]) for (const r of k.s) for (let i = 0; i < r.length; i += 6) pts.push(prj(r[i], r[i + 1]));
  // a row of boxes in a corner: v = 't'|'b', h = 'l'|'r'; out = how far the row sticks out of b (0..1 of its height)
  const row = (v, h, out) => {
    const y0 = v === 'b' ? b[3] + hMax * out : b[1] - hMax * out + hMax;
    let x = h === 'l' ? b[0] : b[2] - rowW;
    return GEO.insets.map((ins) => {
      const box = v === 'b' ? [x, y0 - ins.h, x + ins.w, y0] : [x, y0 - hMax, x + ins.w, y0 - hMax + ins.h];
      x += ins.w + gapX;
      return box;
    });
  };
  const hits = (boxes) =>
    pts.filter(([x, y]) => boxes.some((q) => x > q[0] && x < q[2] && y > q[1] && y < q[3])).length;
  let best = null;
  for (const [v, h] of [
    ['b', 'l'],
    ['b', 'r'],
    ['t', 'l'],
    ['t', 'r'],
  ]) {
    const boxes = row(v, h, 0.45),
      n = hits(boxes);
    if (!best || n < best.n) best = { v, h, boxes, n };
  }
  // still on top of the mainland: move the row completely outside the frame
  if (best.n > pts.length * 0.01) best.boxes = row(best.v, best.h, 1.05);
  GEO.insets.forEach((ins, i) => {
    const q = (ins.box = best.boxes[i]);
    ins.ox = q[0] + pad - ins.pb[0] * ins.s;
    ins.oy = q[1] + pad - ins.pb[1] * ins.s;
  });
  const all = best.boxes.concat([b]);
  return [
    Math.min(...all.map((q) => q[0])),
    Math.min(...all.map((q) => q[1])),
    Math.max(...all.map((q) => q[2])),
    Math.max(...all.map((q) => q[3])),
  ];
}
// Screen rectangles of the inset frames
function insetRects() {
  if (GEO.insets) {
    if (S.focus) return [];
    return GEO.insets.map((ins) => ({
      x: ins.box[0] * sc + ox,
      y: ins.box[1] * sc + oy,
      w: (ins.box[2] - ins.box[0]) * sc,
      h: (ins.box[3] - ins.box[1]) * sc,
    }));
  }
  return I ? [bhRect()] : [];
}
function setFar(v) {
  S.far = v;
  const cur = S.country || 'world';
  setData(cur);
  ui();
  render();
}

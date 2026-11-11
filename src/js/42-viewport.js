// ---- focus and framing ----
const focusUnits = () => {
  if (!S.focus) return null;
  const fc = typeof focusCity === 'function' && focusCity();
  if (fc) return cityUnits(fc);
  if (GEO.groups[S.focus]) return GEO.units.filter((k) => k.r === S.focus);
  const u = GEO.units.find((k) => k.c === S.focus);
  return u ? [u] : null;
};
const inFocus = (k) => {
  const f = focusUnits();
  return !f || f.includes(k);
};
function computeMain() {
  const key = 'main|' + (S.country || 'world') + '|' + S.proj + '|' + S.focus + '|' + S.far;
  if (cache[key]) return cache[key];
  LC = null;
  const fc = focusCity();
  if (fc) return (cache[key] = cityFrame(fc));
  const fu = focusUnits();
  let b;
  if (!GEO.geo && !fu) b = GEO.main.slice();
  else {
    b = [Infinity, Infinity, -Infinity, -Infinity];
    const units = fu || GEO.units;
    const wide = (k) => fu && fu.length > 1 && S.map === 'world' && k.b[2] - k.b[0] > 120;
    for (const k of units) {
      if (!fu && isBH(k)) continue;
      if (wide(k)) {
        let [x, y] = k.p;
        [x, y] = prj(x, y);
        if (x < b[0]) b[0] = x;
        if (y < b[1]) b[1] = y;
        if (x > b[2]) b[2] = x;
        if (y > b[3]) b[3] = y;
        continue;
      }
      const d = k.s;
      for (const r of d)
        for (let i = 0; i < r.length; i += 2) {
          let x = r[i],
            y = r[i + 1];
          if (GEO.geo) [x, y] = prj(x, y);
          if (x < b[0]) b[0] = x;
          if (y < b[1]) b[1] = y;
          if (x > b[2]) b[2] = x;
          if (y > b[3]) b[3] = y;
        }
    }
    if (!fu && GEO.insets) b = layoutInsets(b);
    if (!fu && S.map === 'world') {
      // the globe's own width at the equator, so the outline is centred
      const [x0] = prj(0, 90),
        [x1] = prj(360, 90);
      b[0] = Math.min(b[0], x0, x1);
      b[2] = Math.max(b[2], x0, x1);
    }
    if (fu) {
      const px = (b[2] - b[0]) * 0.08,
        py = (b[3] - b[1]) * 0.08;
      b = [b[0] - px, b[1] - py, b[2] + px, b[3] + py];
    }
  }
  return (cache[key] = b);
}

// ---- layout, projection to screen ----
function setLayout(id) {
  const L = layoutOf(id);
  S.layout = L.id;
  W = L.w;
  H = L.h;
  M = computeMain();
  mw = M[2] - M[0];
  mh = M[3] - M[1];
  const foot = footerHeight(); // partner rows (74-partners.js)
  FOOT = foot;
  PAD = { l: Math.round(W * 0.06), r: Math.round(W * 0.06), t: Math.round(H * 0.15), b: Math.round(H * 0.06) + foot };
  // the page's own margin and header (79-page.js); untouched, the lines above stand as they are
  const pg = pageOpts();
  if (pg.margin !== PAGE_DEFAULT.margin || pg.headerH !== PAGE_DEFAULT.headerH || !pg.header) {
    const mx = Math.round((W * pg.margin) / 100),
      my = Math.round((H * pg.margin) / 100);
    PAD = { l: mx, r: mx, t: Math.round((H * (pg.margin + (pg.header ? pg.headerH : 0))) / 100), b: my + foot };
  }
  // the box the map is fitted in: between header, footer and margins – or, for "whole page", the whole artboard
  // seen from the sheet (the sheet may be scaled into a frame)
  let box = [PAD.l, PAD.t, W - PAD.r, H - PAD.b];
  if (pg.fill === 'page') {
    const L = fxLayout();
    box = [-L.tx / L.s, -L.ty / L.s, (W - L.tx) / L.s, (H - L.ty) / L.s];
  }
  if (pg.fill === 'page' || box[2] - box[0] < 20 || box[3] - box[1] < 20) {
    // (a box squeezed to nothing by large margins is fitted the same way, so the scale never turns negative)
    const bw = Math.max(20, box[2] - box[0]),
      bh = Math.max(20, box[3] - box[1]);
    sc = Math.min(bw / mw, bh / mh);
    ox = box[0] + (box[2] - box[0] - mw * sc) / 2 - M[0] * sc;
    oy = box[1] + (box[3] - box[1] - mh * sc) / 2 - M[1] * sc;
  } else {
    sc = Math.min((W - PAD.l - PAD.r) / mw, (H - PAD.t - PAD.b) / mh);
    ox = PAD.l + (W - PAD.l - PAD.r - mw * sc) / 2 - M[0] * sc;
    oy = PAD.t + (H - PAD.t - PAD.b - mh * sc) / 2 - M[1] * sc;
  }
  const z = S.zoom;
  if (z.k !== 1 || z.x || z.y) {
    sc *= z.k;
    ox = ox * z.k + z.x;
    oy = oy * z.k + z.y;
  }
  setFill(pg, box);
  for (const k in cache) if (!k.startsWith('main|')) delete cache[k];
  const svg = document.getElementById('svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const wrap = document.getElementById('wrap');
  wrap.style.aspectRatio = W + '/' + H;
  wrap.style.width = `min(100%,calc((var(--vh, 100vh) - var(--chrome, 250px)) * ${(W / H).toFixed(4)}))`;
}
// ---- the world map to the edge of what it fills, and repeated sideways ----
// FILL: the area the world map fills, in content coordinates [x0, y0, x1, y1] ("Map fills": map area, sheet or
// whole page); null on country maps. The sea of the relief runs on to its edge (54-relief.js).
// REP: set when the world repeats sideways – a cylindrical projection with "Repeat the world" on:
//   per     one turn of the world in page units
//   cx      the middle of FILL; what exists once is drawn in the copy nearest to it (repPt)
//   e0, e1  outlines are drawn for every copy that reaches into this span (pathOf, pathLines, reliefPath)
//   tile    true while one turn is at most 2.5 times as wide as FILL: then <use> copies of the map body (#mapzr),
//           each cut to the one turn p0–p1 around cx, lie to both sides of e0–e1 (render, zoomPreview), and
//           panning never runs out of map. e0–e1 is that one turn, or all of FILL when FILL is at most one and a
//           half turns wide: the outlines of the bit to each side are then written out, which draws faster than a
//           copy, and the copies only come into view while the map is moved.
//           Zoomed further in there are no copies: the outlines are written for what is in view.
//   p0, p1  the one turn a copy shows
//   n       how many <use> copies to each side
let FILL = null,
  REP = null;
const repeatOn = () => S.map === 'world' && S.repeat !== false && !!(PROJS[S.proj] || {}).cyl;
function setFill(pg, box) {
  FILL = REP = null;
  if (S.map !== 'world') return;
  const L = fxLayout();
  FILL =
    pg.fill === 'area'
      ? [PAD.l, PAD.t, W - PAD.r, H - PAD.b]
      : pg.fill === 'page'
        ? box
        : L.active && L.P
          ? [(L.P[0] - L.tx) / L.s, (L.P[1] - L.ty) / L.s, (L.P[2] - L.tx) / L.s, (L.P[3] - L.ty) / L.s]
          : [0, 0, W, H];
  if (!repeatOn()) return;
  const per = 200 * Math.PI * sc,
    cx = (FILL[0] + FILL[2]) / 2,
    fw = FILL[2] - FILL[0],
    m = Math.max(W, H) / 2;
  // the copy under the middle of the area is the main one: what is not repeated (lines of the decorations) is in it
  ox += Math.floor((cx - (prj(0, 90)[0] * sc + ox)) / per) * per;
  const tile = per <= 2.5 * fw,
    p0 = cx - per / 2,
    p1 = cx + per / 2,
    all = fw <= 1.5 * per;
  REP = {
    per,
    cx,
    tile,
    p0,
    p1,
    e0: !tile ? FILL[0] - m : all ? Math.min(p0, FILL[0] - 8) : p0,
    e1: !tile ? FILL[2] + m : all ? Math.max(p1, FILL[2] + 8) : p1,
    n: tile ? Math.ceil((fw / 2 + 40) / per - 0.5) + 1 : 0,
  };
}
// a point that exists once (a name, a pin, a city, a stamp): in the copy nearest the middle
// The turns, counted from the main one, whose copy shows somewhere in a–b beside the body's span: the one nearest
// the middle of a–b first. A copy that shows nowhere is not drawn at all (render, zoomPreview): the browser
// would paint every outline of it only to cut it away.
function repSlots(a, b) {
  const js = [];
  for (let j = Math.floor((a - REP.p1) / REP.per); j <= Math.ceil((b - REP.p0) / REP.per); j++) {
    const x0 = Math.max(REP.p0 + j * REP.per, j > 0 ? REP.e1 : -Infinity),
      x1 = Math.min(REP.p1 + j * REP.per, j < 0 ? REP.e0 : Infinity);
    if (j && x1 > a - 2 && x0 < b + 2 && x1 > x0) js.push(j);
  }
  const m = (a + b) / 2 - REP.cx;
  return js.sort((p, q) => Math.abs(p * REP.per - m) - Math.abs(q * REP.per - m));
}
const repPt = (p) => {
  if (REP) p[0] += Math.round((REP.cx - p[0]) / REP.per) * REP.per;
  return p;
};
// The 180° line cuts Russia, Fiji and the height bands in two. Repeated, the halves meet again: a ring that ends
// on the east edge is joined with the ring that starts at the same place on the west edge, moved one turn east.
const STITCHED = new WeakMap();
function seamRuns(r) {
  // runs of two or more points in a row on the same edge: [first, last, east]
  const n = r.length / 2,
    side = (i) => (r[2 * i] < 0.02 ? 1 : r[2 * i] > 359.98 ? 2 : 0),
    runs = [];
  let st = 0;
  while (st < n && side(st) && side(st) === side((st + n - 1) % n)) st++;
  if (st === n) return runs;
  for (let q = 0; q < n; q++) {
    const i = (st + q) % n,
      sd = side(i);
    if (!sd) continue;
    let len = 1;
    while (len < n && side((i + len) % n) === sd) len++;
    if (len > 1) runs.push([i, (i + len - 1) % n, sd === 2]);
    q += len - 1;
  }
  return runs;
}
function stitchRings(rings) {
  if (STITCHED.has(rings)) return STITCHED.get(rings);
  const out = [],
    seam = [];
  for (const r of rings) {
    let t = false;
    for (let i = 0; i < r.length && !t; i += 2) t = r[i] < 0.02 || r[i] > 359.98;
    (t ? seam : out).push(r);
  }
  // from point a round to point b (both included), moved dx
  const arc = (r, a, b, dx) => {
    const n = r.length / 2,
      o = [];
    for (let i = a; ; i = (i + 1) % n) {
      o.push(r[2 * i] + dx, r[2 * i + 1]);
      if (i === b) break;
    }
    return o;
  };
  const runs = seam.map(seamRuns);
  for (let again = seam.length > 1, guard = 0; again && guard < 400; guard++) {
    again = false;
    find: for (let a = 0; a < seam.length; a++)
      for (const [ai, aj, east] of runs[a]) {
        if (!east) continue;
        const A = seam[a];
        for (let b = 0; b < seam.length; b++) {
          if (b === a) continue;
          const B = seam[b];
          for (const [bi, bj, e2] of runs[b]) {
            if (e2) continue;
            if (Math.abs(A[2 * ai + 1] - B[2 * bj + 1]) > 0.35 || Math.abs(A[2 * aj + 1] - B[2 * bi + 1]) > 0.35)
              continue;
            // A from the end of its run round to the start, then B the same way, one turn east
            const m = arc(A, aj, ai, 0).concat(arc(B, bj, bi, 360));
            for (const l of [seam, runs]) l.splice(Math.max(a, b), 1);
            seam[Math.min(a, b)] = m;
            runs[Math.min(a, b)] = seamRuns(m);
            again = true;
            break find;
          }
        }
      }
  }
  const res = out.concat(seam);
  STITCHED.set(rings, res);
  return res;
}
// ins: the inset a point belongs to (insOf) – Bornholm is shifted, adm1 insets have their own projection
const P = (x, y, ins) => {
  if (ins && ins.dx != null) {
    x += ins.dx;
    y += ins.dy;
  } else if (ins) {
    const [a, b] = insPrj(ins, x, y);
    return [(ins.ox + a * ins.s) * sc + ox, (ins.oy + b * ins.s) * sc + oy];
  }
  if (GEO.geo) {
    [x, y] = prj(x, y);
  }
  return [x * sc + ox, y * sc + oy];
};
// cull: leave out rings well outside the page (the middle level zoomed in: most of the world is off-page)
function pathOf(rings, ins, cull) {
  const m = Math.max(W, H) / 2;
  let s = '';
  if (REP && !ins) {
    // the world repeated: every copy of a ring that reaches into the span
    const xs = [],
      ys = [];
    for (const r of stitchRings(rings)) {
      let x0 = Infinity,
        y0 = Infinity,
        x1 = -Infinity,
        y1 = -Infinity;
      const n = r.length / 2;
      for (let i = 0; i < n; i++) {
        const [x, y] = P(r[2 * i], r[2 * i + 1]);
        xs[i] = x;
        ys[i] = y.toFixed(1);
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
      if (cull && !(y1 > -m && y0 < H + m)) continue;
      for (let c = Math.ceil((REP.e0 - x1) / REP.per); c <= Math.floor((REP.e1 - x0) / REP.per); c++) {
        const dx = c * REP.per;
        for (let i = 0; i < n; i++) s += (i ? 'L' : 'M') + (xs[i] + dx).toFixed(1) + ' ' + ys[i];
        s += 'Z';
      }
    }
    return s;
  }
  for (const r of rings) {
    let p = '',
      x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;
    for (let i = 0; i < r.length; i += 2) {
      const [x, y] = P(r[i], r[i + 1], ins);
      p += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
      if (cull) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
    if (!cull || (x1 > -m && x0 < W + m && y1 > -m && y0 < H + m)) s += p + 'Z';
  }
  return s;
}
function pathLines(ls) {
  let s = '';
  for (const l of ls) {
    if (REP) {
      let x0 = Infinity,
        x1 = -Infinity;
      const pts = [];
      for (let i = 0; i < l.length; i += 2) {
        const p = P(l[i], l[i + 1]);
        pts.push(p);
        if (p[0] < x0) x0 = p[0];
        if (p[0] > x1) x1 = p[0];
      }
      for (let c = Math.ceil((REP.e0 - x1) / REP.per); c <= Math.floor((REP.e1 - x0) / REP.per); c++)
        pts.forEach(([x, y], i) => (s += (i ? 'L' : 'M') + (x + c * REP.per).toFixed(1) + ' ' + y.toFixed(1)));
      continue;
    }
    for (let i = 0; i < l.length; i += 2) {
      const [x, y] = P(l[i], l[i + 1]);
      s += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
  }
  return s;
}
const isBH = (k) => !!insOf(k);
const MID_ZOOM = 3; // world map zoom above which the middle detail level is drawn
// Display → Detail: 0 auto, or always 1 simple, 2 detailed, 3 fine; "Detailed coastline" only counts in auto
const DETAIL_LEVELS = ['detail_auto', 'detail_simple', 'detail_detailed', 'detail_fine'];
function syncDetailLevel() {
  const v = S.detailLevel || 0;
  document.getElementById('detailLevel').value = v;
  document.getElementById('detailLevelV').textContent = t(DETAIL_LEVELS[v]);
  document.getElementById('detail').disabled = v > 0;
}
function setDetailLevel(v) {
  S.detailLevel = v;
  syncDetailLevel();
  render();
}
// the view the page was last drawn for (render): a gesture on the same map only moves and scales that drawing
let DRAWN = null;
// Detail levels: 0 simple, 1 detail, 2 middle (world map zoomed in: admin-1 country outlines, decoded on
// first use; see tools/prepare-world-mid.mjs)
function ringsAt(k, det) {
  if (det !== 2) return det ? k.d : k.s;
  if (!k.m) {
    const a = DATA.adm1[k.c];
    k.m = [...decRings(a && a.l), ...decRings(GEO.mid.x[k.c])];
    if (!k.m.length) k.m = k.d;
  }
  return k.m;
}
function kp(k, det) {
  const key = k.c + (det === 2 ? 'm' : det ? 'd' : 's');
  return cache[key] || (cache[key] = pathOf(ringsAt(k, det), insOf(k), det === 2));
}
function kc(k) {
  const ins = insOf(k);
  return ins ? P(k.p[0], k.p[1], ins) : repPt(P(k.p[0], k.p[1]));
}
function landPath(det) {
  const m = det === 2 && (GEO.mid.land ||= decRings(GEO.mid.l));
  return cache['land' + det] || (cache['land' + det] = pathOf(m || (det ? GEO.land.d : GEO.land.s), false, !!m));
}
function rlPath(det) {
  const m = det === 2 && (GEO.mid.rl ||= decRings(GEO.mid.r));
  return cache['rl' + det] || (cache['rl' + det] = pathLines(m || (det ? GEO.rlines.d : GEO.rlines.s)));
}
const bhRect = () => {
  const [a, b] = P(I.box[0], I.box[1]),
    [c, d] = P(I.box[2], I.box[3]);
  return { x: a, y: b, w: c - a, h: d - b };
};
const groupOf = (c) => S.groups.findIndex((g) => g.sel.has(c));

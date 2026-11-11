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
  for (const k in cache) if (!k.startsWith('main|')) delete cache[k];
  const svg = document.getElementById('svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const wrap = document.getElementById('wrap');
  wrap.style.aspectRatio = W + '/' + H;
  wrap.style.width = `min(100%,calc((var(--vh, 100vh) - var(--chrome, 250px)) * ${(W / H).toFixed(4)}))`;
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
  return P(k.p[0], k.p[1], insOf(k));
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

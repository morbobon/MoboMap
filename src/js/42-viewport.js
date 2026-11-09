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
  const L = LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
  S.layout = L.id;
  W = L.w;
  H = L.h;
  M = computeMain();
  mw = M[2] - M[0];
  mh = M[3] - M[1];
  const foot = footerHeight(); // partner rows (74-partners.js)
  FOOT = foot;
  PAD = { l: Math.round(W * 0.06), r: Math.round(W * 0.06), t: Math.round(H * 0.15), b: Math.round(H * 0.06) + foot };
  sc = Math.min((W - PAD.l - PAD.r) / mw, (H - PAD.t - PAD.b) / mh);
  ox = PAD.l + (W - PAD.l - PAD.r - mw * sc) / 2 - M[0] * sc;
  oy = PAD.t + (H - PAD.t - PAD.b - mh * sc) / 2 - M[1] * sc;
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
  wrap.style.width = `min(100%,calc((100vh - var(--chrome, 250px)) * ${(W / H).toFixed(4)}))`;
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
function pathOf(rings, ins) {
  let s = '';
  for (const r of rings) {
    for (let i = 0; i < r.length; i += 2) {
      const [x, y] = P(r[i], r[i + 1], ins);
      s += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    s += 'Z';
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
function kp(k, det) {
  const key = k.c + (det ? 'd' : 's');
  return cache[key] || (cache[key] = pathOf(det ? k.d : k.s, insOf(k)));
}
function kc(k) {
  return P(k.p[0], k.p[1], insOf(k));
}
function landPath(det) {
  return cache['land' + det] || (cache['land' + det] = pathOf(det ? GEO.land.d : GEO.land.s, false));
}
const bhRect = () => {
  const [a, b] = P(I.box[0], I.box[1]),
    [c, d] = P(I.box[2], I.box[3]);
  return { x: a, y: b, w: c - a, h: d - b };
};
const groupOf = (c) => S.groups.findIndex((g) => g.sel.has(c));

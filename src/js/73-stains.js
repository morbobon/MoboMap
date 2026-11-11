// Stains on the sheet (Effects → Stains): cup rings, double rings, spills, drops, water marks, ink blots, age spots.
// Each kind is an effect (on/off in S.fx.fx, its strength in S.fx.amt like every effect); what is the stains' own
// lives in S.stains, null = standard:
//   n     how many of a kind, where it is not the usual number (STAIN_N)
//   size  all stains larger or smaller
//   tint  what was spilt: coffee, tea, wine or ink (rings, spills and drops)
//   seed  the stains' own shuffle; 0 = the effects' seed (S.fx.seed), which is where old maps have their stains
//   at    stains placed by hand, "kind:index" → [x, y, radius]: x, y as shares of the sheet, the radius as a share
//         of the page's short side. A placed stain is pinned: shuffling moves only the others.
// Link parameter "sn", project field "stains": only what differs from the standard.
const STAIN_KINDS = FX_CATS.find((c) => c[0] === 'stains')[1];
const STAIN_N = { coffee: 2, ring2: 1, spill: 1, drops: 2, water: 3, blot: 1, age: 3 };
const STAIN_TINTS = ['coffee', 'tea', 'wine', 'ink'];
const STAIN_TINT_NAME = { coffee: 'stn_coffee', tea: 'stn_tea', wine: 'stn_wine', ink: 'stn_ink' };
const STAIN_COL = { coffee: '#6f4520', tea: '#8f641c', wine: '#7b1f3f', ink: '#262f5c' };
const STAIN_DEFAULT = { n: {}, size: 1, tint: 'coffee', seed: 0, at: {} };
const stainIs = (id) => STAIN_KINDS.includes(id);
function stainClean(o) {
  if (!o || typeof o !== 'object') return null;
  const num = (v, lo, hi, d, r) =>
    v == null || v === '' || !Number.isFinite(+v) ? d : Math.round(Math.max(lo, Math.min(hi, +v)) * r) / r;
  const n = {},
    at = {};
  for (const k of STAIN_KINDS) {
    const c = num((o.n || {})[k], 1, 9, STAIN_N[k], 1);
    if (c !== STAIN_N[k]) n[k] = c;
  }
  for (const [key, v] of Object.entries(o.at || {})) {
    const [k, i] = key.split(':');
    if (stainIs(k) && /^[0-8]$/.test(i) && Array.isArray(v))
      at[key] = [num(v[0], -0.2, 1.2, 0.5, 1000), num(v[1], -0.2, 1.2, 0.5, 1000), num(v[2], 0.008, 0.6, 0.06, 1000)];
  }
  const c = {
    n,
    size: num(o.size, 0.4, 2.5, 1, 100),
    tint: STAIN_TINTS.includes(o.tint) ? o.tint : 'coffee',
    seed: num(o.seed, 0, 99999, 0, 1),
    at,
  };
  return stainCode(c) ? c : null;
}
const stainOpts = () => S.stains || STAIN_DEFAULT;
// what a project stores: only what differs from the standard
function stainOut() {
  const o = stainOpts(),
    d = {};
  for (const k in STAIN_DEFAULT) if (JSON.stringify(o[k]) !== JSON.stringify(STAIN_DEFAULT[k])) d[k] = o[k];
  return Object.keys(d).length ? { stains: d } : {};
}
// link form: tokens joined by dots. n<kind>_<count>; z size %; t tint; s seed;
// p<kind>_<index>_<x*1000>_<y*1000>_<radius*1000> a placed stain. E.g. "n0_3.z120.t2.p0_0_250_400_70"
function stainCode(o) {
  o = o || STAIN_DEFAULT;
  const a = [];
  STAIN_KINDS.forEach((k, i) => o.n[k] != null && o.n[k] !== STAIN_N[k] && a.push(`n${i}_${o.n[k]}`));
  if (o.size !== 1) a.push('z' + Math.round(o.size * 100));
  if (o.tint !== 'coffee') a.push('t' + STAIN_TINTS.indexOf(o.tint));
  if (o.seed) a.push('s' + o.seed);
  for (const key of Object.keys(o.at).sort()) {
    const [k, i] = key.split(':');
    a.push(`p${STAIN_KINDS.indexOf(k)}_${i}_${o.at[key].map((v) => Math.round(v * 1000)).join('_')}`);
  }
  return a.join('.');
}
function stainFromCode(str) {
  const o = { n: {}, at: {} };
  for (const tok of String(str || '').split('.')) {
    const m = /^([nztsp])(.*)$/.exec(tok);
    if (!m) continue;
    const q = m[2].split('_').map(Number);
    if (m[1] === 'n' && STAIN_KINDS[q[0]]) o.n[STAIN_KINDS[q[0]]] = q[1];
    else if (m[1] === 'z') o.size = q[0] / 100;
    else if (m[1] === 't') o.tint = STAIN_TINTS[q[0]];
    else if (m[1] === 's') o.seed = q[0];
    else if (m[1] === 'p' && STAIN_KINDS[q[0]] && q.length === 5)
      o.at[STAIN_KINDS[q[0]] + ':' + q[1]] = [q[2] / 1000, q[3] / 1000, q[4] / 1000];
  }
  return stainClean(o);
}
const stainCount = (k) => (fxOn(k) ? (stainOpts().n[k] ?? STAIN_N[k]) : 0);

// ---------- where the stains are ----------
// a kind's own way to fall on the sheet: [x, y] as shares of the sheet, radius as a share of the short side.
// Cups stand near the edges and corners, the rest lands anywhere.
const stainAny = (R, lo, r0, r1) => [lo + R() * (1 - 2 * lo), lo + R() * (1 - 2 * lo), r0 + R() * r1];
const stainCup = (R, r0, r1) => {
  const corner = R() < 0.5;
  return [
    corner ? (R() < 0.5 ? 0.12 : 0.88) : 0.3 + R() * 0.4,
    corner ? 0.2 + R() * 0.6 : R() < 0.5 ? 0.15 : 0.85,
    r0 + R() * r1,
  ];
};
const STAIN_PLACE = {
  coffee: (R) => stainCup(R, 0.06, 0.04),
  ring2: (R) => stainCup(R, 0.05, 0.03),
  spill: (R) => stainAny(R, 0.18, 0.06, 0.05),
  drops: (R) => stainAny(R, 0.1, 0.045, 0.04),
  water: (R) => stainAny(R, 0.15, 0.07, 0.09),
  blot: (R) => stainAny(R, 0.12, 0.016, 0.014),
  age: (R) => stainAny(R, 0.1, 0.08, 0.07),
};
// every stain that is drawn: { key, k, x, y (shares of the sheet), rr (radius share), shape (its own seed) }
function stainList() {
  const o = stainOpts(),
    seed = o.seed || S.fx.seed,
    R = fxRng(seed),
    out = [];
  // the three water marks and the two cup rings of older maps sit where they always did: one random run,
  // water first. More of them, and every other kind, have a run of their own.
  const old = { water: [], coffee: [] };
  if (fxOn('water')) for (let i = 0; i < 3; i++) old.water.push(STAIN_PLACE.water(R));
  if (fxOn('coffee')) for (let i = 0; i < 2; i++) old.coffee.push(STAIN_PLACE.coffee(R));
  STAIN_KINDS.forEach((k, ki) => {
    for (let i = 0, n = stainCount(k); i < n; i++) {
      const key = k + ':' + i;
      const [x, y, rr] =
        o.at[key] || (old[k] && old[k][i]) || STAIN_PLACE[k](fxRng(seed * 7 + ki * 1009 + i * 53 + 11));
      out.push({ key, k, x, y, rr, shape: S.fx.seed * 13 + ki * 211 + i * 17 + 5 });
    }
  });
  return out;
}

// ---------- how a stain is drawn ----------
const stainNum = (v) => +v.toFixed(1);
// an uneven outline: a few waves around the circle. irr = how uneven (0 = a circle)
const stainWob = (R, irr) => [2, 3, 4, 5, 7].map((k) => [k, (irr * (0.4 + R())) / Math.sqrt(k), R() * 6.283]);
function stainPath(h, cx, cy, rx, ry, rot = 0) {
  const n = 26,
    pts = [],
    cr = Math.cos(rot),
    sr = Math.sin(rot);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.2832;
    let m = 1;
    for (const [k, amp, ph] of h) m += amp * Math.cos(k * a + ph);
    const x = Math.cos(a) * rx * m,
      y = Math.sin(a) * ry * m;
    pts.push([cx + x * cr - y * sr, cy + x * sr + y * cr]);
  }
  const mid = (p, q) => stainNum((p[0] + q[0]) / 2) + ' ' + stainNum((p[1] + q[1]) / 2);
  let d = 'M' + mid(pts[n - 1], pts[0]);
  for (let i = 0; i < n; i++) d += `Q${stainNum(pts[i][0])} ${stainNum(pts[i][1])} ${mid(pts[i], pts[(i + 1) % n])}`;
  return d + 'Z';
}
const stainFill = (d, c, op) => `<path d="${d}" fill="${c}" fill-opacity="${op}"/>`;
const stainLine = (d, c, op, w, dash) =>
  `<path d="${d}" fill="none" stroke="${c}" stroke-opacity="${op}" stroke-width="${stainNum(w)}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
// the ring a wet cup leaves: a pale wash, a band, and a dark broken line where the rim stood
function stainRing(R, cx, cy, r, c, op, k) {
  const h = stainWob(R, 0.02),
    edge = stainPath(h, cx, cy, r, r),
    dash = [2.4 + R() * 2, 0.1 + R() * 0.5, 1 + R() * 1.6, 0.05 + R() * 0.3].map((v) => stainNum(v * r)).join(' '),
    a = R() * 6.283;
  return (
    stainFill(edge, c, op(0.07 * k)) +
    stainLine(stainPath(h, cx, cy, r * 0.955, r * 0.955), c, op(0.2 * k), r * 0.09) +
    stainLine(edge, c, op(0.5 * k), Math.max(1, r * 0.024), dash) +
    stainLine(
      stainPath(stainWob(R, 0.03), cx + r * 0.08, cy - r * 0.05, r * 0.9, r * 0.9),
      c,
      op(0.14 * k),
      r * 0.03,
      stainNum(r * 2.2) + ' ' + stainNum(r * 1.4),
    ) +
    // where the drop ran down the cup
    stainFill(
      stainPath(stainWob(R, 0.12), cx + Math.cos(a) * r, cy + Math.sin(a) * r, r * 0.09, r * 0.07, a),
      c,
      op(0.3 * k),
    )
  );
}
// small drops around (cx, cy): between r0 and r1 away, within the angle a0 ± spread
function stainSpatter(R, n, cx, cy, r0, r1, z0, z1, a0, spread, c, of, ol) {
  let s = '';
  for (let j = 0; j < n; j++) {
    const a = a0 + (R() - 0.5) * 2 * spread,
      dist = r0 + R() * (r1 - r0),
      z = z0 + R() * R() * (z1 - z0),
      d = stainPath(stainWob(R, 0.08), cx + Math.cos(a) * dist, cy + Math.sin(a) * dist, z, z * (0.8 + R() * 0.3), a);
    s += `<path d="${d}" fill="${c}" fill-opacity="${of}" stroke="${c}" stroke-opacity="${ol}" stroke-width="${stainNum(Math.max(0.7, z * 0.14))}"/>`;
  }
  return s;
}
const STAIN_WATER = ['#7d6a48', '#6b5534'],
  STAIN_INK = '#1b2033',
  STAIN_AGE = '#8b5a2b';
// kind: (random run, centre x, y, radius, tint, op(base opacity)) → SVG
const STAIN_ART = {
  coffee: (R, x, y, r, c, op) => stainRing(R, x, y, r, c, op, 1),
  // the cup was put down twice
  ring2: (R, x, y, r, c, op) => {
    const a = R() * 6.283,
      d = r * (0.5 + R() * 0.45);
    return (
      stainRing(R, x, y, r, c, op, 1) +
      stainRing(R, x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.94 + R() * 0.08), c, op, 0.6)
    );
  },
  spill: (R, x, y, r, c, op) => {
    const rot = R() * 3.1416,
      h = stainWob(R, 0.2),
      rx = r * 1.2,
      ry = r * 0.8,
      edge = stainPath(h, x, y, rx, ry, rot);
    return (
      stainFill(edge, c, op(0.14)) +
      stainFill(
        stainPath(stainWob(R, 0.25), x + r * 0.15 * (R() - 0.5), y + r * 0.15 * (R() - 0.5), rx * 0.55, ry * 0.5, rot),
        c,
        op(0.08),
      ) +
      stainLine(stainPath(h, x, y, rx * 0.94, ry * 0.94, rot), c, op(0.1), r * 0.09) +
      stainLine(edge, c, op(0.4), Math.max(1.2, r * 0.03)) +
      stainSpatter(
        R,
        3 + Math.floor(R() * 4),
        x,
        y,
        r * 1.2,
        r * 1.75,
        r * 0.03,
        r * 0.12,
        R() * 6.283,
        0.9,
        c,
        op(0.2),
        op(0.34),
      )
    );
  },
  drops: (R, x, y, r, c, op) =>
    stainSpatter(R, 5 + Math.floor(R() * 5), x, y, 0, r, r * 0.05, r * 0.26, 0, 3.1416, c, op(0.22), op(0.42)),
  // water that dried: almost no colour, a tide line where it stopped and a fainter one inside
  water: (R, x, y, r, c, op) => {
    const h = stainWob(R, 0.14),
      rot = (R() - 0.5) * 0.6,
      edge = stainPath(h, x, y, r * 1.3, r, rot),
      [wash, line] = STAIN_WATER;
    return (
      stainFill(edge, wash, op(0.06)) +
      stainLine(stainPath(h, x, y, r * 1.24, r * 0.95, rot), line, op(0.08), r * 0.1) +
      stainLine(edge, line, op(0.34), Math.max(1.2, r * 0.02)) +
      stainLine(
        stainPath(h, x + r * 0.06 * (R() - 0.5), y + r * 0.06 * (R() - 0.5), r * 1.02, r * 0.76, rot),
        line,
        op(0.14),
        1.2,
        stainNum(r * (1.5 + R())) + ' ' + stainNum(r * 0.4),
      )
    );
  },
  // ink from a pen: a dark body, spikes and spatter
  blot: (R, x, y, r, c, op) => {
    const body = stainPath(stainWob(R, 0.12), x, y, r * 0.62, r * 0.62);
    let s = stainLine(body, STAIN_INK, op(0.2), r * 0.18) + stainFill(body, STAIN_INK, op(0.85));
    for (let j = 0, n = 5 + Math.floor(R() * 5); j < n; j++) {
      const a = R() * 6.283,
        len = r * (0.9 + R() * 0.9),
        w = r * (0.05 + R() * 0.07),
        x2 = x + Math.cos(a) * len,
        y2 = y + Math.sin(a) * len;
      s += `<path d="M${stainNum(x + Math.cos(a) * r * 0.4)} ${stainNum(y + Math.sin(a) * r * 0.4)}L${stainNum(x2)} ${stainNum(y2)}" stroke="${STAIN_INK}" stroke-opacity="${op(0.85)}" stroke-width="${stainNum(w)}" stroke-linecap="round"/><circle cx="${stainNum(x2)}" cy="${stainNum(y2)}" r="${stainNum(w * (0.7 + R() * 0.6))}" fill="${STAIN_INK}" fill-opacity="${op(0.85)}"/>`;
    }
    return (
      s +
      stainSpatter(
        R,
        4 + Math.floor(R() * 6),
        x,
        y,
        r * 1.1,
        r * 2.4,
        r * 0.03,
        r * 0.11,
        0,
        3.1416,
        STAIN_INK,
        op(0.8),
        op(0.3),
      )
    );
  },
  // foxing: the small rust-brown spots of old paper
  age: (R, x, y, r, c, op) => {
    let s = '';
    for (let j = 0, n = 9 + Math.floor(R() * 8); j < n; j++) {
      const a = R() * 6.283,
        dist = r * Math.sqrt(R()),
        z = r * (0.025 + R() * R() * 0.1),
        cx = stainNum(x + Math.cos(a) * dist),
        cy = stainNum(y + Math.sin(a) * dist);
      s += `<circle cx="${cx}" cy="${cy}" r="${stainNum(z * 2)}" fill="${STAIN_AGE}" fill-opacity="${op(0.1)}"/><circle cx="${cx}" cy="${cy}" r="${stainNum(z)}" fill="${STAIN_AGE}" fill-opacity="${op(0.22 + R() * 0.25)}"/>`;
    }
    return s;
  },
};
// how far a stain reaches from its centre, in radii (the area that is grabbed in "Edit stains")
const STAIN_REACH = { coffee: 1.08, ring2: 1.6, spill: 1.45, drops: 1.05, water: 1.35, blot: 1.9, age: 1.05 };
// one filter for every stain: a ragged outline, a soft edge, and colour that took unevenly (thin in places)
const stainDefs = (sd) =>
  `<filter id="fxstain" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".028" numOctaves="2" seed="${sd + 13}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation=".7" result="b"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 3 0 -.62" result="m"/><feComposite in="b" in2="m" operator="in"/></filter>`;
// the stains of the last drawing (for dropping and resizing one): the sheet and "kind:index" → [x, y, radius]
let STAIN_LAST = { P: [0, 0, 1, 1], at: {} };
// "Edit stains": the stains can be grabbed. Off, they let the map under them be moved and clicked.
let STAIN_EDIT = false;
const stainEditing = () => STAIN_EDIT && !lockOn('edit') && !lockOn('items') && lvMode() === 'adv';
// drawn on the sheet, in page units (55-fx.js). P = the sheet, S0 = the page's short side, main = the page itself
// (not a look's thumbnail): only there can stains be grabbed
function stainsSVG(P, S0, main) {
  const o = stainOpts(),
    edit = main && stainEditing(),
    pw = P[2] - P[0],
    ph = P[3] - P[1];
  const last = { P, at: {} };
  if (main) STAIN_LAST = last;
  let out = '';
  for (const st of stainList()) {
    last.at[st.key] = [st.x, st.y, st.rr];
    const x = P[0] + pw * st.x,
      y = P[1] + ph * st.y,
      r = S0 * st.rr * o.size;
    const art = STAIN_ART[st.k](fxRng(st.shape), x, y, r, STAIN_COL[o.tint], (b) => fxOp(st.k, b));
    if (!edit) {
      out += `<g>${art}</g>`;
      continue;
    }
    // being dragged (70-ui.js): the offset is in content units, the sheet is in page units
    const [dx, dy] = (S.drag && S.drag['sn:' + st.key]) || [0, 0];
    out += `<g class="drg stn" data-drag="sn:${st.key}" pointer-events="all"${dx || dy ? ` transform="translate(${stainNum(dx * FXL.s)},${stainNum(dy * FXL.s)})"` : ''}><circle cx="${stainNum(x)}" cy="${stainNum(y)}" r="${stainNum(Math.max(12, r * STAIN_REACH[st.k]))}" fill="#000" fill-opacity="0"/><g filter="url(#fxstain)" pointer-events="none">${art}</g></g>`;
  }
  // one filter over all of them: a filter for each costs a moving map several ms a frame
  return edit || !out ? out : `<g filter="url(#fxstain)" pointer-events="none">${out}</g>`;
}

// ---------- placing by hand ----------
const stainPin = (key, v) => {
  const o = stainOpts();
  S.stains = stainClean(Object.assign({}, o, { at: Object.assign({}, o.at, { [key]: v }) }));
};
// a stain was dropped: it keeps that place (and is pinned)
function stainDrop(key) {
  const d = (S.drag || {})[key],
    a = STAIN_LAST.at[key.slice(3)],
    P = STAIN_LAST.P;
  const rest = Object.assign({}, S.drag);
  delete rest[key];
  S.drag = rest;
  if (!d || !a) return;
  stainPin(key.slice(3), [a[0] + (d[0] * FXL.s) / (P[2] - P[0]), a[1] + (d[1] * FXL.s) / (P[3] - P[1]), a[2]]);
  stainSync();
}
// double-click: a placed stain is let go, back among the shuffled ones (true = handled)
function stainDbl(key) {
  if (!key.startsWith('sn:')) return false;
  const o = stainOpts(),
    at = Object.assign({}, o.at);
  if (!at[key.slice(3)]) return true;
  delete at[key.slice(3)];
  S.stains = stainClean(Object.assign({}, o, { at }));
  stainSync();
  render();
  return true;
}
// wheel and corner handle (71-page-items.js): the stain's radius
pageItem({
  has: (key) => key.startsWith('sn:') && stainEditing(),
  get: (key) => (STAIN_LAST.at[key.slice(3)] || [0, 0, 0.06])[2],
  set: (key, v) => {
    const a = STAIN_LAST.at[key.slice(3)];
    if (a) stainPin(key.slice(3), [a[0], a[1], v]);
  },
  lo: 0.008,
  hi: 0.6,
  step: 0.001,
  sync: () => stainSync(),
});

// ---------- panel (the end of Effects → Stains) ----------
// soft: a slider being moved – draw on the next frame and leave the panel alone
function stainSet(k, v, soft) {
  S.stains = stainClean(Object.assign({}, stainOpts(), { [k]: v }));
  if (soft) return fxRenderSoon();
  stainSync();
  render();
}
function stainSetN(k, n) {
  stainSet('n', Object.assign({}, stainOpts().n, { [k]: n }));
}
// only the stains move: they get a seed of their own. Placed stains stay.
function stainShuffle() {
  stainSet('seed', 1 + Math.floor(Math.random() * 9999));
}
// before the effects' seed changes: the stains keep the one they had
function stainKeepSeed() {
  const o = stainOpts();
  if (!o.seed && STAIN_KINDS.some((k) => S.fx.fx.includes(k)))
    S.stains = stainClean(Object.assign({}, o, { seed: S.fx.seed }));
}
function stainEdit(on) {
  STAIN_EDIT = !!on;
  stainSync();
  render();
}
// the placed stains that are drawn now
const stainPins = () =>
  Object.keys(stainOpts().at).filter((key) => +key.split(':')[1] < stainCount(key.split(':')[0])).length;
// how many of a kind: beside the kind's chip
const stainCountUI = (id) =>
  `<input type="number" class="stn-n" min="1" max="9" step="1" value="${stainOpts().n[id] ?? STAIN_N[id]}" title="${esc(t('stn_count'))}" aria-label="${esc(t('stn_count'))}" onchange="stainSetN('${id}', +this.value)"/>`;
function stainPanelBody() {
  const o = stainOpts(),
    any = STAIN_KINDS.some((k) => S.fx.fx.includes(k)),
    pins = stainPins(),
    locked = lockOn('edit') || lockOn('items'),
    pct = Math.round(o.size * 100);
  let h = '';
  if (any) {
    h +=
      `<label class="fxrow"><span>${esc(t('stn_size'))}</span><input type="range" min="40" max="250" step="5" value="${pct}" oninput="stainSet('size', this.value / 100, true); this.nextElementSibling.textContent = this.value + ' %'"/><b>${pct} %</b></label>` +
      `<label class="fxrow" title="${esc(t('stn_tint_t'))}"><span>${esc(t('stn_tint'))}</span><select onchange="stainSet('tint', this.value)">${STAIN_TINTS.map(
        (id) => `<option value="${id}"${o.tint === id ? ' selected' : ''}>${esc(t(STAIN_TINT_NAME[id]))}</option>`,
      ).join('')}</select></label>` +
      `<label class="ck" title="${esc(t('stn_edit_t'))}"><input type="checkbox" id="stnEdit"${STAIN_EDIT && !locked ? ' checked' : ''}${locked ? ' disabled' : ''} onchange="stainEdit(this.checked)"/> <span>${esc(t('stn_edit'))}</span></label>` +
      (STAIN_EDIT && !locked ? `<p class="note">${esc(t('stn_edit_t'))}</p>` : '');
  }
  return (
    h +
    `<div class="row"><button class="chip sm" onclick="stainShuffle()">${esc(t('fx_shuffle'))}</button>` +
    (pins ? `<button class="chip sm" onclick="stainSet('at', {})">${esc(t('stn_release'))} (${pins})</button>` : '') +
    '</div>'
  );
}
const stainPanel = () => `<div id="stainUI">${stainPanelBody()}</div>`;
// the panel follows a stain that was placed, resized or let go on the map
function stainSync() {
  const el = document.getElementById('stainUI');
  if (el) el.innerHTML = stainPanelBody();
}

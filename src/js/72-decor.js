// Decorations (Look tab, under Map style): compass, rhumb lines, map border, scale bar, graticule, stamps and
// corner flourishes. Whether compass, rhumb lines and border are on still lives in S.fx.fx ("compass", "rhumb",
// "border"), so older links and projects keep them; how they look lives in S.deco, stored (project "deco", link
// "dc=") only where it differs from DECO_DEFAULT.
//   compass …     style, size, colour ('ink' = text colour, 'accent', or a hex colour), opacity, true north
//   border …      style, thickness, distance from the sheet edge (% of the short side), colour, corners;
//                 the gap between border and content is the page ring "border" (S.page.border, 79-page.js)
//   hubs …        rhumb hubs: how many (0 = as the map suggests), 16 / 32 lines, one more at the compass,
//                 hubAt[i] = [lon, lat] for a hub the user dragged
//   scale, unit   scale bar: 'off' | 'line' | 'bar', km or miles
//   grat …        graticule: a line every N degrees (0 = off), with degree numbers
//   flourish …    corner flourishes
//   stamps        [{ k: kind, x: lon, y: lat, s: size }] – they sit on the map and follow it
const DECO_DEFAULT = {
  compass: 'classic',
  compassSize: 1,
  compassCol: 'ink',
  compassOp: 1,
  north: false,
  border: 'chart',
  borderW: 1,
  borderDist: 3,
  borderCol: 'ink',
  corner: 'square',
  hubs: 0,
  lines: 32,
  fromCompass: false,
  hubAt: [],
  scale: 'off',
  unit: 'km',
  grat: 0,
  gratLabels: false,
  flourish: 'off',
  flourishSize: 1,
  stamps: [],
};
const DECO_COMPASS = ['classic', 'star', 'arrow', 'ring', 'nautical', 'fleur'];
const DECO_BORDER = ['single', 'double', 'thickthin', 'chart', 'ruler', 'dotted', 'rope', 'meander', 'wave', 'corners'];
const DECO_CORNER = ['square', 'round', 'orn'];
const DECO_SCALE = ['off', 'line', 'bar'];
const DECO_GRAT = [0, 5, 10, 15, 30];
const DECO_FLOUR = ['off', 'curl', 'deco', 'leaf'];
const DECO_STAMP = ['ship', 'serpent', 'whale', 'skull', 'anchor', 'flag', 'chest', 'palm', 'cross'];
const DECO_NAME = {
  classic: 'dc_cs_classic',
  star: 'dc_cs_star',
  arrow: 'dc_cs_arrow',
  ring: 'dc_cs_ring',
  nautical: 'dc_cs_nautical',
  fleur: 'dc_cs_fleur',
  single: 'dc_bs_single',
  double: 'dc_bs_double',
  thickthin: 'dc_bs_thickthin',
  chart: 'dc_bs_chart',
  ruler: 'dc_bs_ruler',
  dotted: 'dc_bs_dotted',
  rope: 'dc_bs_rope',
  meander: 'dc_bs_meander',
  wave: 'dc_bs_wave',
  corners: 'dc_bs_corners',
  square: 'dc_bk_square',
  round: 'dc_bk_round',
  orn: 'dc_bk_orn',
  line: 'dc_sb_line',
  bar: 'dc_sb_bar',
  curl: 'dc_fl_curl',
  deco: 'dc_fl_deco',
  leaf: 'dc_fl_leaf',
  ship: 'dc_sm_ship',
  serpent: 'dc_sm_serpent',
  whale: 'dc_sm_whale',
  skull: 'dc_sm_skull',
  anchor: 'dc_sm_anchor',
  flag: 'dc_sm_flag',
  chest: 'dc_sm_chest',
  palm: 'dc_sm_palm',
  cross: 'dc_sm_cross',
  ink: 'dc_col_ink',
  accent: 'dc_col_accent',
  own: 'dc_col_own',
};
const DECO_PAPER = '#f6efe0';
function decoClean(o) {
  o = o && typeof o === 'object' ? o : {};
  const D = DECO_DEFAULT;
  const pick = (v, list, d) => (list.includes(v) ? v : d);
  const num = (v, lo, hi, d, k = 100) =>
    v == null || v === '' || !Number.isFinite(+v) ? d : Math.round(Math.max(lo, Math.min(hi, +v)) * k) / k;
  const col = (v) => (v === 'accent' || (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)) ? v.toLowerCase() : 'ink');
  const ll = (p) =>
    Array.isArray(p) && Number.isFinite(+p[0]) && Number.isFinite(+p[1])
      ? [num(p[0], -180, 180, 0), num(p[1], -89, 89, 0)]
      : null;
  const hubAt = (Array.isArray(o.hubAt) ? o.hubAt : []).slice(0, 6).map(ll);
  while (hubAt.length && !hubAt[hubAt.length - 1]) hubAt.pop();
  return {
    compass: pick(o.compass, DECO_COMPASS, D.compass),
    compassSize: num(o.compassSize, 0.4, 3, 1),
    compassCol: col(o.compassCol),
    compassOp: num(o.compassOp, 0.1, 1, 1),
    north: !!o.north,
    border: pick(o.border, DECO_BORDER, D.border),
    borderW: num(o.borderW, 0.3, 3, 1),
    borderDist: num(o.borderDist, 0, 10, D.borderDist, 10),
    borderCol: col(o.borderCol),
    corner: pick(o.corner, DECO_CORNER, D.corner),
    hubs: num(o.hubs, 0, 6, 0, 1),
    lines: +o.lines === 16 ? 16 : 32,
    fromCompass: !!o.fromCompass,
    hubAt,
    scale: pick(o.scale, DECO_SCALE, D.scale),
    unit: o.unit === 'mi' ? 'mi' : 'km',
    grat: pick(+o.grat, DECO_GRAT, 0),
    gratLabels: !!o.gratLabels,
    flourish: pick(o.flourish, DECO_FLOUR, D.flourish),
    flourishSize: num(o.flourishSize, 0.4, 3, 1),
    stamps: (Array.isArray(o.stamps) ? o.stamps : [])
      .filter((s) => s && DECO_STAMP.includes(s.k) && ll([s.x, s.y]))
      .slice(0, 40)
      .map((s) => ({ k: s.k, x: num(s.x, -180, 180, 0, 1000), y: num(s.y, -89, 89, 0, 1000), s: num(s.s, 0.3, 4, 1) })),
  };
}
const decoOpts = () => S.deco || DECO_DEFAULT;
// what a project stores: only what differs from the standard
function decoOut() {
  const o = decoClean(S.deco),
    d = {};
  for (const k in DECO_DEFAULT) if (JSON.stringify(o[k]) !== JSON.stringify(DECO_DEFAULT[k])) d[k] = o[k];
  return Object.keys(d).length ? { deco: d } : {};
}
// link form: tokens joined by dots. A token is a code and a whole number, an index or a colour (a = accent, else
// six hex digits): c compass style, cz size %, cc colour, co opacity %, cn true north; b border style, bw thickness %,
// bd distance in tenths of a percent, bc colour, bk corners; h hubs, l16 sixteen lines, hc a hub at the compass,
// hp<i>_<lon*100>_<lat*100> a moved hub; s scale bar style, sm miles; g graticule step, gl its numbers;
// f flourish, fz its size %; t<kind>_<lon*1000>_<lat*1000>_<size %> a stamp. E.g. "c5.cca.b4.g10.gl"
function decoCode(o) {
  const p = decoClean(o),
    D = DECO_DEFAULT,
    a = [],
    pct = (v) => Math.round(v * 100),
    colC = (v) => (v === 'accent' ? 'a' : v.slice(1));
  if (p.compass !== D.compass) a.push('c' + DECO_COMPASS.indexOf(p.compass));
  if (p.compassSize !== 1) a.push('cz' + pct(p.compassSize));
  if (p.compassCol !== 'ink') a.push('cc' + colC(p.compassCol));
  if (p.compassOp !== 1) a.push('co' + pct(p.compassOp));
  if (p.north) a.push('cn');
  if (p.border !== D.border) a.push('b' + DECO_BORDER.indexOf(p.border));
  if (p.borderW !== 1) a.push('bw' + pct(p.borderW));
  if (p.borderDist !== D.borderDist) a.push('bd' + Math.round(p.borderDist * 10));
  if (p.borderCol !== 'ink') a.push('bc' + colC(p.borderCol));
  if (p.corner !== D.corner) a.push('bk' + DECO_CORNER.indexOf(p.corner));
  if (p.hubs) a.push('h' + p.hubs);
  if (p.lines === 16) a.push('l16');
  if (p.fromCompass) a.push('hc');
  p.hubAt.forEach((h, i) => h && a.push(`hp${i}_${pct(h[0])}_${pct(h[1])}`));
  if (p.scale !== 'off') a.push('s' + DECO_SCALE.indexOf(p.scale));
  if (p.unit === 'mi') a.push('sm');
  if (p.grat) a.push('g' + p.grat);
  if (p.gratLabels) a.push('gl');
  if (p.flourish !== 'off') a.push('f' + DECO_FLOUR.indexOf(p.flourish));
  if (p.flourishSize !== 1) a.push('fz' + pct(p.flourishSize));
  for (const s of p.stamps)
    a.push(`t${DECO_STAMP.indexOf(s.k)}_${Math.round(s.x * 1000)}_${Math.round(s.y * 1000)}_${pct(s.s)}`);
  return a.join('.');
}
function decoFromCode(str) {
  const o = { hubAt: [], stamps: [] };
  const colD = (v) => (v === 'a' ? 'accent' : '#' + v);
  for (const tok of String(str || '').split('.')) {
    const m = /^(cz|cc|co|cn|bw|bd|bc|bk|hc|hp|sm|gl|fz|[cbhlsgft])(.*)$/.exec(tok);
    if (!m) continue;
    const v = m[2],
      n = v === '' ? NaN : +v,
      q = v.split('_').map(Number);
    if (m[1] === 'c') o.compass = DECO_COMPASS[n];
    else if (m[1] === 'cz') o.compassSize = n / 100;
    else if (m[1] === 'cc') o.compassCol = colD(v);
    else if (m[1] === 'co') o.compassOp = n / 100;
    else if (m[1] === 'cn') o.north = true;
    else if (m[1] === 'b') o.border = DECO_BORDER[n];
    else if (m[1] === 'bw') o.borderW = n / 100;
    else if (m[1] === 'bd') o.borderDist = n / 10;
    else if (m[1] === 'bc') o.borderCol = colD(v);
    else if (m[1] === 'bk') o.corner = DECO_CORNER[n];
    else if (m[1] === 'h') o.hubs = n;
    else if (m[1] === 'l') o.lines = n;
    else if (m[1] === 'hc') o.fromCompass = true;
    else if (m[1] === 'hp' && q[0] >= 0 && q[0] < 6) o.hubAt[q[0]] = [q[1] / 100, q[2] / 100];
    else if (m[1] === 's') o.scale = DECO_SCALE[n];
    else if (m[1] === 'sm') o.unit = 'mi';
    else if (m[1] === 'g') o.grat = n;
    else if (m[1] === 'gl') o.gratLabels = true;
    else if (m[1] === 'f') o.flourish = DECO_FLOUR[n];
    else if (m[1] === 'fz') o.flourishSize = n / 100;
    else if (m[1] === 't') o.stamps.push({ k: DECO_STAMP[q[0]], x: q[1] / 1000, y: q[2] / 1000, s: q[3] / 100 });
  }
  return decoClean(o);
}
// soft: a slider being moved – draw on the next frame and leave the panel alone
function decoSet(k, v, soft) {
  S.deco = decoClean(Object.assign({}, decoOpts(), { [k]: v }));
  if (soft) return fxRenderSoon();
  decoUI();
  render();
}
const decoCol = (sel, ink, accent) => (sel === 'ink' ? ink : sel === 'accent' ? accent : sel);
const decoN = (v) => +v.toFixed(1);
const decoDragOf = (k) => (S.drag && S.drag[k]) || [0, 0];
// the box the map fills between header, footer and margins (page units)
const decoArea = () => [PAD.l, PAD.t, W - PAD.r, H - PAD.b];
// a draggable group (70-ui.js); the offset the user dragged it by is applied here
function decoDrg(key, inner, a = '') {
  const [dx, dy] = decoDragOf(key);
  return `<g class="drg" data-drag="${key}" pointer-events="all"${dx || dy ? ` transform="translate(${dx.toFixed(1)},${dy.toFixed(1)})"` : ''}${a}>${inner}</g>`;
}

// ---------- compass ----------
function decoCompassAt() {
  const [x, y] = compassPos(),
    [dx, dy] = decoDragOf('compass');
  return [x + dx, y + dy];
}
const decoCompassR = () =>
  Math.min(W, H) * 0.075 * (0.75 + 0.25 * Math.min(2, fxAmt('compass'))) * decoOpts().compassSize;
// a fleur-de-lis standing on (0, y0), s high
function decoFleur(y0, s, fill, ink) {
  return `<g transform="translate(0 ${decoN(y0)}) scale(${s.toFixed(2)})" fill="${fill}" stroke="${ink}" stroke-width=".03"><path d="M0,-1C.18,-.7 .18,-.4 0,-.15C-.18,-.4 -.18,-.7 0,-1Z"/><path d="M-.05,-.2C-.15,-.55 -.5,-.6 -.5,-.35C-.5,-.22 -.38,-.2 -.33,-.3C-.33,-.15 -.2,-.1 -.05,-.2Z"/><path d="M.05,-.2C.15,-.55 .5,-.6 .5,-.35C.5,-.22 .38,-.2 .33,-.3C.33,-.15 .2,-.1 .05,-.2Z"/><path d="M-.22,-.2h.44v.08h-.44ZM0,-.12L.12,.05L0,0L-.12,.05Z"/></g>`;
}
// the rose around (0, 0), north up
function decoCompassArt(style, r, ink, acc) {
  if (style === 'classic') return compassSVG(0, 0, r, ink, acc);
  const n = decoN;
  const pt = (a, len) => [n(Math.sin(a) * len), n(-Math.cos(a) * len)];
  // a point of the star: a filled and a paper half
  const spike = (a, len, w, fill) => {
    const tip = pt(a, len),
      l = pt(a - Math.PI / 2, w),
      rr = pt(a + Math.PI / 2, w);
    return `<polygon points="0,0 ${l} ${tip}" fill="${fill}" stroke="${ink}" stroke-width=".5"/><polygon points="0,0 ${rr} ${tip}" fill="${DECO_PAPER}" stroke="${ink}" stroke-width=".5"/>`;
  };
  // count points; lens[i % lens.length] = [length, half width, fill], the short ones drawn first
  const star = (count, lens) =>
    Array.from({ length: count }, (_, i) => [(i * 2 * Math.PI) / count, ...lens[i % lens.length]])
      .sort((a, b) => a[1] - b[1])
      .map(([a, len, w, fill]) => spike(a, r * len, r * w, fill))
      .join('');
  const ring = (k, sw, col = ink, op = 1) =>
    `<circle r="${n(r * k)}" fill="none" stroke="${col}" stroke-width="${sw}" opacity="${op}"/>`;
  const txt = (s, x, y, size, a = '') =>
    `<text x="${n(x)}" y="${n(y)}" text-anchor="middle" font-family="Georgia,serif" font-size="${n(size)}" font-weight="700" fill="${ink}"${a}>${s}</text>`;
  const ticks = (count, k0, k1, sw) => {
    let d = '';
    for (let i = 0; i < count; i++) {
      const a = (i * 2 * Math.PI) / count;
      d += `M${pt(a, r * k0).join(' ')}L${pt(a, r * k1).join(' ')}`;
    }
    return `<path d="${d}" stroke="${ink}" stroke-width="${sw}" fill="none"/>`;
  };
  const dot = `<circle r="${n(r * 0.06)}" fill="${ink}"/>`;
  let o = '';
  if (style === 'star')
    o =
      star(8, [
        [1, 0.13, acc],
        [0.45, 0.1, ink],
      ]) +
      dot +
      txt('N', 0, -r * 1.1, r * 0.3);
  else if (style === 'arrow')
    o = `<polygon points="0,${n(-r)} ${n(-r * 0.38)},${n(r * 0.75)} 0,${n(r * 0.45)}" fill="${ink}" stroke="${ink}" stroke-width=".8" stroke-linejoin="round"/><polygon points="0,${n(-r)} ${n(r * 0.38)},${n(r * 0.75)} 0,${n(r * 0.45)}" fill="${DECO_PAPER}" stroke="${ink}" stroke-width=".8" stroke-linejoin="round"/>${txt('N', 0, -r * 1.1, r * 0.34)}`;
  else if (style === 'ring')
    o =
      ring(0.8, 1.6) +
      ticks(4, 0.8, 0.95, 1.6) +
      ticks(8, 0.72, 0.8, 0.8) +
      `<polygon points="0,${n(-r * 0.66)} ${n(-r * 0.13)},0 ${n(r * 0.13)},0" fill="${acc}" stroke="${ink}" stroke-width=".6"/><polygon points="0,${n(r * 0.66)} ${n(-r * 0.13)},0 ${n(r * 0.13)},0" fill="${DECO_PAPER}" stroke="${ink}" stroke-width=".6"/>` +
      dot +
      txt('N', 0, -r * 1.02, r * 0.3);
  else if (style === 'nautical') {
    // degree ring, a band of small triangles, a 16-point star and a fleur-de-lis for north
    o = ring(1, 1.2) + ring(0.9, 0.6) + ticks(72, 0.9, 0.95, 0.5) + ticks(36, 0.9, 1, 0.7);
    for (let d = 30; d < 360; d += 30) {
      const [x, y] = pt((d * Math.PI) / 180, r * 1.12);
      o += txt(d, x, y + r * 0.04, r * 0.11, ' font-weight="400"');
    }
    o += ring(0.7, 0.8) + ring(0.58, 0.8);
    let tri = '';
    for (let i = 0; i < 32; i++) {
      const a = (i * Math.PI) / 16,
        h = Math.PI / 32;
      tri += `M${pt(a - h, r * 0.58).join(' ')}L${pt(a, r * 0.7).join(' ')}L${pt(a + h, r * 0.58).join(' ')}Z`;
    }
    o +=
      `<path d="${tri}" fill="${ink}" opacity=".75"/>` +
      star(16, [
        [0.86, 0.1, acc],
        [0.3, 0.06, ink],
        [0.56, 0.08, ink],
        [0.3, 0.06, ink],
      ]) +
      ring(0.1, 0.8) +
      dot +
      decoFleur(-r * 1.02, r * 0.34, acc, ink);
  } else {
    // 'fleur': a small star in a ring, north marked by a fleur-de-lis (old sea charts)
    o =
      ring(0.6, 1.4, acc) +
      ring(0.6, 0.5) +
      ring(0.52, 0.5) +
      star(8, [
        [1, 0.12, acc],
        [0.6, 0.1, ink],
      ]) +
      dot +
      decoFleur(-r * 0.98, r * 0.4, acc, ink);
  }
  return `<g pointer-events="none">${o}</g>`;
}
// how far north is turned from "up" at a place on the page, in degrees (0 where the map cannot tell)
function decoNorthAt(x, y) {
  const p = worldInv(x, y);
  if (!p) return 0;
  const [x2, y2] = worldPt(p[0], Math.max(0.5, p[1] - 0.5));
  const a = (Math.atan2(x2 - x, y - y2) * 180) / Math.PI;
  return Number.isFinite(a) ? Math.round(a * 10) / 10 : 0;
}
function decoCompass(ink, accent) {
  if (!fxOn('compass')) return '';
  const o = decoOpts(),
    [cx, cy] = compassPos(),
    [ax, ay] = decoCompassAt();
  const col = decoCol(o.compassCol, ink, accent);
  const rot = o.north ? decoNorthAt(ax, ay) : 0;
  const art = decoCompassArt(o.compass, decoCompassR(), col, o.compassCol === 'accent' ? ink : accent);
  return decoDrg(
    'compass',
    fxTwice(
      'compass',
      (op) =>
        `<g opacity="${(op * o.compassOp).toFixed(3)}" transform="translate(${decoN(cx)} ${decoN(cy)})${rot ? ` rotate(${rot})` : ''}"><circle r="${decoN(decoCompassR())}" fill="transparent"/>${art}</g>`,
    ),
  );
}
pageItem({
  has: (key) => key === 'compass' && fxOn('compass'),
  get: () => decoOpts().compassSize,
  set: (key, v) => (S.deco = decoClean(Object.assign({}, decoOpts(), { compassSize: v }))),
  lo: 0.4,
  hi: 3,
  step: 0.01,
  sync: () => decoUI(),
});

// ---------- rhumb lines ----------
const DECO_WORLD_HUBS = [
  [-20, -32],
  [150, 32],
  [-105, -42],
];
// the hubs as [lon, lat]: the map's own (55-fx.js), more of them spread around the first, or where the user put them
function decoHubs() {
  const o = decoOpts(),
    base = rhumbHubs(),
    out = [];
  const n = o.hubs || base.length;
  for (let i = 0; i < n; i++) {
    let h = o.hubAt[i] || base[i];
    if (!h && S.map === 'world' && !S.focus) h = DECO_WORLD_HUBS[i - 3];
    if (!h && base.length > 1) {
      const [a, b] = base,
        ang = (i - 1) * 1.9,
        dx = b[0] - a[0],
        dy = b[1] - a[1];
      h = [
        a[0] + dx * Math.cos(ang) - dy * Math.sin(ang),
        Math.max(-85, Math.min(85, a[1] + dx * Math.sin(ang) + dy * Math.cos(ang))),
      ];
    }
    out.push(h || null);
  }
  return out;
}
// where the hubs are on the page (a hub being dragged follows the pointer)
function decoHubPts() {
  return decoHubs().map((h, i) => {
    if (!h) return null;
    const [x, y] = repPt(worldPt(h[0] + 180, 90 - h[1])),
      [dx, dy] = decoDragOf('rh:' + i);
    return Number.isFinite(x) && Number.isFinite(y) ? [x + dx, y + dy] : null;
  });
}
function decoRhumb(ink) {
  if (!fxOn('rhumb')) return '';
  const o = decoOpts(),
    L = (W + H) * 3,
    n = o.lines,
    main = n / 8;
  const pts = decoHubPts().filter(Boolean);
  if (o.fromCompass && fxOn('compass')) pts.push(decoCompassAt());
  let s = `<g data-rhumb stroke="${ink}" stroke-opacity="${fxOp('rhumb', 0.22)}" stroke-width=".6" pointer-events="none">`;
  for (const [cx, cy] of pts) {
    for (let i = 0; i < n; i++) {
      const a = (i * 2 * Math.PI) / n;
      s += `<line x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${(cx + Math.cos(a) * L).toFixed(1)}" y2="${(cy + Math.sin(a) * L).toFixed(1)}" ${i % main ? 'stroke-dasharray="4 3"' : ''}/>`;
    }
    s += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3" fill="none" stroke-dasharray="none"/>`;
  }
  return s + '</g>';
}
// the grips of the hubs, over the map (not on a map that cannot be edited)
function decoHubGrips() {
  if (!fxOn('rhumb') || lockOn('edit') || lockOn('items')) return '';
  return decoHubPts()
    .map((p, i) =>
      p
        ? `<g class="drg" data-drag="rh:${i}" pointer-events="all"><circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="7" fill="transparent"/></g>`
        : '',
    )
    .join('');
}

// ---------- map border ----------
function decoBorderGeo(S0) {
  const o = decoOpts();
  return { e: (o.borderDist / 100) * S0, bw: 0.012 * S0 * o.borderW, gap: (ringVal('border') / 100) * S0 };
}
// the room the border takes on each side of the sheet (content is fitted inside it)
function decoBorderRoom(S0) {
  if (!fxOn('border')) return 0;
  const g = decoBorderGeo(S0);
  return g.e + g.bw + g.gap;
}
// P: the sheet [x0, y0, x1, y1] in artboard units
function decoBorder(P, S0, ink, accent) {
  if (!fxOn('border')) return '';
  const o = decoOpts(),
    { e, bw } = decoBorderGeo(S0),
    n = decoN,
    col = decoCol(o.borderCol, ink, accent),
    st = o.border;
  const q = [P[0] + e, P[1] + e, P[2] - e, P[3] - e],
    qi = [q[0] + bw, q[1] + bw, q[2] - bw, q[3] - bw];
  if (qi[2] - qi[0] < bw * 4 || qi[3] - qi[1] < bw * 4) return '';
  const rx = o.corner === 'round' ? bw * 1.6 : 0;
  const inset = (b, d) => [b[0] + d, b[1] + d, b[2] - d, b[3] - d];
  const rect = (b, sw, a = '', r = 0) =>
    `<rect x="${n(b[0])}" y="${n(b[1])}" width="${n(b[2] - b[0])}" height="${n(b[3] - b[1])}"${r > 0 ? ` rx="${n(r)}"` : ''} fill="none" stroke="${col}" stroke-width="${n(sw)}" ${a}/>`;
  // the four sides between the corner squares: u runs along a side, v across the band (0 = its outer edge)
  const sides = [
    [q[2] - q[0], (u, v) => [q[0] + u, q[1] + v]],
    [q[3] - q[1], (u, v) => [q[2] - v, q[1] + u]],
    [q[2] - q[0], (u, v) => [q[2] - u, q[3] - v]],
    [q[3] - q[1], (u, v) => [q[0] + v, q[3] - u]],
  ];
  // repeats a unit along every side; f(w, i) gives the unit's lines as lists of [u, v], w = the unit's fitted length
  const run = (unit, f) => {
    let d = '';
    for (const [len, m] of sides) {
      const L = len - 2 * bw,
        k = Math.max(1, Math.round(L / unit)),
        w = L / k;
      for (let i = 0; i < k; i++)
        for (const line of f(w, i))
          d += line
            .map(
              ([u, v], j) =>
                (j ? 'L' : 'M') +
                m(bw + i * w + u, v)
                  .map(n)
                  .join(' '),
            )
            .join('');
    }
    return d;
  };
  const path = (d, a) => `<path d="${d}" ${a}/>`;
  const stroke = (sw, a = '') => `fill="none" stroke="${col}" stroke-width="${n(sw)}" ${a}`;
  let s = '';
  if (st === 'single') s = rect(q, Math.max(1, bw * 0.22), '', rx);
  else if (st === 'double') s = rect(q, 1.2, '', rx) + rect(qi, 1.2, '', rx - bw);
  else if (st === 'thickthin') s = rect(inset(q, bw * 0.25), bw * 0.5, '', rx) + rect(qi, 0.8, '', rx - bw);
  else if (st === 'chart')
    s =
      path(
        run(S0 * 0.03, (w, i) =>
          i % 2
            ? []
            : [
                [
                  [0, 0],
                  [w, 0],
                  [w, bw],
                  [0, bw],
                ],
              ],
        ),
        `fill="${col}" opacity=".55"`,
      ) +
      rect(q, 1.4) +
      rect(qi, 0.8) +
      rect(inset(q, -4), 0.6, 'opacity=".7"');
  else if (st === 'ruler')
    // a tinted band with graduations and a dashed line inside it (engraved sea charts)
    s =
      `<path d="M${n(q[0])} ${n(q[1])}H${n(q[2])}V${n(q[3])}H${n(q[0])}ZM${n(qi[0])} ${n(qi[1])}V${n(qi[3])}H${n(qi[2])}V${n(qi[1])}Z" fill="${col}" opacity="${o.borderCol === 'ink' ? 0.14 : 0.5}"/>` +
      path(
        run(S0 * 0.03, (w) => [
          [
            [0, 0],
            [0, bw],
          ],
          ...[1, 2, 3, 4].map((j) => [
            [(w * j) / 5, bw * 0.55],
            [(w * j) / 5, bw],
          ]),
        ]),
        stroke(0.6),
      ) +
      rect(q, 1.2) +
      rect(qi, 0.9) +
      rect(inset(qi, 3.5), 1.1, 'stroke-dasharray="5 3"');
  else if (st === 'dotted')
    s = rect(inset(q, bw / 2), bw * 0.5, `stroke-dasharray="0 ${n(bw * 1.1)}" stroke-linecap="round"`, rx);
  else if (st === 'rope')
    s =
      path(
        run(bw * 0.9, (w) => [
          [
            [0, bw * 0.85],
            [w * 0.75, bw * 0.15],
          ],
        ]),
        stroke(bw * 0.3, 'stroke-linecap="round"'),
      ) +
      rect(q, 0.7) +
      rect(qi, 0.7);
  else if (st === 'meander')
    s =
      path(
        run(bw * 1.7, (w) => [
          [
            [w * 0.1, bw],
            [w * 0.1, bw * 0.12],
            [w * 0.85, bw * 0.12],
            [w * 0.85, bw * 0.72],
            [w * 0.4, bw * 0.72],
            [w * 0.4, bw * 0.42],
            [w * 0.62, bw * 0.42],
          ],
        ]),
        stroke(Math.max(0.8, bw * 0.12)),
      ) + rect(qi, Math.max(0.8, bw * 0.12));
  else if (st === 'wave') {
    const wave = (ph) => (w) => [
      Array.from({ length: 9 }, (_, j) => [(w * j) / 8, bw * (0.5 - 0.3 * Math.sin((j / 8) * 2 * Math.PI + ph))]),
    ];
    s =
      path(run(bw * 2.2, wave(0)), stroke(0.9)) +
      path(run(bw * 2.2, wave(Math.PI)), stroke(0.9, 'opacity=".6"')) +
      rect(q, 1) +
      rect(qi, 1);
  }
  // corners: the "corners only" style, or ornaments on top of another style
  const cs = [
    [q[0], q[1], 1, 1],
    [q[2], q[1], -1, 1],
    [q[2], q[3], -1, -1],
    [q[0], q[3], 1, -1],
  ];
  if (st === 'corners') {
    const Lc = S0 * 0.08;
    let d = '',
      d2 = '';
    for (const [x, y, sx, sy] of cs) {
      d += `M${n(x + sx * Lc)} ${n(y)}H${n(x)}V${n(y + sy * Lc)}`;
      d2 += `M${n(x + sx * (bw + Lc * 0.55))} ${n(y + sy * bw)}H${n(x + sx * bw)}V${n(y + sy * (bw + Lc * 0.55))}`;
    }
    s = path(d, stroke(Math.max(1.2, bw * 0.3))) + path(d2, stroke(0.8));
  }
  if (o.corner === 'orn' || st === 'corners')
    for (const [x, y, sx, sy] of cs) {
      const cx = x + (sx * bw) / 2,
        cy = y + (sy * bw) / 2,
        h = Math.max(3, bw * 0.75);
      s += `<path d="M${n(cx)} ${n(cy - h)}L${n(cx + h)} ${n(cy)}L${n(cx)} ${n(cy + h)}L${n(cx - h)} ${n(cy)}Z" fill="${col}"/><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(h * 0.3)}" fill="${DECO_PAPER}"/>`;
    }
  return `<g data-border pointer-events="none" opacity="${fxOp('border', 1)}">${s}</g>`;
}

// ---------- scale bar ----------
// The scale is measured east–west at the middle of the map area. Where it changes by more than a tenth between the
// top and the bottom of the map (world maps, small scales) the bar says which latitude it holds at.
function decoScaleAt(x, y) {
  const p = worldInv(x, y);
  if (!p) return null;
  const lat = 90 - p[1],
    c = Math.cos((lat * Math.PI) / 180);
  if (c < 0.02) return null;
  const a = worldPt(p[0] - 0.05, p[1]),
    b = worldPt(p[0] + 0.05, p[1]),
    k = Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.1 / (111.32 * c); // page units per km
  return Number.isFinite(k) && k > 0 ? { lat, k } : null;
}
function decoScaleInfo() {
  const o = decoOpts(),
    A = decoArea(),
    mx = (A[0] + A[2]) / 2,
    my = (A[1] + A[3]) / 2,
    h = A[3] - A[1];
  const m = decoScaleAt(mx, my);
  if (!m) return null;
  const top = decoScaleAt(mx, A[1] + h * 0.1),
    bot = decoScaleAt(mx, A[3] - h * 0.1);
  const varies = !top || !bot || Math.abs(top.k - bot.k) / m.k > 0.1;
  const per = o.unit === 'mi' ? 1.609344 : 1; // km in a unit
  const want = (W * 0.16) / m.k / per,
    p10 = 10 ** Math.floor(Math.log10(want)),
    nice = [5, 2, 1].find((v) => v * p10 <= want) * p10;
  return { len: nice * per * m.k, nice, unit: o.unit, lat: m.lat, varies };
}
function decoScale(ink) {
  const o = decoOpts();
  if (o.scale === 'off') return '';
  const i = decoScaleInfo();
  if (!i || !(i.len > 4) || i.len > W) return '';
  const A = decoArea(),
    S0 = Math.min(W, H),
    n = decoN,
    x = (A[0] + A[2] - i.len) / 2,
    y = A[3] - S0 * 0.045,
    num = (v) => String(+v.toPrecision(3)),
    at = i.varies ? ` (${Math.round(Math.abs(i.lat))}° ${i.lat >= 0 ? 'N' : 'S'})` : '';
  const txt = (s, tx, anchor) =>
    `<text x="${n(tx)}" y="${n(y + 15)}" text-anchor="${anchor}" font-family="Georgia,serif" font-size="10" fill="${ink}">${s}</text>`;
  let s = '';
  if (o.scale === 'bar') {
    const w = i.len / 4;
    for (let j = 0; j < 4; j++)
      s += `<rect x="${n(x + j * w)}" y="${n(y - 5)}" width="${n(w)}" height="5" fill="${j % 2 ? 'none' : ink}" stroke="${ink}" stroke-width=".8"/>`;
    s += txt(num(i.nice / 2), x + i.len / 2, 'middle');
  } else
    s = `<path d="M${n(x)} ${n(y - 6)}V${n(y)}H${n(x + i.len)}V${n(y - 6)}M${n(x + i.len / 2)} ${n(y - 3)}V${n(y)}" fill="none" stroke="${ink}" stroke-width="1.2"/>`;
  s += txt('0', x, 'middle') + txt(num(i.nice) + ' ' + i.unit + at, x + i.len, 'middle');
  // the gaps of the bar grab it too
  s = `<rect x="${n(x)}" y="${n(y - 8)}" width="${n(i.len)}" height="26" fill="transparent"/>` + s;
  return decoDrg('scalebar', s);
}

// ---------- graticule ----------
let DECO_GRAT_LINES = null; // the lines of the last drawing, for the degree numbers: [{ deg, mer, pts }]
// the longitudes and latitudes in view: [lon0, lon1, lat0, lat1]
function decoGratRange(step) {
  const lons = [],
    lats = [];
  let miss = 0;
  for (let i = 0; i <= 6; i++)
    for (let j = 0; j <= 6; j++) {
      const p = worldInv((W * i) / 6, (H * j) / 6);
      if (p && p[0] >= 0 && p[0] <= 360 && p[1] >= 0 && p[1] <= 180) (lons.push(p[0] - 180), lats.push(90 - p[1]));
      else miss++;
    }
  if (!lons.length) return null;
  const pad = step * (miss ? 3 : 1);
  let r = [Math.min(...lons) - pad, Math.max(...lons) + pad, Math.min(...lats) - pad, Math.max(...lats) + pad];
  if ((miss && S.map === 'world' && !S.focus && !S.country) || r[1] - r[0] > 300) r = [-180, 180, -90, 90];
  if (REP) {
    // the world repeated: the degrees run on past 180, over every copy that is drawn
    const wx = P(0, 90)[0],
      lon = (x) => ((x - wx) / REP.per) * 360 - 180;
    return [lon(REP.e0), lon(REP.e1), Math.max(-85, r[2]), Math.min(85, r[3])];
  }
  return [Math.max(-180, r[0]), Math.min(180, r[1]), Math.max(-85, r[2]), Math.min(85, r[3])];
}
function decoGrat(ink) {
  DECO_GRAT_LINES = null;
  const step = decoOpts().grat;
  if (!step) return '';
  const r = decoGratRange(step);
  if (!r) return '';
  const lines = [],
    up = (v) => Math.ceil(v / step - 1e-9) * step;
  const sample = (f, a, b, k) => {
    const pts = [];
    for (let i = 0; i <= k; i++) {
      const [lon, lat] = f(a + ((b - a) * i) / k),
        [x, y] = worldPt(lon + 180, 90 - lat);
      pts.push(Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null);
    }
    return pts;
  };
  if ((r[1] - r[0] + r[3] - r[2]) / step > 160) return '';
  for (let lon = up(r[0]); lon <= r[1] + 1e-9; lon += step)
    if (REP || lon < 180 || r[0] > -180)
      lines.push({
        deg: REP ? ((((lon + 180) % 360) + 360) % 360) - 180 : lon,
        mer: true,
        pts: sample((v) => [lon, v], r[2], r[3], 36),
      });
  for (let lat = up(r[2]); lat <= r[3] + 1e-9; lat += step)
    lines.push({ deg: lat, mer: false, pts: sample((v) => [v, lat], r[0], r[1], 72) });
  let d = '';
  for (const l of lines) {
    let pen = false,
      last = null;
    for (const p of l.pts) {
      // a jump across the page is the map's edge (the 180° line), not a line to draw
      if (!p || (last && Math.hypot(p[0] - last[0], p[1] - last[1]) > W * 0.4)) pen = false;
      if (p) ((d += (pen ? 'L' : 'M') + decoN(p[0]) + ' ' + decoN(p[1])), (pen = true));
      last = p;
    }
  }
  DECO_GRAT_LINES = lines;
  return `<path data-grat d="${d}" fill="none" stroke="${ink}" stroke-width=".5" stroke-opacity=".32" pointer-events="none"/>`;
}
// the numbers: where a line leaves the map area, or where it ends inside it
function decoGratLabels(ink) {
  if (!DECO_GRAT_LINES || !decoOpts().gratLabels) return '';
  const A = decoArea(),
    n = decoN,
    used = { t: [], b: [], l: [], r: [] };
  let s = '';
  const put = (side, x, y, anchor, text) => {
    const at = side === 't' || side === 'b' ? x : y;
    if (used[side].some((v) => Math.abs(v - at) < 24)) return;
    used[side].push(at);
    s += `<text x="${n(x)}" y="${n(y)}" text-anchor="${anchor}">${text}</text>`;
  };
  const inA = (p) => p && p[0] >= A[0] && p[0] <= A[2] && p[1] >= A[1] && p[1] <= A[3];
  // where the piece from an inside point p to an outside point q crosses the edge of the map area
  const cross = (p, q) => {
    let k = 1;
    if (q[0] < A[0]) k = Math.min(k, (A[0] - p[0]) / (q[0] - p[0]));
    if (q[0] > A[2]) k = Math.min(k, (A[2] - p[0]) / (q[0] - p[0]));
    if (q[1] < A[1]) k = Math.min(k, (A[1] - p[1]) / (q[1] - p[1]));
    if (q[1] > A[3]) k = Math.min(k, (A[3] - p[1]) / (q[1] - p[1]));
    return [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
  };
  for (const l of DECO_GRAT_LINES) {
    // the ends of the line as seen in the map area: where it leaves it, or where it stops inside it
    const ends = [];
    l.pts.forEach((p, i) => {
      if (!inA(p)) return;
      for (const q of [l.pts[i - 1], l.pts[i + 1]]) {
        if (inA(q)) continue;
        ends.push(q && Math.hypot(q[0] - p[0], q[1] - p[1]) < W * 0.4 ? cross(p, q) : p);
      }
    });
    if (!ends.length) continue;
    const a = Math.abs(Math.round(l.deg * 10) / 10);
    const text = a + '°' + (a === 0 || a === 180 ? '' : l.mer ? (l.deg < 0 ? 'W' : 'E') : l.deg < 0 ? 'S' : 'N');
    if (l.mer) {
      const lo = ends.reduce((m, p) => (p[1] > m[1] ? p : m)),
        hi = ends.reduce((m, p) => (p[1] < m[1] ? p : m));
      put('b', lo[0], Math.min(lo[1] + 11, A[3] - 4), 'middle', text);
      if (lo[1] - hi[1] > 30) put('t', hi[0], Math.max(hi[1] - 4, A[1] + 10), 'middle', text);
    } else {
      const le = ends.reduce((m, p) => (p[0] < m[0] ? p : m)),
        ri = ends.reduce((m, p) => (p[0] > m[0] ? p : m));
      put('l', Math.max(le[0] - 3, A[0] + 24), le[1] + 3, 'end', text);
      if (ri[0] - le[0] > 60) put('r', Math.min(ri[0] + 3, A[2] - 24), ri[1] + 3, 'start', text);
    }
  }
  return `<g data-gratlabels font-family="Georgia,serif" font-size="9" fill="${ink}" opacity=".85" pointer-events="none">${s}</g>`;
}

// ---------- stamps ----------
// drawn around (0, 0) in a box of about -1 … 1; i = ink, a = accent
const DECO_STAMP_ART = {
  ship: (i) =>
    `<path d="M-.9,.35H.9L.65,.75H-.6Z" fill="${i}"/><path d="M-.3,.35V-.85M.3,.35V-.68M.9,.35L1.12,.15" stroke="${i}" stroke-width=".05" fill="none"/><path d="M-.64,-.72Q-.3,-.6 .04,-.72V-.2Q-.3,-.08 -.64,-.2ZM.08,-.56Q.3,-.46 .58,-.56V-.04Q.3,.06 .08,-.04Z" fill="${DECO_PAPER}" stroke="${i}" stroke-width=".05" stroke-linejoin="round"/><path d="M-.3,-.84L-.02,-.92L-.3,-1Z" fill="${i}"/><path d="M-1,.93q.17,-.13 .33,0t.33,0t.33,0t.33,0t.33,0t.33,0" stroke="${i}" stroke-width=".05" fill="none"/>`,
  serpent: (i) =>
    `<path d="M-.92,.32A.26,.34 0 0 1 -.4,.32M-.24,.32A.26,.38 0 0 1 .28,.32M.46,.32C.46,-.3 .56,-.62 .82,-.58C1,-.54 1,-.32 .8,-.33" stroke="${i}" stroke-width=".15" stroke-linecap="round" fill="none"/><path d="M-1.04,.3l-.06,-.34l.2,.2Z" fill="${i}"/><circle cx=".82" cy="-.47" r=".04" fill="${DECO_PAPER}"/><path d="M-1.1,.42q.18,-.12 .36,0t.36,0t.36,0t.36,0t.36,0t.36,0" stroke="${i}" stroke-width=".05" fill="none"/>`,
  whale: (i) =>
    `<path d="M-.9,.1C-.6,-.5 .5,-.5 .8,.1C.5,.45 -.5,.45 -.9,.1ZM.75,.1L1.06,-.26L.98,.1L1.06,.42Z" fill="${i}"/><circle cx="-.6" cy=".04" r=".05" fill="${DECO_PAPER}"/><path d="M-.3,-.4C-.3,-.8 -.56,-.86 -.62,-.7M-.3,-.4C-.3,-.8 -.04,-.86 .02,-.7" stroke="${i}" stroke-width=".05" fill="none" stroke-linecap="round"/><path d="M-1,.62q.17,-.12 .33,0t.33,0t.33,0t.33,0t.33,0t.33,0" stroke="${i}" stroke-width=".05" fill="none"/>`,
  skull: (i) =>
    `<path d="M-.9,.85Q-.1,.3 .85,-.55M.9,.85Q.1,.3 -.85,-.55" stroke="${i}" stroke-width=".09" stroke-linecap="round" fill="none"/><path d="M-.98,.72l.2,.2M.98,.72l-.2,.2" stroke="${i}" stroke-width=".12" stroke-linecap="round"/><circle cy="-.12" r=".5" fill="${i}"/><path d="M-.27,.2h.54v.36h-.54Z" fill="${i}"/><circle cx="-.19" cy="-.14" r=".13" fill="${DECO_PAPER}"/><circle cx=".19" cy="-.14" r=".13" fill="${DECO_PAPER}"/><path d="M0,.04l.07,.14h-.14ZM-.1,.38v.18M0,.38v.18M.1,.38v.18" fill="${DECO_PAPER}" stroke="${DECO_PAPER}" stroke-width=".035"/>`,
  anchor: (i) =>
    `<circle cy="-.76" r=".13" fill="none" stroke="${i}" stroke-width=".08"/><path d="M0,-.63V.8M-.36,-.4H.36" stroke="${i}" stroke-width=".11" stroke-linecap="round" fill="none"/><path d="M-.66,.25C-.6,.76 -.2,.82 0,.82C.2,.82 .6,.76 .66,.25" stroke="${i}" stroke-width=".12" fill="none"/><path d="M-.84,.34L-.64,.06L-.48,.38ZM.84,.34L.64,.06L.48,.38Z" fill="${i}"/>`,
  flag: (i) =>
    `<path d="M-.6,-.98V.98" stroke="${i}" stroke-width=".08" stroke-linecap="round"/><path d="M-.6,-.9C-.2,-1.05 .2,-.7 .82,-.85V-.08C.2,.07 -.2,-.28 -.6,-.13Z" fill="${i}"/><circle cx=".1" cy="-.56" r=".17" fill="${DECO_PAPER}"/><path d="M-.14,-.32L.34,-.22M-.14,-.22L.34,-.32" stroke="${DECO_PAPER}" stroke-width=".06" stroke-linecap="round"/><circle cx=".04" cy="-.58" r=".04" fill="${i}"/><circle cx=".16" cy="-.58" r=".04" fill="${i}"/>`,
  chest: (i) =>
    `<path d="M-.78,-.05C-.78,-.68 .78,-.68 .78,-.05Z" fill="${DECO_PAPER}" stroke="${i}" stroke-width=".07" stroke-linejoin="round"/><path d="M-.78,-.05H.78V.68H-.78Z" fill="${DECO_PAPER}" stroke="${i}" stroke-width=".07" stroke-linejoin="round"/><path d="M-.42,-.46V.68M.42,-.46V.68" stroke="${i}" stroke-width=".1"/><path d="M-.11,-.12h.22v.3h-.22Z" fill="${i}"/>`,
  palm: (i) =>
    `<path d="M-.05,.9C0,.3 .08,-.1 .15,-.36" stroke="${i}" stroke-width=".13" stroke-linecap="round" fill="none"/><path d="M.15,-.36q-.42,-.4 -.84,-.06M.15,-.36q-.3,-.6 -.66,-.5M.15,-.36q.08,-.56 .46,-.56M.15,-.36q.42,-.36 .8,-.02M.15,-.36q.46,-.04 .62,.36M.15,-.36q-.4,0 -.5,.36" stroke="${i}" stroke-width=".1" stroke-linecap="round" fill="none"/><path d="M-.62,.92q.56,-.2 1.12,0" stroke="${i}" stroke-width=".06" stroke-linecap="round" fill="none"/>`,
  cross: (i, a) => `<path d="M-.6,-.6L.6,.6M.6,-.6L-.6,.6" stroke="${a}" stroke-width=".24" stroke-linecap="round"/>`,
};
const decoStampR = (s) => Math.min(W, H) * 0.035 * s.s;
function decoStamps(ink, accent) {
  return decoOpts()
    .stamps.map((s, i) => {
      const [x, y] = repPt(worldPt(s.x + 180, 90 - s.y)),
        [dx, dy] = decoDragOf('sm:' + i);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return '';
      return `<g class="drg" data-drag="sm:${i}" pointer-events="all"><g transform="translate(${decoN(x + dx)} ${decoN(y + dy)}) scale(${decoStampR(s).toFixed(2)})">${DECO_STAMP_ART[s.k](ink, accent)}</g></g>`;
    })
    .join('');
}
// a new stamp goes to the middle of the map area (a little aside for each one already there)
function decoStampAdd(k) {
  const A = decoArea(),
    o = decoOpts(),
    step = Math.min(W, H) * 0.11;
  let p = null;
  for (let i = 0; i < 8 && !p; i++) {
    const j = o.stamps.length + i;
    p = worldInv((A[0] + A[2]) / 2 + ((j % 5) - 2) * step, (A[1] + A[3]) / 2 + ((Math.floor(j / 5) % 3) - 1) * step);
  }
  if (!p) return toast(t('dc_offmap'));
  decoSet('stamps', o.stamps.concat([{ k, x: p[0] - 180, y: 90 - p[1], s: 1 }]));
}
function decoStampSet(i, k, v, soft) {
  const list = decoOpts().stamps.map((s) => Object.assign({}, s));
  if (!list[i]) return;
  if (k === 'del') list.splice(i, 1);
  else list[i][k] = v;
  decoSet('stamps', list, soft);
}
pageItem({
  has: (key) => key.startsWith('sm:') && !!decoOpts().stamps[+key.slice(3)],
  get: (key) => decoOpts().stamps[+key.slice(3)].s,
  set: (key, v) => {
    const list = decoOpts().stamps.map((s) => Object.assign({}, s));
    list[+key.slice(3)].s = v;
    S.deco = decoClean(Object.assign({}, decoOpts(), { stamps: list }));
  },
  lo: 0.3,
  hi: 4,
  step: 0.01,
  sync: () => decoUI(),
});
// a hub or a stamp was dropped: it keeps the place on the map it was dropped at
function decoDrop(key) {
  const d = (S.drag || {})[key];
  if (!d) return;
  const i = +key.slice(3),
    o = decoOpts(),
    hub = key.startsWith('rh:');
  const cur = hub ? decoHubs()[i] : o.stamps[i] && [o.stamps[i].x, o.stamps[i].y];
  const rest = Object.assign({}, S.drag);
  delete rest[key];
  S.drag = rest;
  if (!cur) return;
  const [px, py] = repPt(worldPt(cur[0] + 180, 90 - cur[1])),
    w = worldInv(px + d[0], py + d[1]);
  if (!w) return toast(t('dc_offmap'));
  const ll = [w[0] - 180, 90 - w[1]];
  if (hub) {
    const at = o.hubAt.slice();
    at[i] = ll;
    S.deco = decoClean(Object.assign({}, o, { hubAt: at }));
  } else {
    const list = o.stamps.map((s) => Object.assign({}, s));
    Object.assign(list[i], { x: ll[0], y: ll[1] });
    S.deco = decoClean(Object.assign({}, o, { stamps: list }));
  }
}
// double-click: a moved hub goes back to its own place (true = handled)
function decoDbl(key) {
  if (!key.startsWith('rh:')) return key.startsWith('sm:');
  const at = decoOpts().hubAt.slice();
  at[+key.slice(3)] = null;
  decoSet('hubAt', at);
  return true;
}

// ---------- corner flourishes ----------
// drawn for the top left corner in a box of 0 … 1, mirrored into the other three
const DECO_FLOUR_ART = {
  curl: (i) =>
    `<path d="M0,1C0,.35 .35,0 1,0M.12,.56C.12,.25 .5,.2 .5,.42C.5,.55 .35,.56 .34,.46M.56,.12C.25,.12 .2,.5 .42,.5C.55,.5 .56,.35 .46,.34" fill="none" stroke="${i}" stroke-width=".035" stroke-linecap="round"/><circle cx=".1" cy=".1" r=".04" fill="${i}"/>`,
  deco: (i) =>
    `<path d="M0,.9V0H.9" fill="none" stroke="${i}" stroke-width=".05"/><path d="M.12,.6V.12H.6" fill="none" stroke="${i}" stroke-width=".025"/><path d="M.2,.2h.12v.12h-.12Z" fill="${i}"/>`,
  leaf: (i) =>
    `<path d="M.04,.9C.04,.3 .3,.04 .9,.04" fill="none" stroke="${i}" stroke-width=".03" stroke-linecap="round"/><path d="M.08,.58q.22,-.04 .24,-.24q-.22,.02 -.24,.24ZM.22,.32q.2,.04 .3,-.14q-.2,-.06 -.3,.14ZM.5,.13q.16,.12 .32,0q-.16,-.12 -.32,0Z" fill="${i}"/>`,
};
function decoFlourish(ink) {
  const o = decoOpts(),
    art = DECO_FLOUR_ART[o.flourish];
  if (!art) return '';
  const S0 = Math.min(W, H),
    m = S0 * 0.03,
    z = (S0 * 0.1 * o.flourishSize).toFixed(1),
    a = art(ink);
  return (
    '<g data-flourish pointer-events="none">' +
    [
      [m, m, 1, 1],
      [W - m, m, -1, 1],
      [W - m, H - m, -1, -1],
      [m, H - m, 1, -1],
    ]
      .map(([x, y, sx, sy]) => `<g transform="translate(${decoN(x)} ${decoN(y)}) scale(${sx * z} ${sy * z})">${a}</g>`)
      .join('') +
    '</g>'
  );
}

// ---------- the hooks render() reaches through 55-fx.js ----------
// in the map group, over the map: graticule, stamps, the grips of the rhumb hubs
// (the graticule is part of the map body, which the repeated world copies: fxMap in 55-fx.js)
const decoMapTop = (ink, accent) => decoStamps(ink, accent) + decoHubGrips();
// over everything, in page units: degree numbers, flourishes, scale bar, compass
const decoTop = (ink, accent) => decoGratLabels(ink) + decoFlourish(ink) + decoScale(ink) + decoCompass(ink, accent);

// ---------- the panel ----------
function decoUI() {
  const el = document.getElementById('decoUI');
  if (!el) return;
  const o = decoOpts(),
    name = (id) => esc(t(DECO_NAME[id]));
  const row = (label, body) => `<label class="fxrow"><span>${esc(label)}</span>${body}</label>`;
  const sel = (key, ids, cur, label = name) =>
    `<select onchange="decoSet('${key}', this.value)">${ids.map((id) => `<option value="${id}"${id === cur ? ' selected' : ''}>${label(id)}</option>`).join('')}</select>`;
  // a slider for a value shown as v * k with a unit
  const rng = (call, min, max, step, val, unit) =>
    `<input type="range" min="${min}" max="${max}" step="${step}" value="${val}" oninput="${call}; this.nextElementSibling.textContent = this.value + '${unit}'"/><b>${val}${unit}</b>`;
  const pct = (key, min, max, v) =>
    rng(`decoSet('${key}', this.value / 100, 1)`, min, max, 1, Math.round(v * 100), ' %');
  const ck = (key, on, label) =>
    `<label class="ck"><input type="checkbox"${on ? ' checked' : ''} onchange="decoSet('${key}', this.checked)"/> <span>${esc(label)}</span></label>`;
  const colour = (key, v) => {
    const own = v !== 'ink' && v !== 'accent';
    return (
      row(
        t('dc_colour'),
        `<select onchange="decoSet('${key}', this.value === 'own' ? '#b08d2f' : this.value)">${['ink', 'accent', 'own'].map((id) => `<option value="${id}"${(own ? 'own' : v) === id ? ' selected' : ''}>${name(id)}</option>`).join('')}</select>`,
      ) + (own ? row('', `<input type="color" value="${v}" oninput="decoSet('${key}', this.value, 1)"/>`) : '')
    );
  };
  const chip = (on, call, label) =>
    `<button class="chip sm ${on ? 'on' : ''}" onclick="${call}">${esc(label)}</button>`;
  const head = (label) => `<div class="fxcat">${esc(label)}</div>`;
  const on = { compass: fxOn('compass'), rhumb: fxOn('rhumb'), border: fxOn('border') };
  let h =
    '<div class="row">' +
    chip(on.compass, "setFx('compass')", t('fx_compass')) +
    chip(on.rhumb, "setFx('rhumb')", t('fx_rhumb')) +
    chip(on.border, "setFx('border')", t('fx_border')) +
    chip(o.scale !== 'off', `decoSet('scale', '${o.scale === 'off' ? 'line' : 'off'}')`, t('dc_scale')) +
    chip(!!o.grat, `decoSet('grat', ${o.grat ? 0 : 10})`, t('dc_grat')) +
    chip(o.flourish !== 'off', `decoSet('flourish', '${o.flourish === 'off' ? 'curl' : 'off'}')`, t('dc_flour')) +
    '</div>';
  if (on.compass)
    h +=
      head(t('fx_compass')) +
      row(t('dc_style'), sel('compass', DECO_COMPASS, o.compass)) +
      row(t('tx_size'), pct('compassSize', 40, 300, o.compassSize)) +
      row(t('dc_opacity'), pct('compassOp', 10, 100, o.compassOp)) +
      colour('compassCol', o.compassCol) +
      ck('north', o.north, t('dc_truenorth'));
  if (on.rhumb) {
    const amt = Math.round((S.fx.amt && S.fx.amt.rhumb != null ? S.fx.amt.rhumb : 1) * 100);
    h +=
      head(t('fx_rhumb')) +
      row(
        t('dc_hubs'),
        sel('hubs', [0, 1, 2, 3, 4, 5, 6], o.hubs, (v) => (v ? v : esc(t('dc_auto')))),
      ) +
      row(t('dc_lines'), sel('lines', [16, 32], o.lines, String)) +
      row(t('dc_strength'), rng("setFxAmt('rhumb', +this.value)", 5, 200, 5, amt, ' %')) +
      ck('fromCompass', o.fromCompass, t('dc_fromcompass')) +
      `<div class="row"><span class="note">${esc(t('dc_hub_tip'))}</span>${o.hubAt.some(Boolean) ? chip(false, "decoSet('hubAt', [])", t('dc_hubs_reset')) : ''}</div>`;
  }
  if (on.border)
    h +=
      head(t('fx_border')) +
      row(t('dc_style'), sel('border', DECO_BORDER, o.border)) +
      row(t('dc_thick'), pct('borderW', 30, 300, o.borderW)) +
      row(t('dc_dist'), rng("decoSet('borderDist', +this.value, 1)", 0, 10, 0.5, o.borderDist, ' %')) +
      row(t('dc_gap'), rng("ringSet('border', +this.value)", 0, 10, 0.1, ringVal('border'), ' %')) +
      colour('borderCol', o.borderCol) +
      row(t('dc_corner'), sel('corner', DECO_CORNER, o.corner));
  if (o.scale !== 'off')
    h +=
      head(t('dc_scale')) +
      row(t('dc_style'), sel('scale', ['line', 'bar'], o.scale)) +
      row(t('dc_unit'), sel('unit', ['km', 'mi'], o.unit, String)) +
      `<div class="note">${esc(t('dc_sb_note'))}</div>`;
  if (o.grat)
    h +=
      head(t('dc_grat')) +
      row(
        t('dc_gr_step'),
        sel('grat', DECO_GRAT.filter(Boolean), o.grat, (v) => v + '°'),
      ) +
      ck('gratLabels', o.gratLabels, t('dc_gr_labels'));
  if (o.flourish !== 'off')
    h +=
      head(t('dc_flour')) +
      row(t('dc_style'), sel('flourish', DECO_FLOUR.slice(1), o.flourish)) +
      row(t('tx_size'), pct('flourishSize', 40, 300, o.flourishSize));
  h +=
    head(t('dc_stamps')) +
    `<div class="row">${DECO_STAMP.map((k) => chip(false, `decoStampAdd('${k}')`, t(DECO_NAME[k]))).join('')}</div>` +
    o.stamps
      .map(
        (s, i) =>
          `<label class="fxrow decosm"><span>${name(s.k)}</span><input type="range" min="30" max="400" step="1" value="${Math.round(s.s * 100)}" oninput="decoStampSet(${i}, 's', this.value / 100, 1)"/><button class="chip sm" title="${esc(t('dc_sm_del'))}" onclick="decoStampSet(${i}, 'del'); return false">×</button></label>`,
      )
      .join('') +
    (o.stamps.length ? `<div class="note">${esc(t('dc_sm_note'))}</div>` : '');
  el.innerHTML = h;
}

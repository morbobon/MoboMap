// Page areas (Page tab): header and footer as areas that keep room for themselves, what the map fills, and the
// spacing as nested rings around the map: wall, frame band, mat, sheet margin. Everything lives in S.page and is
// stored (project, link "pg=") only where it differs from PAGE_DEFAULT, so older maps are drawn as they always were.
//   fill:    'area'  the map is cut off at header, footer and margins
//            'sheet' fitted between them but not cut off: zoomed in it runs behind title and footer (as always)
//            'page'  fitted to the whole artboard; it also covers the wall behind a frame
//   margin:  sheet margin, % of the page (width for the sides, height for top and bottom)
//   header:  room kept for title, subtitle and logo; headerH: its height, % of the page height
//   footer:  room kept for the partner rows; off, the partners sit in the same rows on top of the map
//   wall, band, mat: ring widths in % of the page's short side; null = the frame's own (FRAME_SPEC m / b / t)
const PAGE_DEFAULT = {
  fill: 'sheet',
  margin: 6,
  header: true,
  headerH: 9,
  footer: true,
  wall: null,
  band: null,
  mat: null,
};
const PAGE_FILLS = ['area', 'sheet', 'page'];
function pageClean(o) {
  o = o && typeof o === 'object' ? o : {};
  const num = (v, hi, d) =>
    v == null || v === '' || !Number.isFinite(+v) ? d : Math.max(0, Math.min(hi, Math.round(+v * 10) / 10));
  return {
    fill: PAGE_FILLS.includes(o.fill) ? o.fill : PAGE_DEFAULT.fill,
    margin: num(o.margin, 20, PAGE_DEFAULT.margin),
    header: o.header !== false,
    headerH: num(o.headerH, 30, PAGE_DEFAULT.headerH),
    footer: o.footer !== false,
    wall: num(o.wall, 20, null),
    band: num(o.band, 20, null),
    mat: num(o.mat, 20, null),
  };
}
const pageOpts = () => S.page || PAGE_DEFAULT;
// what a project stores: only what differs from the standard
function pageOut() {
  const o = pageClean(S.page),
    d = {};
  for (const k in PAGE_DEFAULT) if (o[k] !== PAGE_DEFAULT[k]) d[k] = o[k];
  return Object.keys(d).length ? { page: d } : {};
}
// link form: tokens joined by dots – fa / fp (map fills area / page), ho / fo (header / footer off), and a letter
// with tenths of a percent: m (margin), h (header height), w (wall), b (frame band), t (mat). E.g. "fa.m80.w25"
const PAGE_CODE = { m: 'margin', h: 'headerH', w: 'wall', b: 'band', t: 'mat' };
function pageCode(o) {
  const p = pageClean(o),
    a = [];
  if (p.fill !== PAGE_DEFAULT.fill) a.push(p.fill === 'area' ? 'fa' : 'fp');
  if (!p.header) a.push('ho');
  if (!p.footer) a.push('fo');
  for (const [c, k] of Object.entries(PAGE_CODE)) if (p[k] !== PAGE_DEFAULT[k]) a.push(c + Math.round(p[k] * 10));
  return a.join('.');
}
function pageFromCode(s) {
  const o = {};
  for (const k of String(s || '').split('.')) {
    const m = /^([mhwbt])(\d{1,3})$/.exec(k);
    if (m) o[PAGE_CODE[m[1]]] = +m[2] / 10;
    else if (k === 'fa') o.fill = 'area';
    else if (k === 'fp') o.fill = 'page';
    else if (k === 'ho') o.header = false;
    else if (k === 'fo') o.footer = false;
  }
  return pageClean(o);
}
// how far the sheet margin moves the header's content (title, subtitle, logo) down; 0 with the standard margin
function pageShift() {
  const m = pageOpts().margin;
  return m === PAGE_DEFAULT.margin ? 0 : Math.max(-30, Math.round((H * m) / 100) - Math.round(H * 0.06));
}

// ---- the spacing rings, outside in. A later ring (the map border) joins the list here ----
const PAGE_RINGS = ['wall', 'band', 'mat', 'margin'];
const RING_NAME = { wall: 'pg_r_wall', band: 'pg_r_band', mat: 'pg_r_mat', margin: 'pg_r_margin' };
// does the current frame have this ring? (no frame: no band, no mat; the wall and the margin always exist)
function ringOn(id) {
  const f = FRAME_SPEC[S.fx.frame] || {};
  if (id === 'band') return FRAMED.includes(f.kind);
  if (id === 'mat') return FRAMED.includes(f.kind) || !!f.t;
  return PAGE_RINGS.includes(id);
}
// the width a ring has when the page does not set one, in % (the frame's own; 6 for the margin)
function ringDef(id) {
  if (id === 'margin') return PAGE_DEFAULT.margin;
  if (!ringOn(id)) return 0;
  const f = FRAME_SPEC[S.fx.frame] || {};
  const free = !f.m && (fxOn('torn') || fxOn('burnt') || fxOn('roll')) ? 0.04 : 0;
  const v = id === 'wall' ? f.m || free : id === 'band' ? f.b : f.t;
  return Math.round((v || 0) * 1000) / 10;
}
// the width in use, in %
function ringVal(id) {
  const v = pageOpts()[id];
  return !ringOn(id) ? 0 : v == null ? ringDef(id) : v;
}
// v = null: back to the standard width
function ringSet(id, v) {
  if (!PAGE_RINGS.includes(id)) return;
  pageSet(id, v);
}
function pageSet(k, v) {
  S.page = pageClean(Object.assign({}, pageOpts(), { [k]: v }));
  pageUI();
  render();
}
const PG = { ring: 'margin' }; // the ring picked in the diagram
function ringPick(id, e) {
  if (e) e.stopPropagation();
  PG.ring = id;
  pageUI();
}
const pgPct = (v) => +v.toFixed(1) + ' %';
function pageUI() {
  const p = pageOpts(),
    el = (id) => document.getElementById(id);
  el('pgFill').value = p.fill;
  el('pgHeader').checked = p.header;
  el('pgFooter').checked = p.footer;
  el('pgHeaderH').value = p.headerH;
  el('pgHeaderH').disabled = !p.header;
  el('pgHeaderHV').textContent = pgPct(p.headerH);
  // the diagram: the rings as nested boxes, then the sheet with header, map and footer
  const area = (cls, key, off) => `<div class="${cls}${off ? ' off' : ''}">${esc(t(key))}</div>`;
  let h =
    `<div class="pgin">${area('pga pgh', 'pg_a_header', !p.header)}${area('pga pgm', 'pg_a_map')}</div>` +
    area('pga pgf', 'pg_a_footer', !p.footer);
  for (const id of PAGE_RINGS.slice().reverse()) {
    const on = ringOn(id);
    h = `<div class="pgr pgr-${id}${PG.ring === id ? ' sel' : ''}${on ? '' : ' na'}" onclick="ringPick('${id}', event)"><i>${esc(t(RING_NAME[id]))}${on ? ' <b>' + pgPct(ringVal(id)) + '</b>' : ''}</i>${h}</div>`;
  }
  const d = el('pgRings');
  d.className = 'pgd fill-' + p.fill;
  d.innerHTML = h;
  // the picked ring: its width, back to the standard, and a word when the current frame has no such ring
  const id = PG.ring,
    on = ringOn(id),
    w = el('pgRingW');
  el('pgRingN').textContent = t(RING_NAME[id]);
  el('pgRingV').textContent = on ? pgPct(ringVal(id)) : '';
  w.value = ringVal(id);
  w.disabled = !on;
  el('pgRingStd').disabled = !on || (id === 'margin' ? p.margin === PAGE_DEFAULT.margin : p[id] == null);
  el('pgRingNa').hidden = on;
}

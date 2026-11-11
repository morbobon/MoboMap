// Style presets and custom styles.
//
// A map style (30-map-styles.js) is a preset. What the user changes under Look → Map style → Customise is kept
// beside it in S.styleMod (null = the preset as it is): a custom style is its base preset plus these few overrides.
// The special drawing of a style (the neon glow, the blueprint grid, flags, pixels, words …) stays with the base.
//   bg, land, line, ink   own colours: background, land, borders, text
//   lc                    own colour of the names on the map
//   lw                    border width
//   fill                  how the land is filled: plain | shades | regions | patchwork | wash (hand-coloured
//                         along the borders, as on an engraved chart)
//   lab                   names on the map: std | caps | bold | engr (engraved lettering) | hand (handwriting)
//   ex, gl, rl            depth: extruded land, glow around the land, terrain relief (1 on, 0 off)
//   wl                    waterlines: fine lines in the sea that follow the coast (1 on, 0 off)
//   bgk                   background: plain | gradient | stars | waves | concrete
// Only what differs from the preset is stored. Link parameter "sm", project field "styleMod".
// A look (55-fx.js) can carry one as its "mod"; saved styles live in this browser (STYLES_KEY).
// (a link stores the place in these lists: new ones go at the end)
const STYLE_FILLS = ['plain', 'shades', 'regions', 'patchwork', 'wash'];
const STYLE_LABS = ['std', 'caps', 'bold', 'engr', 'hand'];
const STYLE_BGS = ['plain', 'gradient', 'stars', 'waves', 'concrete'];
const STYLE_COLS = ['bg', 'land', 'line', 'ink'];
const STYLE_FILL_NAME = {
  plain: 'stp_fill_plain',
  shades: 'st_shades',
  regions: 'st_regions',
  patchwork: 'st_patchwork',
  wash: 'stp_fill_wash',
};
const STYLE_LAB_NAME = {
  std: 'stp_lab_std',
  caps: 'stp_lab_caps',
  bold: 'stp_lab_bold',
  engr: 'stp_lab_engr',
  hand: 'stp_lab_hand',
};
// the lettering of the two drawn kinds of names (system fonts only)
const STYLE_LAB_FONT = {
  engr: "Georgia,'Times New Roman',serif",
  hand: "'Segoe Script','Bradley Hand','Snell Roundhand','Lucida Handwriting','Brush Script MT',cursive",
};
const STYLE_BG_NAME = {
  plain: 'stp_bg_plain',
  gradient: 'stp_bg_gradient',
  stars: 'stp_bg_stars',
  waves: 'stp_bg_waves',
  concrete: 'stp_bg_concrete',
};
const STYLE_COL_NAME = { bg: 'stp_bg', land: 'stp_land', line: 'stp_line', ink: 'stp_ink' };
// link tokens: one letter and a value (six hex digits, a number or an index)
const STYLE_CODE = { bg: 'b', land: 'l', line: 's', ink: 'i', lc: 'c', lw: 'w', fill: 'f', lab: 't', ex: 'x', gl: 'g', rl: 'r', bgk: 'k', wl: 'v' }; // prettier-ignore
const STYLE_LISTS = { fill: STYLE_FILLS, lab: STYLE_LABS, bgk: STYLE_BGS };
const styleHex = (v) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : null);

// what a preset has by itself for the things Customise can change
function styleOwn(st) {
  const sp = SP[st] || {};
  return {
    lw:
      sp.strokeW != null
        ? sp.strokeW
        : st === 'outline'
          ? 1.2
          : st === 'blueprint' || st === 'neon'
            ? 0.8
            : st === 'silhouette'
              ? 0
              : 0.9,
    fill: STYLE_FILLS.includes(st) ? st : 'plain',
    lab: sp.labels || 'std',
    ex: st === 'extrude' || sp.extrude ? 1 : 0,
    gl: sp.landGlow ? 1 : 0,
    rl: sp.relief ? 1 : 0,
    wl: 0,
    bgk: sp.stars ? 'stars' : sp.bgGradient ? 'gradient' : sp.waves ? 'waves' : sp.concrete ? 'concrete' : 'plain',
  };
}
// styles whose land is drawn by their own code: the fill choice does not apply
const styleFillFixed = (st) => {
  const sp = SP[st] || {};
  return !!(sp.flag || sp.pixel || sp.patterns) || st === 'halftone' || st === 'blueprint';
};
// a valid, sparse set of overrides for the style st, or null when nothing is left
function styleClean(o, st = S.style) {
  if (!o || typeof o !== 'object') return null;
  const own = styleOwn(st),
    c = {};
  for (const k of [...STYLE_COLS, 'lc']) if (styleHex(o[k])) c[k] = styleHex(o[k]);
  if (o.lw != null && o.lw !== '' && Number.isFinite(+o.lw)) {
    const w = Math.round(Math.max(0, Math.min(4, +o.lw)) * 10) / 10;
    if (w !== own.lw) c.lw = w;
  }
  for (const k in STYLE_LISTS) if (STYLE_LISTS[k].includes(o[k]) && o[k] !== own[k]) c[k] = o[k];
  for (const k of ['ex', 'gl', 'rl', 'wl'])
    if (o[k] != null && o[k] !== '' && (+o[k] ? 1 : 0) !== own[k]) c[k] = +o[k] ? 1 : 0;
  return Object.keys(c).length ? c : null;
}
// what a project stores
const styleOut = () => (styleClean(S.styleMod) ? { styleMod: styleClean(S.styleMod) } : {});
// link form: tokens joined by dots, e.g. "b10243a.w15.f2.x1.k2"
function styleCode(o) {
  if (!o) return '';
  const a = [];
  for (const k in STYLE_CODE) {
    if (o[k] == null) continue;
    const v = o[k];
    a.push(
      STYLE_CODE[k] +
        (styleHex(v) ? v.slice(1) : k === 'lw' ? Math.round(v * 10) : STYLE_LISTS[k] ? STYLE_LISTS[k].indexOf(v) : v),
    );
  }
  return a.join('.');
}
function styleFromCode(str, st) {
  const o = {};
  for (const tok of String(str || '').split('.')) {
    const k = Object.keys(STYLE_CODE).find((k) => STYLE_CODE[k] === tok[0]),
      v = tok.slice(1);
    if (!k || !v) continue;
    if (STYLE_COLS.includes(k) || k === 'lc') o[k] = '#' + v;
    else if (k === 'lw') o[k] = +v / 10;
    else if (STYLE_LISTS[k]) o[k] = STYLE_LISTS[k][+v];
    else o[k] = +v;
  }
  return styleClean(o, st);
}

// ---------- drawing (called by render) ----------
// a style's properties with the brand profile's colours instead of its own ("design-system colours")
function styleDsSp(st, sp, D) {
  const L = D.colors;
  return Object.assign({}, sp, {
    bg: L.bg,
    land: L.land,
    landAlt: L.landAlt,
    // outline draws only borders: they need ink; doodle patterns are white with black lines
    stroke:
      st === 'silhouette'
        ? L.land
        : st === 'outline'
          ? readable([L.dark ? L.ink : L.land, L.ink, L.primary], L.bg, 3)
          : sp.patterns
            ? '#111111'
            : st === 'neon'
              ? readable([L.accent, L.ink], L.bg, 3)
              : L.stroke,
    ink: L.ink,
    dark: !!L.dark,
    heading: L.dark ? L.headingOnDark : L.heading,
    labelColor: undefined,
    textColor: sp.textColor && (light(L.land) ? '#1b1b1b' : '#ffffff'),
    wordColors: sp.wordColors && D.highlight.slice(0, 3),
    bgGradient: sp.bgGradient && [mix(L.bg, '#ffffff', 0.08), mix(L.bg, '#000000', 0.3)],
    extrudeColor: sp.extrudeColor && mix(L.land, '#000000', 0.45),
    landGlow: sp.landGlow && L.accent,
    // real elevation stays, but as neutral shading over the profile's land instead of hypsometric tints
    relief: false,
    reliefShade: !!sp.relief,
  });
}
// the colours a style draws with: its own, or the profile's (ds = the profile's colours)
function styleCols(st, sp, ds) {
  let bg = ds.bg,
    land = ds.land,
    stroke = ds.stroke,
    ink = ds.ink,
    landAlt = ds.landAlt;
  if (st === 'neon') {
    bg = '#061a2b';
    land = '#0d2a40';
    stroke = '#19c6ff';
    ink = '#e6f7ff';
  }
  if (st === 'blueprint') {
    bg = '#163b5c';
    land = 'none';
    stroke = '#9fd3ff';
    ink = '#dcefff';
  }
  if (st === 'outline') {
    land = ds.dark ? bg : '#ffffff';
    stroke = ds.dark ? ink : ds.land;
    if (ds.dark) land = 'transparent';
  }
  if (st === 'glass') {
    bg = ds.dark ? bg : '#dfe6ec';
    land = ds.dark ? '#2d4454' : '#f3f6f8';
    stroke = ds.dark ? '#5a7a90' : '#b9c6d0';
    landAlt = land;
  }
  if (st === 'silhouette') {
    stroke = land;
  }
  if (st === 'atlas') {
    bg = ds.dark ? bg : '#ffffff';
    land = ds.dark ? land : '#b9d3e6';
    landAlt = land;
    stroke = ds.dark ? stroke : '#ffffff';
  }
  if (st === 'patchwork') {
    stroke = '#ffffff';
  }
  if (st === 'paper') {
    stroke = mix(land, bg, 0.35);
  }
  if (sp.bg) {
    bg = sp.bg;
    land = sp.land;
    stroke = sp.stroke;
    ink = sp.ink;
    landAlt = sp.landAlt || mix(land, bg, 0.25);
  }
  if (sp.pixel) {
    stroke = 'none';
  }
  return { bg, land, stroke, ink, landAlt };
}
// the overrides laid over a style's colours (c from styleCols; changed in place). c.mod names the colours that
// really are other than the style's: what follows a colour (second land tone, gradient, title colour, grid lines)
// changes only then, so "Custom" colours start as exactly the map they were taken from.
function styleModCols(md, c) {
  const differs = (a, b) => !!a && a !== String(b).toLowerCase();
  c.mod = {
    bg: differs(md.bg, c.bg),
    land: differs(md.land, c.land),
    line: differs(md.line, c.stroke),
    ink: differs(md.ink, c.ink),
  };
  if (c.mod.bg) c.bg = md.bg;
  if (c.mod.land) c.land = md.land;
  if (c.mod.line) c.stroke = md.line;
  if (c.mod.ink) c.ink = md.ink;
  if (c.mod.bg || c.mod.land) c.landAlt = mix(isHex(c.land) ? c.land : c.bg, c.bg, 0.25);
  return c;
}
// … and over its properties (bg: the background colour after styleModCols, bgMod: it is the user's own;
// accent: the profile's)
function styleModSp(md, sp, st, bg, bgMod, accent) {
  const own = styleOwn(st),
    o = Object.assign({}, sp);
  if (md.lw != null) o.strokeW = md.lw;
  if (md.lab) o.labels = md.lab === 'std' ? undefined : md.lab;
  if (md.lc) o.labelColor = md.lc;
  if (md.wl != null) o.waterlines = !!md.wl;
  if (md.gl != null) o.landGlow = md.gl ? sp.landGlow || accent : undefined;
  if (md.rl != null) {
    // a style with real elevation tints (topographic) loses them; any other gets neutral shading
    o.relief = !!md.rl && !!sp.relief;
    o.reliefShade = !!md.rl && !sp.relief;
  }
  const bgk = md.bgk || own.bgk;
  if (md.bgk || bgMod) {
    const grad = !bgMod && sp.bgGradient ? sp.bgGradient : [mix(bg, '#ffffff', 0.08), mix(bg, '#000000', 0.3)];
    o.bgGradient = bgk === 'gradient' || bgk === 'stars' ? grad : undefined;
    o.stars = bgk === 'stars';
    o.waves = bgk === 'waves';
    o.concrete = bgk === 'concrete';
  }
  return o;
}
// the colours of the map as it is drawn now (written by render): where "Custom" colours start from
let STYLE_NOW = { bg: '#ffffff', land: '#cccccc', line: '#888888', ink: '#222222' };

// ---------- changing it ----------
function styleSet(k, v, soft) {
  const o = Object.assign({}, S.styleMod || {});
  if (v == null || v === '') delete o[k];
  else o[k] = v;
  S.styleMod = styleClean(o);
  if (soft) return fxRenderSoon();
  ui();
  render();
}
// a depth switch: the other state than the one the map shows now
function styleFlip(k) {
  const own = styleOwn(S.style),
    now = (S.styleMod || {})[k] ?? own[k];
  // "Terrain relief" under Map → Display shows the relief on any style: off here means off
  if (k === 'rl' && (now || document.getElementById('relief').checked)) {
    document.getElementById('relief').checked = false;
    return styleSet(k, 0);
  }
  styleSet(k, now ? 0 : 1);
}
// where the colours come from: the style's own, the brand profile's, or the user's own four
function styleColSrc() {
  const md = S.styleMod || {};
  return STYLE_COLS.some((k) => md[k]) ? 'custom' : S.dsColours ? 'ds' : 'own';
}
function styleSetColSrc(v) {
  const o = Object.assign({}, S.styleMod || {});
  for (const k of STYLE_COLS) delete o[k];
  // custom starts from the colours on the map
  if (v === 'custom') {
    for (const k of STYLE_COLS) if (styleHex(STYLE_NOW[k])) o[k] = styleHex(STYLE_NOW[k]);
    // (a style with no plain colours at all still becomes custom)
    if (!STYLE_COLS.some((k) => o[k])) o.bg = '#ffffff';
  } else S.dsColours = v === 'ds';
  S.styleMod = styleClean(o);
  ui();
  render();
}
function styleReset() {
  S.styleMod = null;
  ui();
  render();
}

// ---------- saved styles (this browser) ----------
const STYLES_KEY = 'mobomap.styles';
function userStyles() {
  try {
    return JSON.parse(localStorage.getItem(STYLES_KEY) || '[]').filter(
      (s) => s && s.id && s.name && STYLES.some((x) => x.id === s.base),
    );
  } catch {
    return [];
  }
}
// is the map drawn in this saved style now?
const styleIsSaved = (s) =>
  s.base === S.style &&
  !!s.dsc === !!S.dsColours &&
  styleCode(styleClean(s.mod, s.base)) === styleCode(styleClean(S.styleMod));
function saveStyle() {
  const name = (prompt(t('stp_name'), t('stp_mine') + ' ' + (userStyles().length + 1)) || '').trim();
  if (!name) return;
  const list = userStyles();
  list.push({
    id: 's' + Date.now().toString(36),
    name,
    base: S.style,
    mod: styleClean(S.styleMod),
    ...(S.dsColours ? { dsc: 1 } : {}),
  });
  localStorage.setItem(STYLES_KEY, JSON.stringify(list));
  ui();
}
function deleteStyle(id, e) {
  e.stopPropagation();
  localStorage.setItem(STYLES_KEY, JSON.stringify(userStyles().filter((s) => s.id !== id)));
  ui();
}
function applyStyle(id) {
  const s = userStyles().find((x) => x.id === id);
  if (!s) return;
  setStyle(s.base, s.mod, !!s.dsc);
}

// ---------- panel ----------
// a preset's colours in small: background, land and border as the map would get them with this brand profile
function styleSwatch(st, md, dsc) {
  const D = DS[S.ds];
  if (!D) return '';
  let sp = SP[st] || {};
  if (dsc) sp = styleDsSp(st, sp, D);
  const c = styleCols(st, sp, D.colors);
  if (md) styleModCols(md, c);
  const bg = isHex(c.bg) ? c.bg : '#ffffff',
    land = isHex(c.land) ? c.land : bg,
    line = isHex(c.stroke) ? c.stroke : land;
  // land that is the background's colour (outline, words, doodle) shows by its border or its text colour
  const edge = land.toLowerCase() === line.toLowerCase() && land.toLowerCase() === bg.toLowerCase() ? c.ink : line;
  return `<span class="stsw" style="background:${bg}"><i style="background:${land};border-color:${edge}"></i></span>`;
}
const STYLE_FOLD_KEY = 'mobomap.stcust';
function styleFold(e) {
  e.preventDefault();
  const d = e.currentTarget.parentNode;
  d.open = !d.open;
  localStorage.setItem(STYLE_FOLD_KEY, d.open ? '1' : '0');
}
// the "Customise" button that Simple mode shows: on to the controls, which are Advanced (jumpTo switches and says so)
function styleCustomise() {
  document.getElementById('stCust').open = true;
  localStorage.setItem(STYLE_FOLD_KEY, '1');
  jumpTo('#stCust');
}
function styleUI() {
  const el = (id) => document.getElementById(id);
  const md = S.styleMod || {},
    custom = !!styleClean(S.styleMod),
    mine = userStyles(),
    saved = mine.find(styleIsSaved),
    base = t('st_' + S.style),
    name = saved ? saved.name : custom ? t('stp_custom').replace('{name}', base) : base;
  el('styleNo').textContent = name;
  el('styles').innerHTML =
    STYLES.map(
      (s) =>
        `<button class="tile ${S.style === s.id && !saved ? (custom ? 'on mod' : 'on') : ''}" title="${esc(t('st_' + s.id + '_d'))}" onclick="setStyle('${s.id}')">${styleSwatch(s.id, null, S.dsColours)}<b>${esc(t('st_' + s.id))}</b></button>`,
    ).join('') +
    (mine.length
      ? `<div class="fxcat stsaved">${esc(t('stp_saved'))}</div>` +
        mine
          .map(
            (s) =>
              `<button class="tile mine ${s === saved ? 'on' : ''}" title="${esc(s.name + ' · ' + t('st_' + s.base))}" onclick="applyStyle('${s.id}')">${styleSwatch(s.base, styleClean(s.mod, s.base), !!s.dsc)}<b>${esc(s.name)}</b><span class="ldel" onclick="deleteStyle('${s.id}', event)" title="${esc(t('delete'))}">×</span></button>`,
          )
          .join('')
      : '');
  // "Custom (from Neon)" with its reset
  el('stNow').hidden = !custom;
  el('stNowName').textContent = custom ? t('stp_custom').replace('{name}', base) : '';
  el('stSave').hidden = !custom && !S.dsColours;
  const box = el('stCustUI');
  if (!box) return;
  if (localStorage.getItem(STYLE_FOLD_KEY) != null) el('stCust').open = localStorage.getItem(STYLE_FOLD_KEY) === '1';
  const own = styleOwn(S.style),
    val = (k) => md[k] ?? own[k];
  const row = (label, body) => `<label class="fxrow"><span>${esc(label)}</span>${body}</label>`;
  const sel = (call, ids, cur, names, off) =>
    `<select onchange="${call}"${off ? ' disabled' : ''}>${ids.map((id) => `<option value="${id}"${id === cur ? ' selected' : ''}>${esc(t(names[id]))}</option>`).join('')}</select>`;
  const chip = (k, label) =>
    `<button class="chip sm ${val(k) || (k === 'rl' && el('relief').checked) ? 'on' : ''}" onclick="styleFlip('${k}')">${esc(label)}</button>`;
  const src = styleColSrc();
  let h = row(
    t('stp_colours'),
    sel('styleSetColSrc(this.value)', ['own', 'ds', 'custom'], src, {
      own: 'stp_col_own',
      ds: 'stp_col_ds',
      custom: 'stp_col_custom',
    }),
  );
  if (src === 'custom')
    h +=
      '<div class="stcols">' +
      STYLE_COLS.map(
        (k) =>
          `<label><input type="color" value="${md[k] || styleHex(STYLE_NOW[k]) || '#888888'}" oninput="styleSet('${k}', this.value, 1)" onchange="styleSet('${k}', this.value)"/><span>${esc(t(STYLE_COL_NAME[k]))}</span></label>`,
      ).join('') +
      '</div>';
  h +=
    row(
      t('stp_lw'),
      `<input type="range" min="0" max="4" step="0.1" value="${val('lw')}" oninput="styleSet('lw', +this.value, 1); this.nextElementSibling.textContent = (+this.value).toFixed(1)" onchange="styleSet('lw', +this.value)"/><b>${val('lw').toFixed(1)}</b>`,
    ) +
    row(
      t('stp_fill'),
      sel("styleSet('fill', this.value)", STYLE_FILLS, val('fill'), STYLE_FILL_NAME, styleFillFixed(S.style)),
    ) +
    row(t('stp_labels'), sel("styleSet('lab', this.value)", STYLE_LABS, val('lab'), STYLE_LAB_NAME)) +
    row(
      t('stp_labcol'),
      `<select${md.lc ? ' class="half"' : ''} onchange="styleSet('lc', this.value && (styleHex(STYLE_NOW.ink) || '#222222'))"><option value="">${esc(t('stp_col_own'))}</option><option value="1"${md.lc ? ' selected' : ''}>${esc(t('stp_col_custom'))}</option></select>` +
        (md.lc
          ? `<input type="color" value="${md.lc}" oninput="styleSet('lc', this.value, 1)" onchange="styleSet('lc', this.value)"/>`
          : ''),
    ) +
    row(t('stp_bgk'), sel("styleSet('bgk', this.value)", STYLE_BGS, val('bgk'), STYLE_BG_NAME)) +
    `<div class="row">${chip('wl', t('stp_waterlines'))}</div>` +
    `<div class="fxcat">${esc(t('stp_depth'))}</div>` +
    `<div class="row">${chip('ex', t('stp_extrude'))}${chip('gl', t('stp_glow'))}${chip('rl', t('stp_relief'))}</div>` +
    `<p class="note">${esc(t('stp_note'))}</p>`;
  box.innerHTML = h;
}

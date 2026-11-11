// Visual design-system editor (colour pickers, sliders, live preview) and the app's UI styles.

// ---------------- design-system editor ----------------
// A draft copy of the active profile is edited live: it is registered as a temporary profile and shown on
// the map while you drag; "Save" stores it as your own profile, "Cancel" brings the previous one back.
const DSE = { draft: null, prev: null, isNew: false };
const DSE_COLOURS = [
  'bg',
  'land',
  'landAlt',
  'stroke',
  'ink',
  'primary',
  'accent',
  'accent2',
  'heading',
  'headingOnDark',
];
const DSE_FONTS = ['Arvo', 'Work Sans', 'Roboto Slab', 'Space Grotesk', 'DM Serif Display', 'IBM Plex Mono'];
const hex6 = (c) => {
  if (!isHex(c)) return '#000000';
  c = String(c).trim();
  return c.length === 4 ? '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3] : c.toLowerCase();
};
function dsEditOpen() {
  // already editing: just show the form
  if (DSE.draft) {
    document.getElementById('dsEdit').open = true;
    return;
  }
  const src = DS[S.ds];
  const d = JSON.parse(JSON.stringify(currentDSExport()));
  const builtin = src.source !== 'user';
  let id = src.id;
  if (builtin) {
    // a free id: a second edit of the same built-in makes a new copy, never overwrites the first
    id = src.id + '-mine';
    for (let n = 2; DS[id]; n++) id = src.id + '-mine-' + n;
  }
  d.id = id;
  d.name = builtin ? loc(src.name) + ' – ' + t('dse_mine') : loc(d.name);
  d.private = false;
  DSE.draft = d;
  DSE.prev = S.ds;
  DSE.isNew = !DS[d.id];
  // what Save/Cancel must not lose: the project's text, partners and group colours
  DSE.snap = {
    title: document.getElementById('title').value,
    sub: document.getElementById('sub').value,
    footer: document.getElementById('footerLabel').value,
    footerAuto: document.getElementById('footerLabel').dataset.auto,
    partners: JSON.parse(JSON.stringify(S.partners)),
    colours: S.groups.map((g) => g.color),
  };
  document.getElementById('dsEdit').open = true;
  dsEditForm();
  dsEditPreview();
}
// the form, rebuilt from the draft
function dsEditForm() {
  const d = DSE.draft;
  if (!d) return;
  const c = d.colors,
    lg = d.company.logo || {},
    dv = (d.footer && d.footer.divider) || {};
  const col = (k) =>
    `<label class="dse-col"><input type="color" value="${hex6(c[k])}" oninput="dsEditSet('colors.${k}', this.value)"/><span>${esc(t('dse_c_' + k))}</span></label>`;
  const slider = (path, label, min, max, step, val, unit = '') =>
    `<label class="fxrow"><span>${esc(label)}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${val}" oninput="dsEditSet('${path}', +this.value); this.nextElementSibling.textContent = this.value + '${unit}'"/><b>${val}${unit}</b></label>`;
  const sel = (path, label, opts, val) =>
    `<label class="fxrow"><span>${esc(label)}</span><select onchange="dsEditSet('${path}', this.value)">${opts.map(([v, n]) => `<option value="${esc(v)}" ${v === val ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>`;
  const fonts = DSE_FONTS.map((f) => [f, f]);
  document.getElementById('dsEditBody').innerHTML = `
    <label class="fxrow"><span>${esc(t('dse_name'))}</span><input type="text" value="${esc(loc(d.name))}" oninput="dsEditSet('name', this.value)" style="grid-column: span 2"/></label>
    <div class="fxcat">${esc(t('dse_colours'))}</div>
    <div class="dse-grid">${DSE_COLOURS.map(col).join('')}</div>
    <label class="ck"><input type="checkbox" ${c.dark ? 'checked' : ''} onchange="dsEditSet('colors.dark', this.checked)"/> ${esc(t('dse_dark'))}</label>
    <div class="fxcat">${esc(t('dse_highlight'))}</div>
    <div class="dse-grid">${(d.highlight || [])
      .map(
        (h, i) =>
          `<label class="dse-col"><input type="color" value="${hex6(h)}" oninput="dsEditSet('highlight.${i}', this.value)"/><span>${i + 1}</span></label>`,
      )
      .join(
        '',
      )}<button class="chip sm" onclick="dsEditHl(1)">+</button>${(d.highlight || []).length > 1 ? `<button class="chip sm" onclick="dsEditHl(-1)">−</button>` : ''}</div>
    <div class="fxcat">${esc(t('dse_fonts'))}</div>
    ${sel('fonts.heading', t('dse_f_heading'), fonts, d.fonts.heading)}
    ${sel('fonts.body', t('dse_f_body'), fonts, d.fonts.body)}
    <div class="fxcat">${esc(t('dse_logo'))}</div>
    <div class="row"><button class="chip" onclick="document.getElementById('dseLogo').click()">${esc(t('pick_logo'))}</button>${lg.src ? `<button class="chip" onclick="dsEditSet('company.logo.src', null)">${esc(t('delete'))}</button>` : ''}</div>
    ${slider('company.logo.width', t('dse_logo_w'), 60, 420, 5, Math.round(lg.width || 220), ' px')}
    ${sel(
      'company.logo.box',
      t('dse_logo_box'),
      [
        ['auto', t('dse_box_auto')],
        ['always', t('dse_box_always')],
        ['never', t('dse_box_never')],
      ],
      lg.box || 'auto',
    )}
    <label class="dse-col"><input type="color" value="${hex6(lg.boxColor || c.primary)}" oninput="dsEditSet('company.logo.boxColor', this.value)"/><span>${esc(t('dse_logo_boxc'))}</span></label>
    <div class="fxcat">${esc(t('dse_footer'))}</div>
    <label class="fxrow"><span>${esc(t('dse_footer_label'))}</span><input type="text" value="${esc(loc((d.footer || {}).label) || '')}" oninput="dsEditSet('footer.label', this.value)" style="grid-column: span 2"/></label>
    ${sel(
      'footer.divider.style',
      t('dse_div'),
      [
        ['bar', t('dse_div_bar')],
        ['line', t('dse_div_line')],
        ['none', t('dse_div_none')],
      ],
      dv.style || 'line',
    )}
    <label class="dse-col"><input type="color" value="${hex6(dv.color || c.primary)}" oninput="dsEditSet('footer.divider.color', this.value)"/><span>${esc(t('dse_div_col'))}</span></label>
    ${slider('footer.divider.opacity', t('dse_div_op'), 0, 1, 0.05, dv.opacity != null ? dv.opacity : 0.8)}
    ${slider('footer.divider.height', t('dse_div_h'), 1, 14, 1, dv.height || 5, ' px')}
    ${slider('footer.divider.width', t('dse_div_w'), 0.05, 1, 0.01, dv.width || 0.18)}
    ${sel(
      'footer.divider.align',
      t('dse_div_align'),
      [
        ['left', t('dir_l')],
        ['center', t('pos_tc').replace(/^[^ ]+ /, '')],
        ['right', t('dir_r')],
      ],
      dv.align || 'left',
    )}`;
}
// set a value in the draft by path ("colors.bg", "highlight.2", "company.logo.width") and preview
function dsEditSet(path, v) {
  const d = DSE.draft;
  if (!d) return;
  const ks = path.split('.');
  let o = d;
  for (const k of ks.slice(0, -1)) o = o[k] = o[k] != null && typeof o[k] === 'object' ? o[k] : {};
  // a palette colour that groups use: those groups follow the new colour
  if (ks[0] === 'highlight') {
    const old = String(o[ks[ks.length - 1]] || '').toLowerCase();
    if (old) S.groups.forEach((g) => String(g.color).toLowerCase() === old && (g.color = v));
  }
  o[ks[ks.length - 1]] = v;
  if (path === 'footer.label') document.getElementById('footerLabel').value = v;
  dsEditPreview();
}
function dsEditHl(n) {
  const h = DSE.draft.highlight || [];
  if (n > 0) h.push(h[h.length - 1] || '#888888');
  else if (h.length > 1) h.pop();
  DSE.draft.highlight = h;
  dsEditForm();
  dsEditPreview();
}
// done: called when the logo is in the draft (the Logo section's own button saves at once, 82-levels.js)
function dsEditLogo(file, done) {
  if (!file) return;
  readImage(file, (l, img) => {
    // large images are scaled down (profiles live in the browser's limited storage)
    let src = l.src;
    const max = 900;
    if (img.width > max) {
      const c = document.createElement('canvas');
      c.width = max;
      c.height = Math.round((img.height * max) / img.width);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      src = c.toDataURL('image/png');
      // photo-like logos compress far better as WebP (transparency is kept)
      if (src.length > 500000) src = c.toDataURL('image/webp', 0.86);
    }
    DSE.draft.company.logo = Object.assign({}, DSE.draft.company.logo, { src, aspect: l.aspect });
    dsEditForm();
    dsEditPreview();
    if (done) done();
  });
}
let dseRaf = 0;
function dsEditPreview() {
  if (dseRaf) return;
  dseRaf = requestAnimationFrame(() => {
    dseRaf = 0;
    if (!DSE.draft) return; // saved or cancelled meanwhile
    const n = normDS(JSON.parse(JSON.stringify(DSE.draft)), 'user');
    if (!DS[n.id]) DSORDER.push(n.id);
    DS[n.id] = n;
    S.ds = n.id;
    ui();
    render();
  });
}
function dsEditSave() {
  if (!DSE.draft) return;
  const n = addDS(JSON.parse(JSON.stringify(DSE.draft)), 'user');
  if (!n) return;
  if (!saveUserDS()) return; // storage full: keep the editor open, nothing lost yet
  DSE.draft = null;
  document.getElementById('dsEdit').open = false;
  S.ds = n.id;
  ui();
  render();
  toast(t('ts_imported') + ': ' + loc(n.name));
}
function dsEditCancel() {
  if (!DSE.draft) return;
  const id = DSE.draft.id;
  if (DSE.isNew) {
    delete DS[id];
    const i = DSORDER.indexOf(id);
    if (i >= 0) DSORDER.splice(i, 1);
  } else {
    // restore the saved version of an own profile
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || '[]').find((x) => x.id === id);
      if (saved) DS[id] = normDS(saved, 'user');
    } catch {
      /* keep */
    }
  }
  DSE.draft = null;
  document.getElementById('dsEdit').open = false;
  // back to the previous profile with the project's own text, partners and group colours
  S.ds = DS[DSE.prev] ? DSE.prev : DSORDER[0];
  const sn = DSE.snap || {};
  if (sn.partners) S.partners = sn.partners;
  if (sn.colours) S.groups.forEach((g, i) => sn.colours[i] && (g.color = sn.colours[i]));
  document.getElementById('title').value = sn.title != null ? sn.title : document.getElementById('title').value;
  document.getElementById('sub').value = sn.sub != null ? sn.sub : document.getElementById('sub').value;
  const fl = document.getElementById('footerLabel');
  if (sn.footer != null) fl.value = sn.footer;
  if (sn.footerAuto != null) fl.dataset.auto = sn.footerAuto;
  ui();
  render();
}

// ---------------- UI styles (the app around the map) ----------------
// "profile" follows the design system (and the light/dark switch); the others are fixed palettes.
const UI_STYLES = {
  cool: {
    dark: true,
    font: 'Space Grotesk',
    bg: '#0f141b',
    panel: '#151b23',
    ink: '#dce5ee',
    mute: '#8796a8',
    line: '#243040',
    btn: '#1c2430',
    field: '#19212b',
    card: '#18202a',
    primary: '#18212c',
    accent: '#7cc4e8',
    accent2: '#5b8def',
    strong: '#9ccbee',
  },
  graphite: {
    dark: true,
    font: 'Work Sans',
    bg: '#121212',
    panel: '#1a1a1a',
    ink: '#e8e8e8',
    mute: '#9a9a9a',
    line: '#2c2c2c',
    btn: '#232323',
    field: '#1f1f1f',
    card: '#1d1d1d',
    primary: '#202020',
    accent: '#f0b429',
    accent2: '#e8e8e8',
    strong: '#f0b429',
  },
  midnight: {
    dark: true,
    font: 'Space Grotesk',
    bg: '#0b0d1f',
    panel: '#121531',
    ink: '#e3e5ff',
    mute: '#9095c8',
    line: '#262a52',
    btn: '#1a1e42',
    field: '#161a3a',
    card: '#151938',
    primary: '#171b3d',
    accent: '#b18cff',
    accent2: '#5ee1d9',
    strong: '#c9b0ff',
  },
  nord: {
    dark: false,
    font: 'Work Sans',
    bg: '#eceff4',
    panel: '#ffffff',
    ink: '#2e3440',
    mute: '#6b7587',
    line: '#d8dee9',
    btn: '#ffffff',
    field: '#f4f6f9',
    card: '#f8f9fb',
    primary: '#3b4252',
    accent: '#88c0d0',
    accent2: '#4c6f9a',
    strong: '#4c6f9a',
  },
  paper: {
    dark: false,
    font: 'Work Sans',
    bg: '#f3efe7',
    panel: '#fbf8f2',
    ink: '#2f2a24',
    mute: '#6e665b',
    line: '#e2dacb',
    btn: '#fffdf8',
    field: '#f7f2e9',
    card: '#faf6ef',
    primary: '#4a3f33',
    accent: '#e8964a',
    accent2: '#2f6f6a',
    strong: '#8a5a2b',
  },
  contrast: {
    dark: true,
    font: 'Work Sans',
    bg: '#000000',
    panel: '#0a0a0a',
    ink: '#ffffff',
    mute: '#c8c8c8',
    line: '#5a5a5a',
    btn: '#141414',
    field: '#111111',
    card: '#0e0e0e',
    primary: '#000000',
    accent: '#ffe600',
    accent2: '#00e5ff',
    strong: '#ffe600',
  },
  profile: null,
};
const UI_STYLE_IDS = ['cool', 'graphite', 'midnight', 'nord', 'paper', 'contrast', 'profile'];
function uiStyle() {
  const s = localStorage.getItem('mobomap.uistyle');
  return UI_STYLES.hasOwnProperty(s) ? s : 'cool';
}
function setUiStyle(s) {
  localStorage.setItem('mobomap.uistyle', s);
  applyTheme();
  applyUiMode();
}
// called by applyTheme(): a fixed UI style overrides the profile-derived chrome colours
function applyUiStyle() {
  const st = UI_STYLES[uiStyle()],
    r = document.documentElement.style;
  const keys = [
    '--bg',
    '--panel',
    '--ink',
    '--mute',
    '--line',
    '--btn',
    '--field',
    '--field-focus',
    '--card',
    '--ui-strong',
    '--sel-bg',
    '--sel-ink',
    '--sel-border',
  ];
  if (!st) {
    keys.forEach((k) => r.removeProperty(k));
    return false;
  }
  r.setProperty('--bg', st.bg);
  r.setProperty('--panel', st.panel);
  r.setProperty('--ink', st.ink);
  r.setProperty('--mute', st.mute);
  r.setProperty('--line', st.line);
  r.setProperty('--btn', st.btn);
  r.setProperty('--field', st.field);
  r.setProperty('--field-focus', st.btn);
  r.setProperty('--card', st.card);
  r.setProperty('--ui-strong', st.strong);
  r.setProperty('--primary', st.primary);
  r.setProperty('--accent', st.accent);
  r.setProperty('--accent2', st.accent2);
  r.setProperty('--on-primary', light(st.primary) ? '#111111' : '#ffffff');
  r.setProperty(
    '--accent-on-primary',
    contrast(st.accent, st.primary) >= 4.5 ? st.accent : light(st.primary) ? '#111111' : '#ffffff',
  );
  // the selected tile / chip: a tinted panel colour with the accent border, readable in every style
  r.setProperty('--sel-bg', mix(st.panel, st.accent, st.dark ? 0.28 : 0.18));
  r.setProperty('--sel-ink', st.ink);
  r.setProperty('--sel-border', st.accent);
  r.setProperty('--on-accent', light(st.accent) ? '#111111' : '#ffffff');
  r.setProperty('--on-accent2', light(st.accent2) ? '#111111' : '#ffffff');
  r.setProperty('--fh', "'" + st.font + "'");
  r.setProperty('--fb', "'Work Sans'");
  r.setProperty('--ink-brand', st.ink);
  return true;
}

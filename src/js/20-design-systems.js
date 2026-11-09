// Design systems / company profiles. Schema: see README. Everything except id and colors is optional and filled in by normDS().
// Text fields (name, note, company.name, logo text, footer label, defaults) may be a string or { en, da, … } – see loc().
const BUILTIN = /*__DESIGNSYSTEMS__*/ [];
const LS_KEY = 'mobomap.designsystems';
function normLogo(l, c) {
  return Object.assign(
    { src: null, aspect: 4, width: 220, box: 'auto', boxColor: c.primary, text: '', sub: '' },
    l || {},
  );
}
function normDS(d, source) {
  if (!d || !d.id || !d.colors) throw new Error('Designsystem skal have id og colors');
  const c = Object.assign({ bg: '#FFFFFF', land: '#224B5A', stroke: '#FFFFFF', ink: '#224B5A' }, d.colors);
  c.landAlt = c.landAlt || mix(c.land, c.bg, 0.2);
  c.primary = c.primary || c.land;
  c.accent = c.accent || '#FFE600';
  c.accent2 = c.accent2 || mix(c.accent, c.primary, 0.5);
  if (c.dark == null) c.dark = !light(c.bg);
  c.heading = c.heading || (c.dark ? c.accent : c.primary);
  c.headingOnDark = c.headingOnDark || c.accent;
  const f = Object.assign({ heading: 'Arvo', body: 'Work Sans', faces: [] }, d.fonts || {});
  const co = Object.assign({ name: d.name || d.id, link: '' }, d.company || {});
  co.logo = normLogo(co.logo || d.logo, c);
  const partners = (d.partners || [])
    .map((p) => ({
      name: p.name || '',
      link: p.link || '',
      logo: typeof p.logo === 'string' ? { src: p.logo } : p.logo || {},
    }))
    .filter((p) => p.name || p.logo.src);
  const footer = Object.assign({ label: '' }, d.footer || {});
  footer.divider = Object.assign(
    { style: 'line', color: '', opacity: 0.8, height: 5, width: 0.18, align: 'left' },
    footer.divider || {},
  );
  return {
    id: String(d.id),
    name: d.name || d.id,
    note: d.note || '',
    private: !!d.private,
    defaults: d.defaults || null,
    colors: c,
    fonts: f,
    company: co,
    partners,
    footer,
    highlight: d.highlight && d.highlight.length ? d.highlight : [c.accent, c.accent2, c.primary, '#FFFFFF'],
    swatches: d.swatches || [c.primary, c.accent, c.accent2],
    source,
  };
}
const DS = {};
const DSORDER = [];
function addDS(d, source) {
  try {
    const n = normDS(d, source);
    if (!DS[n.id]) DSORDER.push(n.id);
    DS[n.id] = n;
    (n.fonts.faces || []).forEach(injectFace);
    return n;
  } catch (e) {
    console.warn('Designsystem ignoreret:', e.message, d);
    return null;
  }
}
const extraFaces = {};
function injectFace(f) {
  if (!f || !f.family || !f.src) return;
  const key = f.family + '|' + (f.weight || '');
  if (extraFaces[key]) return;
  extraFaces[key] = `@font-face{font-family:'${f.family}';src:url(${f.src});font-weight:${f.weight || '400 700'}}`;
  document.head.insertAdjacentHTML('beforeend', '<style>' + extraFaces[key] + '</style>');
}
function allFontCSS() {
  return fontCSS + Object.values(extraFaces).join('');
}
function loadDS() {
  BUILTIN.forEach((d) => addDS(d, 'builtin'));
  (window.DESIGN_SYSTEMS || []).forEach((d) => addDS(d, 'file')); // designsystems.js i samme mappe (valgfri)
  try {
    JSON.parse(localStorage.getItem(LS_KEY) || '[]').forEach((d) => addDS(d, 'user'));
  } catch (e) {}
}
function saveUserDS() {
  try {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify(
        DSORDER.filter(
          (i) =>
            DS[i] &&
            DS[i].source === 'user' &&
            !(typeof DSE !== 'undefined' && DSE.draft && DSE.isNew && DSE.draft.id === i),
        ).map((i) => stripDS(DS[i])),
      ),
    );
    return true;
  } catch (e) {
    toast(t('ts_storage_full'));
    return false;
  }
}
function stripDS(d) {
  const { source, ...rest } = d;
  return rest;
}
function currentDSExport() {
  const d = stripDS(DS[S.ds]);
  d.partners = S.partners.map((p) => ({ name: p.name, link: p.link, logo: p.logo }));
  d.footer = Object.assign({}, DS[S.ds].footer, { label: document.getElementById('footerLabel').value });
  return d;
}
function importDSObject(obj) {
  const list = Array.isArray(obj) ? obj : obj.designSystems || [obj];
  const added = [];
  for (const d of list) {
    const r = addDS(d, 'user');
    if (r) added.push(r);
  }
  if (!added.length) return toast(t('ts_none'));
  saveUserDS();
  // which profile to show after importing several: { "default": "<id>" } next to "designSystems",
  // or "default": true on one profile; otherwise the first one in the file
  const want = !Array.isArray(obj) && typeof obj.default === 'string' ? obj.default : null;
  const flagged = list.find((d) => d && d.default === true);
  const n = added.find((r) => r.id === want) || added.find((r) => flagged && r.id === String(flagged.id)) || added[0];
  if (typeof applyPendingLink === 'function' && applyPendingLink(added.map((r) => r.id))) return;
  setDS(n.id);
  toast(t('ts_imported') + ': ' + (added.length > 1 ? added.length + ' · ' : '') + loc(n.name));
}
function importDSFile(file) {
  if (!file) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      let t = rd.result;
      if (/\.js$/i.test(file.name)) {
        const m = t.match(/=\s*(\[[\s\S]*\])\s*;?\s*$/);
        t = m ? m[1] : t;
      }
      importDSObject(JSON.parse(t));
    } catch (e) {
      toast(t('ts_readfail') + ': ' + e.message);
    }
  };
  rd.readAsText(file);
}
function exportDS() {
  const d = currentDSExport();
  dl(
    'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(d, null, 2)),
    'designsystem-' + d.id + '.json',
  );
}
function exportSidecar() {
  const list = DSORDER.filter((i) => DS[i].source !== 'builtin').map((i) =>
    i === S.ds ? currentDSExport() : stripDS(DS[i]),
  );
  if (!list.length) return toast(t('ts_noown'));
  dl(
    'data:text/javascript;charset=utf-8,' +
      encodeURIComponent(
        '// Læg denne fil ved siden af index.html – den indlæses automatisk.\nwindow.DESIGN_SYSTEMS = ' +
          JSON.stringify(list, null, 2) +
          ';\n',
      ),
    'designsystems.js',
  );
}
function deleteDS() {
  const d = DS[S.ds];
  if (d.source !== 'user') return toast(t('ts_onlyown'));
  if (!confirm(t('ts_confirm_del') + ' "' + loc(d.name) + '"?')) return;
  delete DS[d.id];
  DSORDER.splice(DSORDER.indexOf(d.id), 1);
  saveUserDS();
  setDS(DSORDER.find((i) => !DS[i].private) || DSORDER[0]);
}
const shortSrc = (o) => {
  if (o && o.src && o.src.length > 200) return Object.assign({}, o, { src: '(keep)' });
  return o;
};
function openEditor() {
  const d = currentDSExport();
  const isB = DS[S.ds].source !== 'user';
  const copy = Object.assign({}, d, { id: isB ? d.id + '-copy' : d.id, name: isB ? loc(d.name) + ' (copy)' : d.name });
  copy.company = Object.assign({}, copy.company, { logo: shortSrc(copy.company.logo) });
  copy.partners = copy.partners.map((p) => Object.assign({}, p, { logo: shortSrc(p.logo) }));
  document.getElementById('dsJson').value = JSON.stringify(copy, null, 2);
  document.getElementById('editor').open = true;
}
function applyEditor() {
  try {
    const obj = JSON.parse(document.getElementById('dsJson').value);
    const cur = DS[S.ds];
    if (obj.company && obj.company.logo && obj.company.logo.src === '(keep)')
      obj.company.logo.src = cur.company.logo.src;
    (obj.partners || []).forEach((p, i) => {
      if (p.logo && p.logo.src === '(keep)') {
        const o = S.partners[i] || cur.partners[i];
        p.logo.src = o ? o.logo.src : null;
      }
    });
    if (pendingLogo) {
      obj.company = obj.company || {};
      obj.company.logo = Object.assign({}, obj.company.logo || {}, pendingLogo);
      pendingLogo = null;
    }
    importDSObject(obj);
    document.getElementById('editor').open = false;
  } catch (e) {
    toast(t('ts_badjson') + ': ' + e.message);
  }
}
let pendingLogo = null,
  pendingPartnerLogo = null;
function readImage(file, cb) {
  const rd = new FileReader();
  rd.onload = () => {
    const img = new Image();
    img.onload = () => cb({ src: rd.result, aspect: img.width / img.height }, img);
    img.src = rd.result;
  };
  rd.readAsDataURL(file);
}
function pickLogo(file) {
  if (!file) return;
  readImage(file, (l, img) => {
    pendingLogo = l;
    toast(t('ts_logo_picked') + ' (' + img.width + '×' + img.height + ')');
  });
}
function pickPartnerLogo(file) {
  if (!file) return;
  readImage(file, (l) => {
    pendingPartnerLogo = l;
    document.getElementById('pFileName').textContent = file.name;
  });
}
function addPartner() {
  const name = document.getElementById('pName').value.trim(),
    link = document.getElementById('pLink').value.trim();
  if (!name && !pendingPartnerLogo) return toast(t('ts_need_name'));
  S.partners.push({ name, link, logo: pendingPartnerLogo || {} });
  pendingPartnerLogo = null;
  document.getElementById('pName').value = '';
  document.getElementById('pLink').value = '';
  document.getElementById('pFileName').textContent = '';
  ui();
  render();
}
function removePartner(i) {
  S.partners.splice(i, 1);
  ui();
  render();
}
function applyTheme() {
  const d = DS[S.ds],
    c = d.colors,
    r = document.documentElement.style;
  r.setProperty('--primary', c.primary);
  r.setProperty('--accent', c.accent);
  r.setProperty('--accent2', c.accent2);
  r.setProperty('--on-primary', light(c.primary) ? '#111111' : '#ffffff');
  r.setProperty(
    '--accent-on-primary',
    light(c.accent) !== light(c.primary) ? c.accent : light(c.primary) ? '#111111' : '#ffffff',
  );
  r.setProperty('--on-accent', light(c.accent) ? '#111111' : '#ffffff');
  r.setProperty('--on-accent2', light(c.accent2) ? '#111111' : '#ffffff');
  r.setProperty('--fh', "'" + d.fonts.heading + "'");
  r.setProperty('--fb', "'" + d.fonts.body + "'");
  // text colour of the light UI, tinted by the profile (dark UI mode uses its own, see app.css)
  r.setProperty('--ink-brand', light(c.primary) ? '#222' : mix(c.primary, '#000', 0.3));
  // a fixed UI style (default: cool dark) overrides the profile-derived chrome
  if (typeof applyUiStyle === 'function') applyUiStyle();
}

const CK = [
  'labels',
  'detail',
  'legend',
  'showText',
  'showLogo',
  'showFooter',
  'showCities',
  'showNeighbours',
  'relief',
  'autoText',
];
function projectState() {
  const D = DS[S.ds];
  return {
    format: 'mobomap-project',
    version: 1,
    saved: new Date().toISOString(),
    map: S.map,
    country: S.country,
    attr: S.attr,
    attrScope: S.attrScope || 'all',
    proj: S.proj,
    focus: S.focus,
    focusHide: !!S.focusHide,
    far: S.far,
    drag: S.drag,
    dsColours: !!S.dsColours,
    guard: S.guard !== false,
    fx: S.fx,
    zoom: S.zoom,
    frame: document.getElementById('frameSel').value,
    lang: S.lang,
    designSystem: S.ds,
    designSystemData: D.source === 'builtin' ? null : currentDSExport(),
    layout: S.layout,
    style: S.style,
    active: S.active,
    groups: S.groups.map((g) => ({ name: g.name, color: g.color, hl: [...g.hl], kommuner: [...g.sel] })),
    title: document.getElementById('title').value,
    sub: document.getElementById('sub').value,
    titlePos: document.getElementById('titlePos').value,
    subPos: document.getElementById('subPos').value,
    footerLabel: document.getElementById('footerLabel').value,
    partners: S.partners,
    footer: footerOpts(),
    checks: Object.fromEntries(CK.map((k) => [k, document.getElementById(k).checked])),
  };
}
function saveProject() {
  const p = projectState();
  const name = (document.getElementById('title').value || 'mobomap')
    .toLowerCase()
    .replace(/[^a-z0-9æøå]+/g, '-')
    .replace(/^-|-$/g, '');
  dl(
    'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(p, null, 2)),
    (name || 'projekt') + '.mobomap.json',
  );
  toast(t('ts_proj_saved'));
}
// Start-up state: src/default-project.json (a saved project), inlined by the build
const DEFAULT_PROJECT = /*__DEFAULT_PROJECT__*/ null;
function loadProject(p, quiet) {
  if (!p || p.format !== 'mobomap-project') throw new Error(t('ts_not_project'));
  if (p.designSystemData) {
    const r = addDS(p.designSystemData, 'user');
    if (r) {
      saveUserDS();
    }
  }
  if (!DS[p.designSystem] && !(typeof PENDING_LINK !== 'undefined' && PENDING_LINK))
    toast(t('ts_ds_missing').replace('{id}', p.designSystem) + ' ' + loc(DS[DSORDER[0]].name));
  S.ds = DS[p.designSystem] ? p.designSystem : DSORDER[0];
  const D = DS[S.ds];
  S.far = FAR_MODES.includes(p.far) ? p.far : 'inset';
  S.drag = {};
  for (const [k, v] of Object.entries(p.drag || {}))
    if (Array.isArray(v) && v.length === 2 && v.every(Number.isFinite)) S.drag[k] = [v[0], v[1]];
  S.dsColours = !!p.dsColours;
  S.guard = p.guard !== false;
  S.fx = Object.assign(
    {
      fx: [],
      frame: 'none',
      surface: '#e8e4dc',
      seed: 7,
      preset: '',
      amt: {},
      strength: 1,
      light: { dir: 250, warm: 0 },
    },
    p.fx || {},
  );
  S.fx.fx = (S.fx.fx || []).filter((id) => FX_IDS.includes(id));
  // title flair: 'auto' (design system / style) only for a start from zero settings; a saved project or
  // link made before the effects existed keeps its plain title
  const fresh = p === DEFAULT_PROJECT;
  if (!TITLE_FX.includes(S.fx.title)) S.fx.title = fresh ? 'auto' : 'none';
  if (!SUB_FX.includes(S.fx.sub)) S.fx.sub = fresh ? 'auto' : 'none';
  if (!FRAME_IDS.includes(S.fx.frame)) S.fx.frame = 'none';
  setData(p.country != null ? p.country || 'world' : p.map === 'dk' ? 'DNK' : 'world');
  S.attr = p.attr || 'none';
  S.attrScope = typeof p.attrScope === 'string' ? p.attrScope : 'all';
  document.getElementById('titlePos').value = p.titlePos || 'auto';
  document.getElementById('subPos').value = p.subPos || 'under';
  S.proj = PROJS[p.proj] ? p.proj : GEO.geo ? (S.country ? 'local' : DEFAULT_PROJ) : DEFAULT_PROJ;
  S.focus = p.focus || '';
  // a focus that does not exist in this map (old project, hand-edited link) is dropped
  if (S.focus) {
    const f = S.focus,
      ok = f.startsWith(CITY_PREFIX)
        ? cityList().some((c) => CITY_PREFIX + c.n === f)
        : Object.hasOwn(GEO.groups, f) || GEO.units.some((u) => u.c === f);
    if (!ok) {
      S.focus = '';
      if (!quiet || p.focus) setTimeout(() => toast(t('ts_focus_missing') + ': ' + f), 600);
    }
  }
  S.focusHide = !!p.focusHide;
  if (p.zoom && Number.isFinite(+p.zoom.k) && p.zoom.k > 0)
    S.zoom = {
      k: Math.min(40, Math.max(0.5, +p.zoom.k)),
      x: Number.isFinite(+p.zoom.x) ? +p.zoom.x : 0,
      y: Number.isFinite(+p.zoom.y) ? +p.zoom.y : 0,
    };
  document.getElementById('frameSel').value = ['on', 'off'].includes(p.frame) ? p.frame : 'auto';
  document.getElementById('focusHide').checked = S.focusHide;
  if (p.lang) setLang(p.lang, true);
  S.layout = LAYOUTS.some((l) => l.id === p.layout) ? p.layout : 'land';
  S.style = STYLES.some((s) => s.id === p.style) ? p.style : 'flat';
  S.groups = (p.groups || []).map((g, gi) => {
    const n = newGroup(g.name || t('group') + ' ' + (gi + 1), g.hl || ['fill'], g.color || D.highlight[0]);
    (g.kommuner || []).forEach((c) => {
      const code = byName[String(c).toLowerCase()] || byName[c];
      if (code) n.sel.add(code);
    });
    return n;
  });
  S.active = Math.min(p.active || 0, S.groups.length - 1);
  S.partners = (p.partners || D.partners).map((q) => ({
    name: q.name || '',
    link: q.link || '',
    logo: Object.assign({}, q.logo || {}),
    ...(q.id ? { id: String(q.id) } : {}),
    ...(q.hidden ? { hidden: true } : {}),
    ...(q.row ? { row: +q.row || 0 } : {}),
    ...(q.scale && +q.scale !== 1 ? { scale: +q.scale } : {}),
  }));
  S.footer = Object.assign({}, FOOTER_DEFAULT, p.footer || {});
  if (p.partnerOrder) applyPartnerOrder(p.partnerOrder);
  document.getElementById('title').value = p.title ?? '';
  document.getElementById('sub').value = p.sub ?? '';
  document.getElementById('footerLabel').value = p.footerLabel ?? loc(D.footer.label);
  for (const k of CK) if (p.checks && k in p.checks) document.getElementById(k).checked = !!p.checks[k];
  ui();
  render();
  if (!quiet) toast(t('ts_proj_opened'));
}
function openProjectFile(file) {
  if (!file) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      loadProject(JSON.parse(rd.result));
    } catch (e) {
      toast(t('ts_openfail') + ': ' + e.message);
    }
  };
  rd.readAsText(file);
}
document.addEventListener('dragover', (e) => {
  e.preventDefault();
});
document.addEventListener('drop', (e) => {
  e.preventDefault();
  const f = e.dataTransfer.files[0];
  if (!f) return;
  if (/\.mobomap\.json$/i.test(f.name)) openProjectFile(f);
  else if (/\.(json|js)$/i.test(f.name)) importDSFile(f);
});

const CK = ['labels', 'detail', 'legend', 'showText', 'showLogo', 'showFooter', 'showCities', 'showNeighbours'];
function projectState() {
  const D = DS[S.ds];
  return {
    format: 'mobomap-project',
    version: 1,
    saved: new Date().toISOString(),
    map: S.map,
    country: S.country,
    attr: S.attr,
    proj: S.proj,
    focus: S.focus,
    focusHide: !!S.focusHide,
    lang: S.lang,
    designSystem: S.ds,
    designSystemData: D.source === 'builtin' ? null : currentDSExport(),
    layout: S.layout,
    style: S.style,
    active: S.active,
    groups: S.groups.map((g) => ({ name: g.name, color: g.color, hl: [...g.hl], kommuner: [...g.sel] })),
    title: document.getElementById('title').value,
    sub: document.getElementById('sub').value,
    footerLabel: document.getElementById('footerLabel').value,
    partners: S.partners,
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
function loadProject(p) {
  if (!p || p.format !== 'mobomap-project') throw new Error(t('ts_not_project'));
  if (p.designSystemData) {
    const r = addDS(p.designSystemData, 'user');
    if (r) {
      saveUserDS();
    }
  }
  if (!DS[p.designSystem]) toast(t('ts_ds_missing').replace('{id}', p.designSystem) + ' ' + loc(DS[DSORDER[0]].name));
  S.ds = DS[p.designSystem] ? p.designSystem : DSORDER[0];
  const D = DS[S.ds];
  setData(p.country != null ? p.country || 'world' : p.map === 'dk' ? 'DNK' : 'world');
  S.attr = p.attr || 'none';
  S.proj = PROJS[p.proj] ? p.proj : GEO.geo ? (S.country ? 'local' : 'robinson') : 'robinson';
  S.focus = p.focus || '';
  S.focusHide = !!p.focusHide;
  document.getElementById('focusHide').checked = S.focusHide;
  if (p.lang) setLang(p.lang, true);
  S.layout = LAYOUTS.some((l) => l.id === p.layout) ? p.layout : 'land';
  S.style = STYLES.some((s) => s.id === p.style) ? p.style : 'flat';
  S.groups = (p.groups || []).map((g) => {
    const n = newGroup(g.name || t('group'), g.hl || ['fill'], g.color || D.highlight[0]);
    (g.kommuner || []).forEach((c) => {
      if (byName[c]) n.sel.add(c);
    });
    return n;
  });
  S.active = Math.min(p.active || 0, S.groups.length - 1);
  S.partners = (p.partners || D.partners).map((q) => ({
    name: q.name || '',
    link: q.link || '',
    logo: Object.assign({}, q.logo || {}),
  }));
  document.getElementById('title').value = p.title ?? '';
  document.getElementById('sub').value = p.sub ?? '';
  document.getElementById('footerLabel').value = p.footerLabel ?? '';
  for (const k of CK) if (p.checks && k in p.checks) document.getElementById(k).checked = !!p.checks[k];
  ui();
  render();
  toast(t('ts_proj_opened'));
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

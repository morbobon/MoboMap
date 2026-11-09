// Boot: design systems, language, then the default project (src/default-project.json).
applySections();
setTab(localStorage.getItem('mobomap.tab') || 'map');
chromeFromUrl(location.search);
applyChrome();
document.getElementById('snapCk').checked = snapOn();
loadDS();
S.ds = DSORDER.find((i) => !DS[i].private) || DSORDER[0];
applyUiMode();
setLang(localStorage.getItem('mobomap.lang') || 'en', true);
setData('world');
S.visited.add('world');
setDS(S.ds);
CK.forEach((k) => (DEFAULT_CHECKS[k] = document.getElementById(k).checked));
if (DEFAULT_PROJECT) loadProject(DEFAULT_PROJECT, true);
// a shared link (?c=DNK&st=topo&…) on top of the start project
try {
  const fromUrl = projectFromUrl(location.search);
  if (fromUrl) loadProject(fromUrl, true);
} catch (e) {
  toast(t('ts_link_bad') + ': ' + e.message);
}

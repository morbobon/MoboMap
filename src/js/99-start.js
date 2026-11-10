// Boot: design systems, language, then the default project (src/default-project.json).
applySections();
setTab(localStorage.getItem('mobomap.tab') || 'map');
chromeFromUrl(location.search);
applyChrome();
document.getElementById('snapCk').checked = snapOn();
document.getElementById('autoDetail').checked = autoDetailOn();
document.getElementById('homeAsk').checked = homeAsk();
loadDS();
S.ds = DSORDER.find((i) => !DS[i].private) || DSORDER[0];
applyUiMode();
setLang(localStorage.getItem('mobomap.lang') || 'en', true);
setData('world');
S.visited.add('world');
setDS(S.ds);
CK.forEach((k) => (DEFAULT_CHECKS[k] = document.getElementById(k).checked));
// a shared link (?c=DNK&st=topo&…) on top of the start project, which is then not drawn first
let fromUrl = null;
try {
  fromUrl = projectFromUrl(location.search);
} catch (e) {
  toast(t('ts_link_bad') + ': ' + e.message);
}
if (DEFAULT_PROJECT) loadProject(DEFAULT_PROJECT, true, !!fromUrl);
try {
  if (fromUrl) loadProject(fromUrl, true);
} catch (e) {
  toast(t('ts_link_bad') + ': ' + e.message);
}
// a phone held upright starts on a portrait page (a link keeps the page it was made with)
if (!fromUrl && isPhone() && innerHeight > innerWidth && layoutOf(S.layout).w > layoutOf(S.layout).h) {
  S.layout = 'port';
  ui();
  render();
}
window.MOBOMAP_READY = true; // start-up done (setTab may redraw from now on)

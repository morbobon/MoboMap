// Boot: design systems, language, then the default project (src/default-project.json).
applySections();
loadDS();
S.ds = DSORDER.find((i) => !DS[i].private) || DSORDER[0];
applyUiMode();
setLang(localStorage.getItem('mobomap.lang') || 'en', true);
setData('world');
S.visited.add('world');
setDS(S.ds);
if (DEFAULT_PROJECT) loadProject(DEFAULT_PROJECT, true);

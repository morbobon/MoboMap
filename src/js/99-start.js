// Boot: design systems, language, world view with an example selection (the Nordic countries).
loadDS();
S.ds = DSORDER.find((i) => !DS[i].private) || DSORDER[0];
setLang(localStorage.getItem('mobomap.lang') || 'en', true);
setData('world');
S.groups = [
  newGroup(t('g_fill'), ['fill', 'glow'], DS[S.ds].highlight[0]),
  newGroup(t('g_hatch'), ['hatch'], DS[S.ds].highlight[1] || DS[S.ds].highlight[0]),
];
MAPS.world.defaults.forEach((c) => S.groups[0].sel.add(c));
setDS(S.ds);

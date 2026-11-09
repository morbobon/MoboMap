function listNames(arr) {
  if (arr.length <= 1) return arr.join('');
  return arr.slice(0, -1).join(', ') + ' ' + t('and') + ' ' + arr[arr.length - 1];
}
function autoText() {
  const fc = focusCity();
  const place = fc
    ? fc.n
    : S.focus
      ? GEO.groups[S.focus] || nm(GEO.units.find((k) => k.c === S.focus) || { n: '' })
      : S.country
        ? countryName(S.country)
        : t('world');
  const gs = S.groups.filter((g) => g.sel.size);
  const tot = gs.reduce((n, g) => n + g.sel.size, 0);
  let sub = '';
  if (tot && tot <= 4) {
    sub = listNames(
      gs
        .flatMap((g) => [...g.sel])
        .map((c) => GEO.units.find((k) => k.c === c))
        .filter(Boolean)
        .map(nm),
    );
  } else if (gs.length === 1) {
    const nms = [...gs[0].sel]
      .map((c) => GEO.units.find((k) => k.c === c))
      .filter(Boolean)
      .map(nm);
    sub = tot + ' ' + t(MAPS[S.map].unitKey) + ': ' + nms.slice(0, 3).join(', ') + ' +' + (tot - 3);
  } else if (gs.length > 1) sub = gs.map((g) => g.name + ': ' + g.sel.size).join(' · ');
  const AT = attrDef();
  if (AT) sub = sub ? sub + ' · ' + t(AT.n) : t(AT.n);
  return { title: place, sub };
}

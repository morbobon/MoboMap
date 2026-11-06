// Attributes: colour every unit by a property ("Colour by"), or turn the categories into highlight groups.
// An attribute is { id, n: i18n key for its name, f: unit -> category label, ord?: ordered labels }.
// Ordered attributes are drawn as tints of the land colour; the rest use the categorical PATCH palette.

// Value -> i18n key for Natural Earth's economy and income classes, and the religion table
const ECO = {
  'Developed region: G7': 'eco_1',
  'Developed region: nonG7': 'eco_2',
  'Emerging region: BRIC': 'eco_3',
  'Emerging region: MIKT': 'eco_4',
  'Emerging region: G20': 'eco_5',
  'Developing region': 'eco_6',
  'Least developed region': 'eco_7',
};
const INC = {
  'High income: OECD': 'inc_1',
  'High income: nonOECD': 'inc_2',
  'Upper middle income': 'inc_3',
  'Lower middle income': 'inc_4',
  'Low income': 'inc_5',
};
const REL = ['christian', 'muslim', 'hindu', 'buddhist', 'jewish', 'folk', 'unaffiliated', 'unknown'];
const POP_BANDS = ['< 1 M', '1–10 M', '10–50 M', '50–200 M', '> 200 M'];
const GDP_BANDS = ['< $2k', '$2–8k', '$8–20k', '$20–45k', '> $45k'];

const band = (v, cuts, labels) => {
  let i = 0;
  while (i < cuts.length && v >= cuts[i]) i++;
  return labels[i];
};
const yesNo = (b) => t(b ? 'yes' : 'no');
const areaBand = (k) => {
  const a = GEO.units.map((u) => u.a).sort((x, y) => x - y);
  const q = (i) => a[Math.floor(a.length * i)];
  return t(k.a < q(0.25) ? 'area_s' : k.a < q(0.5) ? 'area_m' : k.a < q(0.75) ? 'area_l' : 'area_xl');
};
const initial = (k) => nm(k)[0].toUpperCase();
const keysOf = (map) => Object.values(map);

// Attributes shared by every dataset
const COMMON = [
  { id: 'area', n: 'attr_area', ordKeys: ['area_s', 'area_m', 'area_l', 'area_xl'], f: areaBand },
  { id: 'initial', n: 'attr_initial', f: initial },
];

const ATTRS = {
  world: [
    { id: 'group', n: 'attr_continent', f: (k) => GEO.groups[k.r] },
    { id: 'un', n: 'attr_un', f: (k) => k.at.un },
    { id: 'sub', n: 'attr_sub', f: (k) => k.at.sub },
    { id: 'eco', n: 'attr_eco', ordKeys: keysOf(ECO), f: (k) => t(ECO[k.at.eco] || 'eco_6') },
    { id: 'inc', n: 'attr_inc', ordKeys: keysOf(INC), f: (k) => t(INC[k.at.inc] || 'inc_3') },
    { id: 'pop', n: 'attr_pop', ord: POP_BANDS, f: (k) => band(k.at.pop, [1e6, 1e7, 5e7, 2e8], POP_BANDS) },
    {
      id: 'gdp',
      n: 'attr_gdp',
      ord: GDP_BANDS,
      f: (k) => band((k.at.gdp * 1e6) / Math.max(1, k.at.pop), [2000, 8000, 20000, 45000], GDP_BANDS),
    },
    { id: 'rel', n: 'attr_rel', f: (k) => t('rel_' + (REL.includes(k.at.rel) ? k.at.rel : 'unknown')) },
    { id: 'eu', n: 'attr_eu', f: (k) => yesNo(GEO.lists.eu.includes(k.c)) },
    { id: 'nato', n: 'attr_nato', f: (k) => yesNo(GEO.lists.nato.includes(k.c)) },
    { id: 'g20', n: 'attr_g20', f: (k) => yesNo(GEO.lists.g20.includes(k.c)) },
    { id: 'nordic', n: 'attr_nordic', f: (k) => yesNo(GEO.lists.nordic.includes(k.c)) },
    { id: 'hemi', n: 'attr_hemi', f: (k) => t(k.p[1] < 90 ? 'hemi_n' : 'hemi_s') },
    ...COMMON,
  ],
  // Any country's admin-1 units
  adm1: [
    { id: 'group', n: 'attr_region', f: (k) => GEO.groups[k.r] },
    { id: 'type', n: 'attr_type', f: (k) => k.typ || '–' },
    ...COMMON,
  ],
  // Denmark (municipalities): extra Danish groupings
  dk: [
    { id: 'group', n: 'attr_region', f: (k) => GEO.groups[k.r] },
    {
      id: 'landsdel',
      n: 'attr_landsdel',
      f: (k) =>
        t(
          k.c === '400'
            ? 'dk_bornholm'
            : GEO.lists.fyn.includes(k.c)
              ? 'dk_funen'
              : ['360', '376'].includes(k.c)
                ? 'dk_lollandfalster'
                : ['DK-81', 'DK-82', 'DK-83'].includes(k.r)
                  ? 'dk_jutland'
                  : 'dk_zealand',
        ),
    },
    { id: 'storkbh', n: 'attr_storkbh', f: (k) => yesNo(GEO.lists.storkbh.includes(k.c)) },
    ...COMMON,
  ],
};

function attrDef() {
  return (ATTRS[S.map] || []).find((a) => a.id === S.attr) || null;
}
// Categories present in the current dataset, in display order
function attrCats(a) {
  const vals = [...new Set(GEO.units.map(a.f))];
  const ord = a.ord || (a.ordKeys && a.ordKeys.map(t));
  return ord ? ord.filter((v) => vals.includes(v)) : vals.sort((x, y) => String(x).localeCompare(String(y), S.lang));
}
// Colour of category i of n (ordered: tints of the land colour; categorical: palette)
function attrColor(a, i, n, land, offset = 0) {
  return a.ord || a.ordKeys
    ? mix(mix(land, '#ffffff', 0.72), land, n > 1 ? i / (n - 1) : 1)
    : PATCH[(i + offset) % PATCH.length];
}

// One highlight group per category, so several attributes can be combined and styled independently
function attrToGroups() {
  const a = attrDef();
  if (!a) return;
  const cats = attrCats(a);
  const land = DS[S.ds].colors.land;
  cats.forEach((v, i) => {
    const g = newGroup(String(v), ['fill'], attrColor(a, i, cats.length, land, S.groups.length));
    for (const k of GEO.units) {
      if (a.f(k) !== v) continue;
      S.groups.forEach((o) => o.sel.delete(k.c));
      g.sel.add(k.c);
    }
    S.groups.push(g);
  });
  S.attr = 'none';
  S.active = S.groups.length - 1;
  ui();
  render();
  toast(t('groups_added').replace('{n}', cats.length));
}

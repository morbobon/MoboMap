// Attributes: colour every unit by a property ("Colour by"), or turn the categories into highlight groups.
// An attribute is { id, cat, n, f, ord?|ordKeys?, ramp?, stat? }:
//   cat      dropdown group (cat_<cat> i18n key)        n     i18n key of its name
//   f        unit -> category label (already translated) ord   ordered labels / ordKeys: ordered i18n keys
//   ramp     'bad' | 'good' | 'neutral' sequential colours for ordered classes (default: tints of the land colour)
//   stat     indicator id in DATA.world.statsMeta (adds a source line to the legend)
// Units without data get the "No data" class, drawn light grey and listed last.

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
const ATTR_CATS = ['geo', 'economy', 'society', 'health', 'politics', 'environment', 'local'];
// Sequential ramps: light -> strong
const RAMPS = { bad: ['#fde7d9', '#a50f15'], good: ['#e3f1e6', '#08589e'], neutral: ['#f1ece4', '#5b4a3a'] };
const NO_DATA_COLOR = '#d6d6d6';

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
// Labels for numeric classes: "< a", "a–b", …, "> z" with an optional unit
const rangeLabels = (cuts, unit = '') => [
  `< ${cuts[0]}${unit}`,
  ...cuts.slice(1).map((c, i) => `${cuts[i]}–${c}${unit}`),
  `> ${cuts[cuts.length - 1]}${unit}`,
];
// A statistic from DATA.world.statsMeta, classed by fixed cuts (labels: numeric ranges or i18n keys)
function stat(id, cat, n, cuts, ramp, { unit = '', keys = null } = {}) {
  const labels = keys || rangeLabels(cuts, unit);
  const lab = (i) => (keys ? t(labels[i]) : labels[i]);
  return {
    id,
    cat,
    n,
    stat: id,
    ramp,
    ...(keys ? { ordKeys: keys } : { ord: labels }),
    f: (k) => {
      const v = k.st && k.st[id];
      if (v == null) return t('no_data');
      let i = 0;
      while (i < cuts.length && v >= cuts[i]) i++;
      return lab(i);
    },
  };
}

// A regional statistic (Statistics Denmark, Eurostat, CDC …): five classes from the map's own spread
// (quintiles, rounded to tidy numbers), since every country has its own range
// rounding step from the spread of the values (a narrow 74–79 range still gets five classes)
const niceStep = (range) => {
  const p = 10 ** Math.floor(Math.log10(Math.max(1e-9, range / 20)));
  const f = range / 20 / p;
  return p * (f >= 5 ? 5 : f >= 2 ? 2 : 1);
};
const nice = (v, step) => +(Math.round(v / step) * step).toPrecision(12);
const fmtN = (v) =>
  Math.abs(v) >= 10000 ? Math.round(v).toLocaleString('en').replace(/,/g, ' ') : String(+v.toFixed(2));
const QCUTS = {};
function qcuts(id) {
  const key = (S.country || 'world') + '|' + id;
  if (QCUTS[key]) return QCUTS[key];
  const v = GEO.units
    .map((k) => k.st && k.st[id])
    .filter((x) => x != null)
    .sort((a, b) => a - b);
  if (v.length < 3) return (QCUTS[key] = []);
  // quantiles over distinct values (regions sharing one NUTS value count once); each boundary rounded to the
  // finer of two significant digits and a step from the overall spread
  const u = [...new Set(v)];
  const step = niceStep(u[u.length - 1] - u[0]);
  const cuts = [
    ...new Set(
      [0.2, 0.4, 0.6, 0.8].map((q) => {
        const x = u[Math.min(u.length - 1, Math.floor(u.length * q))];
        return nice(x, Math.min(step, niceStep(Math.abs(x) * 1.2)));
      }),
    ),
  ];
  return (QCUTS[key] = cuts.filter((c, i) => c > v[0] && c <= v[v.length - 1] && (!i || c > cuts[i - 1])));
}
function qstat(id, cat, n, ramp) {
  const unit = () => ((GEO.statsMeta || {})[id] || {}).unit || '';
  const labels = () => {
    const c = qcuts(id),
      u = unit().replace(/^ ?(\/|‰)/, ' $1');
    if (!c.length) return [];
    return [
      `< ${fmtN(c[0])}${u}`,
      ...c.slice(1).map((x, i) => `${fmtN(c[i])}–${fmtN(x)}${u}`),
      `> ${fmtN(c[c.length - 1])}${u}`,
    ];
  };
  return {
    id,
    cat,
    n,
    stat: id,
    ramp,
    regional: true,
    get ord() {
      return labels();
    },
    f: (k) => {
      const v = k.st && k.st[id];
      if (v == null) return t('no_data');
      const c = qcuts(id);
      let i = 0;
      while (i < c.length && v >= c[i]) i++;
      return labels()[i];
    },
  };
}
// statistics the current map has data for
const hasStat = (a) => !a.stat || GEO.units.some((k) => k.st && k.st[a.stat] != null);
// Eurostat (EU, EFTA, Turkey, candidates) and US states; only those with data show up per country
const REGIONAL = [
  qstat('es_gdp', 'economy', 'attr_gdp_pps', 'good'),
  qstat('es_income', 'economy', 'attr_hh_income', 'good'),
  qstat('es_unemp', 'economy', 'attr_unemp', 'bad'),
  qstat('es_poverty', 'economy', 'attr_arope', 'bad'),
  qstat('us_income', 'economy', 'attr_hh_income', 'good'),
  qstat('us_unemp', 'economy', 'attr_unemp', 'bad'),
  qstat('us_childPoverty', 'economy', 'attr_child_poverty', 'bad'),
  qstat('es_density', 'society', 'attr_density', 'neutral'),
  qstat('es_medianAge', 'society', 'attr_median_age', 'neutral'),
  qstat('us_medianAge', 'society', 'attr_median_age', 'neutral'),
  qstat('es_old65', 'society', 'attr_old65', 'neutral'),
  qstat('es_higherEdu', 'society', 'attr_higher_edu', 'good'),
  qstat('us_someCollege', 'society', 'attr_some_college', 'good'),
  qstat('us_crime', 'society', 'attr_violent_crime', 'bad'),
  qstat('es_life', 'health', 'attr_life', 'good'),
  qstat('us_life', 'health', 'attr_life', 'good'),
  qstat('es_infant', 'health', 'attr_infant', 'bad'),
  qstat('us_obesity', 'health', 'attr_obesity', 'bad'),
  qstat('us_diabetes', 'health', 'attr_diabetes', 'bad'),
  qstat('us_smoking', 'health', 'attr_smoking', 'bad'),
  qstat('us_inactive', 'health', 'attr_inactive', 'bad'),
  qstat('us_foodInsecure', 'health', 'attr_food_insecure', 'bad'),
  qstat('us_overdose', 'health', 'attr_overdose', 'bad'),
  qstat('us_uninsured', 'health', 'attr_uninsured', 'bad'),
];
// Denmark's municipalities (Statistics Denmark)
const DK_STATS = [
  qstat('income', 'economy', 'attr_disp_income', 'good'),
  qstat('gini', 'economy', 'attr_gini', 'bad'),
  qstat('unemp', 'economy', 'attr_unemp', 'bad'),
  qstat('pop', 'society', 'attr_population', 'neutral'),
  qstat('density', 'society', 'attr_density', 'neutral'),
  qstat('avgAge', 'society', 'attr_avg_age', 'neutral'),
  qstat('old65', 'society', 'attr_old65', 'neutral'),
  qstat('higherEdu', 'society', 'attr_higher_edu', 'good'),
  qstat('immig', 'society', 'attr_immig', 'neutral'),
  qstat('crime', 'society', 'attr_crime', 'bad'),
  qstat('life', 'health', 'attr_life', 'good'),
];

// Attributes shared by every dataset
const COMMON = [
  { id: 'area', cat: 'geo', n: 'attr_area', ordKeys: ['area_s', 'area_m', 'area_l', 'area_xl'], f: areaBand },
  { id: 'initial', cat: 'geo', n: 'attr_initial', f: initial },
];

const ATTRS = {
  world: [
    // Geography
    { id: 'group', cat: 'geo', n: 'attr_continent', f: (k) => GEO.groups[k.r] },
    { id: 'un', cat: 'geo', n: 'attr_un', f: (k) => k.at.un },
    { id: 'sub', cat: 'geo', n: 'attr_sub', f: (k) => k.at.sub },
    { id: 'hemi', cat: 'geo', n: 'attr_hemi', f: (k) => t(k.p[1] < 90 ? 'hemi_n' : 'hemi_s') },
    ...COMMON,
    // Economy
    {
      id: 'inc',
      cat: 'economy',
      n: 'attr_inc',
      ordKeys: keysOf(INC),
      ramp: 'good',
      f: (k) => t(INC[k.at.inc] || 'inc_3'),
    },
    { id: 'eco', cat: 'economy', n: 'attr_eco', ordKeys: keysOf(ECO), f: (k) => t(ECO[k.at.eco] || 'eco_6') },
    {
      id: 'gdp',
      cat: 'economy',
      n: 'attr_gdp',
      ord: GDP_BANDS,
      ramp: 'good',
      f: (k) => band((k.at.gdp * 1e6) / Math.max(1, k.at.pop), [2000, 8000, 20000, 45000], GDP_BANDS),
    },
    stat('poverty', 'economy', 'attr_poverty', [1, 5, 20, 40], 'bad', { unit: ' %' }),
    // Society
    {
      id: 'pop',
      cat: 'society',
      n: 'attr_pop',
      ord: POP_BANDS,
      ramp: 'neutral',
      f: (k) => band(k.at.pop, [1e6, 1e7, 5e7, 2e8], POP_BANDS),
    },
    stat('life', 'society', 'attr_life', [60, 65, 70, 75, 80], 'good'),
    stat('hdi', 'society', 'attr_hdi', [0.55, 0.7, 0.8], 'good', { keys: ['hdi_1', 'hdi_2', 'hdi_3', 'hdi_4'] }),
    stat('medianAge', 'society', 'attr_median_age', [20, 30, 40], 'neutral'),
    stat('fertility', 'society', 'attr_fertility', [1.5, 2.1, 3, 4], 'neutral'),
    stat('internet', 'society', 'attr_internet', [25, 50, 75, 90], 'good', { unit: ' %' }),
    stat('electricity', 'society', 'attr_electricity', [50, 80, 95, 99], 'good', { unit: ' %' }),
    { id: 'rel', cat: 'society', n: 'attr_rel', f: (k) => t('rel_' + (REL.includes(k.at.rel) ? k.at.rel : 'unknown')) },
    // Health
    stat('obesity', 'health', 'attr_obesity', [10, 20, 30, 40], 'bad', { unit: ' %' }),
    stat('hunger', 'health', 'attr_hunger', [5, 10, 20, 35], 'bad', { unit: ' %' }),
    // Conflict & politics
    stat('conflict', 'politics', 'attr_conflict', [1, 100, 1000], 'bad', {
      keys: ['conf_0', 'conf_1', 'conf_2', 'conf_3'],
    }),
    stat('regime', 'politics', 'attr_regime', [1, 2, 3], 'good', {
      keys: ['regime_0', 'regime_1', 'regime_2', 'regime_3'],
    }),
    { id: 'eu', cat: 'politics', n: 'attr_eu', f: (k) => yesNo(GEO.lists.eu.includes(k.c)) },
    { id: 'nato', cat: 'politics', n: 'attr_nato', f: (k) => yesNo(GEO.lists.nato.includes(k.c)) },
    { id: 'g20', cat: 'politics', n: 'attr_g20', f: (k) => yesNo(GEO.lists.g20.includes(k.c)) },
    { id: 'nordic', cat: 'politics', n: 'attr_nordic', f: (k) => yesNo(GEO.lists.nordic.includes(k.c)) },
    // Environment
    stat('co2', 'environment', 'attr_co2', [1, 3, 6, 10], 'bad', { unit: ' t' }),
    stat('renewables', 'environment', 'attr_renewables', [20, 40, 60, 80], 'good', { unit: ' %' }),
  ],
  // Any country's admin-1 units
  adm1: [
    { id: 'group', cat: 'geo', n: 'attr_region', f: (k) => GEO.groups[k.r] },
    { id: 'type', cat: 'geo', n: 'attr_type', f: (k) => k.typ || '–' },
    ...COMMON,
    ...REGIONAL,
  ],
  // Denmark (municipalities): extra Danish groupings
  dk: [
    { id: 'group', cat: 'geo', n: 'attr_region', f: (k) => GEO.groups[k.r] },
    {
      id: 'landsdel',
      cat: 'local',
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
    { id: 'storkbh', cat: 'local', n: 'attr_storkbh', f: (k) => yesNo(GEO.lists.storkbh.includes(k.c)) },
    ...COMMON,
    ...DK_STATS,
  ],
};

function attrDef() {
  return (ATTRS[S.map] || []).find((a) => a.id === S.attr && hasStat(a)) || null;
}
// Categories present in the current dataset, in display order ("No data" last)
function attrCats(a) {
  const nd = t('no_data');
  const vals = [...new Set(GEO.units.map(a.f))];
  const ord = a.ord || (a.ordKeys && a.ordKeys.map(t));
  const cats = ord
    ? ord.filter((v) => vals.includes(v))
    : vals.filter((v) => v !== nd).sort((x, y) => String(x).localeCompare(String(y), S.lang));
  return vals.includes(nd) ? [...cats, nd] : cats;
}
// Colour of category v among cats: ordered -> ramp (or tints of the land colour); categorical -> palette
function attrColor(a, v, cats, land, offset = 0) {
  if (v === t('no_data')) return NO_DATA_COLOR;
  const real = cats.filter((c) => c !== t('no_data'));
  const i = Math.max(0, real.indexOf(v)),
    n = real.length;
  const f = n > 1 ? i / (n - 1) : 1;
  if (a.ord || a.ordKeys) {
    const r = RAMPS[a.ramp];
    return r ? mix(r[0], r[1], f) : mix(mix(land, '#ffffff', 0.72), land, f);
  }
  return PATCH[(i + offset) % PATCH.length];
}
// Legend source line for statistics, e.g. "Source: WHO via Our World in Data, 2024"
function attrSource(a) {
  const m = a && a.stat && GEO.statsMeta && GEO.statsMeta[a.stat];
  return m ? t('data_source').replace('{src}', m.source).replace('{year}', m.year) : '';
}

// One highlight group per category, so several attributes can be combined and styled independently
function attrToGroups() {
  const a = attrDef();
  if (!a) return;
  const cats = attrCats(a);
  const land = DS[S.ds].colors.land;
  cats.forEach((v) => {
    const g = newGroup(String(v), ['fill'], attrColor(a, v, cats, land, S.groups.length));
    for (const k of GEO.units) {
      if (a.f(k) !== v || !attrInScope(k)) continue;
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

// Where "Colour by" applies: 'all' | 'focus' (the focused area) | 'sel' (highlighted units) | 'r:<group>'
// (one continent / region). Units outside keep the map style's own colour.
S.attrScope = 'all';
function attrInScope(k) {
  const s = S.attrScope || 'all';
  if (s === 'all') return true;
  if (s === 'focus') return !S.focus || inFocus(k);
  if (s === 'sel') return S.groups.some((g) => !g.off && g.sel.has(k.c));
  if (s.startsWith('r:')) return k.r === s.slice(2);
  return true;
}
function attrScopeUI() {
  const el = document.getElementById('attrScope');
  if (!el) return;
  const regs = Object.entries(GEO.groups).filter(([r]) => r !== '_');
  el.innerHTML =
    `<option value="all">${esc(t('scope_all'))}</option>` +
    `<option value="focus">${esc(t('scope_focus'))}</option>` +
    `<option value="sel">${esc(t('scope_sel'))}</option>` +
    (regs.length > 1
      ? `<optgroup label="${esc(t('scope_only'))}">` +
        regs.map(([r, n]) => `<option value="r:${esc(r)}">${esc(n)}</option>`).join('') +
        '</optgroup>'
      : '');
  const ok = [...el.options].some((o) => o.value === S.attrScope);
  if (!ok) S.attrScope = 'all';
  el.value = S.attrScope;
  el.style.display = S.attr && S.attr !== 'none' ? '' : 'none';
}

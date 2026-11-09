// Regional statistics for the regions inside countries, written to assets/geo/regional-stats.json:
//   { meta: { <id>: { source, year, unit } }, dk: { <municipality code>: { <id>: number } },
//     adm1: { <ISO3>: { <adm1_code>: { <id>: number } } } }
// Sources (all open data):
//   Denmark, 98 municipalities – Statistics Denmark (api.statbank.dk)
//   EU / EFTA / Turkey regions – Eurostat regional statistics (NUTS), matched to the map's regions by name
//   USA, states – US Census Bureau (ACS) and CDC
// Run: node tools/prepare-regional-stats.mjs   (needs internet; prints what it could not match)
import fs from 'fs';

const OUT = 'assets/geo/regional-stats.json';
const out = { meta: {}, dk: {}, adm1: {} };
const meta = (id, source, year, unit = '') => (out.meta[id] = { source, year: String(year), unit });
const r1 = (v) => Math.round(v * 10) / 10;

// ---------- Denmark: Statistics Denmark ----------
const DST = 'https://api.statbank.dk/v1';
async function dstInfo(table) {
  const r = await fetch(`${DST}/tableinfo/${table}?lang=en&format=JSON`);
  return r.json();
}
// rows of { <variable>: code, value } for the given selection; '*' = all codes
async function dst(table, vars) {
  const body = {
    table,
    format: 'BULK',
    lang: 'en',
    valuePresentation: 'Code',
    variables: Object.entries(vars).map(([code, values]) => ({ code, values: [].concat(values) })),
  };
  const r = await fetch(`${DST}/data`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(table + ': ' + txt.slice(0, 200));
  const [head, ...lines] = txt.trim().split(/\r?\n/);
  const cols = head.split(';');
  return lines.map((l) => {
    const c = l.split(';');
    const o = {};
    cols.forEach((k, i) => (o[k] = c[i]));
    o.value = parseFloat(String(o.INDHOLD).replace(',', '.'));
    return o;
  });
}
const lastTime = async (table) => {
  const info = await dstInfo(table);
  const t = info.variables.find((v) => v.time || v.id === 'Tid');
  return t.values[t.values.length - 1].id;
};
const isKom = (c) => /^\d{3}$/.test(c) && c !== '000' && !/^08\d$/.test(c);
const put = (code, id, v) => {
  if (!isKom(code) || !Number.isFinite(v)) return;
  (out.dk[code] = out.dk[code] || {})[id] = v;
};
async function denmark() {
  // population, density, share 65+
  const q = await lastTime('FOLK1A');
  const pop = await dst('FOLK1A', { OMRÅDE: '*', KØN: 'TOT', ALDER: '*', CIVILSTAND: 'TOT', Tid: q });
  const tot = {},
    old = {};
  for (const r of pop) {
    if (r.ALDER === 'IALT') tot[r.OMRÅDE] = r.value;
    else if (+r.ALDER >= 65) old[r.OMRÅDE] = (old[r.OMRÅDE] || 0) + r.value;
  }
  const ya = await lastTime('ARE207');
  const area = Object.fromEntries((await dst('ARE207', { OMRÅDE: '*', Tid: ya })).map((r) => [r.OMRÅDE, r.value]));
  for (const c in tot) {
    put(c, 'pop', tot[c]);
    if (area[c]) put(c, 'density', r1(tot[c] / area[c]));
    put(c, 'old65', r1((100 * (old[c] || 0)) / tot[c]));
  }
  meta('pop', 'Statistics Denmark (FOLK1A)', q.replace('K', ' Q'));
  meta('density', 'Statistics Denmark (FOLK1A, ARE207)', q.slice(0, 4), '/km²');
  meta('old65', 'Statistics Denmark (FOLK1A)', q.slice(0, 4), ' %');
  // average age
  const yg = await lastTime('GALDER');
  for (const r of await dst('GALDER', { KOMK: '*', KØN: 'TOT', Tid: yg })) put(r.KOMK, 'avgAge', r.value);
  meta('avgAge', 'Statistics Denmark (GALDER)', yg);
  // life expectancy (5-year period)
  const yl = await lastTime('HISBK');
  for (const r of await dst('HISBK', { OMRÅDE: '*', KØN: 'TOT', Tid: yl })) put(r.OMRÅDE, 'life', r.value);
  meta('life', 'Statistics Denmark (HISBK)', yl.replace(':', '–'));
  // average disposable income per person (DKK)
  const yi = await lastTime('INDKP106');
  for (const r of await dst('INDKP106', {
    OMRÅDE: '*',
    ENHED: '118',
    KOEN: 'MOK',
    ALDER1: '00',
    INDKINTB: '000',
    Tid: yi,
  }))
    put(r.OMRÅDE, 'income', Math.round(r.value));
  meta('income', 'Statistics Denmark (INDKP106)', yi, ' kr.');
  // inequality (Gini, equivalised disposable income)
  const yq = await lastTime('IFOR41');
  for (const r of await dst('IFOR41', { ULLIG: '70', KOMMUNEDK: '*', Tid: yq })) put(r.KOMMUNEDK, 'gini', r.value);
  meta('gini', 'Statistics Denmark (IFOR41)', yq);
  // unemployment rate
  const yu = await lastTime('AULP01');
  for (const r of await dst('AULP01', { OMRÅDE: '*', ALDER: 'TOT', KØN: 'TOT', Tid: yu }))
    put(r.OMRÅDE, 'unemp', r.value);
  meta('unemp', 'Statistics Denmark (AULP01)', yu, ' %');
  // higher education (short, medium and long cycle, PhD) among 25–69-year-olds
  const ye = await lastTime('HFUDD11');
  const edu = await dst('HFUDD11', {
    BOPOMR: '*',
    HERKOMST: 'TOT',
    HFUDD: ['TOT', 'H40', 'H50', 'H60', 'H70', 'H80'],
    ALDER: ['25-29', '30-34', '35-39', '40-44', '45-49', '50-54', '55-59', '60-64', '65-69'],
    KØN: 'TOT',
    Tid: ye,
  });
  const et = {},
    eh = {};
  for (const r of edu) {
    if (r.HFUDD === 'TOT') et[r.BOPOMR] = (et[r.BOPOMR] || 0) + r.value;
    else eh[r.BOPOMR] = (eh[r.BOPOMR] || 0) + r.value;
  }
  for (const c in et) put(c, 'higherEdu', r1((100 * (eh[c] || 0)) / et[c]));
  meta('higherEdu', 'Statistics Denmark (HFUDD11)', ye, ' %');
  // immigrants and descendants
  const yc = await lastTime('FOLK1C');
  const anc = await dst('FOLK1C', {
    OMRÅDE: '*',
    KØN: 'TOT',
    ALDER: 'IALT',
    HERKOMST: ['TOT', '4', '3'],
    IELAND: '0000',
    Tid: yc,
  });
  const at = {},
    ai = {};
  for (const r of anc) {
    if (r.HERKOMST === 'TOT') at[r.OMRÅDE] = r.value;
    else ai[r.OMRÅDE] = (ai[r.OMRÅDE] || 0) + r.value;
  }
  for (const c in at) put(c, 'immig', r1((100 * (ai[c] || 0)) / at[c]));
  meta('immig', 'Statistics Denmark (FOLK1C)', yc.slice(0, 4), ' %');
  // reported criminal-code offences per 1,000 inhabitants (last four quarters)
  const info = await dstInfo('STRAF11');
  const qs = info.variables
    .find((v) => v.id === 'Tid')
    .values.slice(-4)
    .map((v) => v.id);
  const crime = {};
  for (const r of await dst('STRAF11', { OMRÅDE: '*', OVERTRÆD: '1', Tid: qs }))
    crime[r.OMRÅDE] = (crime[r.OMRÅDE] || 0) + r.value;
  for (const c in crime) if (tot[c]) put(c, 'crime', r1((1000 * crime[c]) / tot[c]));
  meta('crime', 'Statistics Denmark (STRAF11)', qs[0].replace('K', 'Q') + '–' + qs[3].replace('K', 'Q'), ' / 1,000');
  console.log('Denmark:', Object.keys(out.dk).length, 'municipalities');
}

// ---------- EU, EFTA, Turkey and other NUTS countries: Eurostat ----------
const ES = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data';
// id: [dataset, filter, source label, unit, digits]
const EUROSTAT = {
  life: ['demo_r_mlifexp', 'sex=T&age=Y_LT1', 'demo_r_mlifexp', '', 1],
  gdp: ['nama_10r_2gdp', 'unit=PPS_EU27_2020_HAB', 'nama_10r_2gdp, PPS per inhabitant', ' PPS', 0],
  income: [
    'nama_10r_2hhinc',
    'na_item=B6N&unit=PPS_EU27_2020_HAB&direct=BAL',
    'nama_10r_2hhinc, PPS per inhabitant',
    ' PPS',
    0,
  ],
  unemp: ['lfst_r_lfu3rt', 'sex=T&age=Y15-74&isced11=TOTAL', 'lfst_r_lfu3rt', ' %', 1],
  poverty: ['ilc_peps11n', 'unit=PC', 'ilc_peps11n, at risk of poverty or social exclusion', ' %', 1],
  higherEdu: ['edat_lfse_04', 'sex=T&age=Y25-64&isced11=ED5-8&unit=PC', 'edat_lfse_04, 25–64 years', ' %', 1],
  density: ['demo_r_d3dens', 'unit=PER_KM2', 'demo_r_d3dens', '/km²', 1],
  medianAge: ['demo_r_pjanind3', 'indic_de=MEDAGEPOP', 'demo_r_pjanind3', '', 1],
  old65: ['demo_r_pjanind3', 'indic_de=PC_Y65_MAX', 'demo_r_pjanind3', ' %', 1],
  infant: ['demo_r_minfind', 'unit=RT', 'demo_r_minfind, per 1,000 live births', ' ‰', 1],
};
// latest value per region from a JSON-stat answer
async function esData(ds, filter) {
  const r = await fetch(`${ES}/${ds}?${filter}&sinceTimePeriod=2015&format=JSON&lang=EN`);
  const j = await r.json();
  if (!j.dimension) throw new Error(ds + ': ' + JSON.stringify(j).slice(0, 200));
  const ids = j.id,
    size = j.size;
  const gi = ids.indexOf('geo'),
    ti = ids.indexOf('time');
  const geos = Object.entries(j.dimension.geo.category.index)
    .sort((a, b) => a[1] - b[1])
    .map((e) => e[0]);
  const times = Object.entries(j.dimension.time.category.index)
    .sort((a, b) => a[1] - b[1])
    .map((e) => e[0]);
  const stride = (k) => size.slice(k + 1).reduce((a, b) => a * b, 1);
  const res = {};
  for (const [flat, v] of Object.entries(j.value)) {
    const n = +flat;
    const g = geos[Math.floor(n / stride(gi)) % size[gi]],
      t = times[Math.floor(n / stride(ti)) % size[ti]];
    if (v == null) continue;
    if (!res[g] || res[g].t < t) res[g] = { t, v };
  }
  return res;
}
const fold = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/\(.*?\)/g, ' ')
    .replace(
      /\b(region|province|provincia|provincie|provinz|voivodeship|wojewodztwo|county|lan|maakond|apskritis|novads|zupanija|kraj|okres|departement|regione|comunidad|autonoma|de|del|di|la|le|el|the|of|and|et|y|und|region de|ile|il|ili)\b/g,
      ' ',
    )
    .replace(/[^a-z0-9]+/g, '');
// geometry helpers for the fallback match (a region's inner point inside a NUTS polygon)
const ringsOf = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []);
const inRing = (pt, r) => {
  let a = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i],
      [xj, yj] = r[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) a = !a;
  }
  return a;
};
const inGeo = (pt, g) => ringsOf(g).some((poly) => inRing(pt, poly[0]) && !poly.slice(1).some((h) => inRing(pt, h)));
const areaGeo = (g) =>
  ringsOf(g).reduce((s, poly) => {
    const r = poly[0];
    let a = 0;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] - r[i][0]) * (r[j][1] + r[i][1]);
    const lat = (r[0][1] * Math.PI) / 180;
    return s + Math.abs(a / 2) * Math.cos(lat);
  }, 0);
async function eurostat() {
  const NG = 'assets/geo/source-nuts.geojson';
  if (!fs.existsSync(NG))
    fs.writeFileSync(
      NG,
      Buffer.from(
        await (
          await fetch('https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_20M_2024_4326.geojson')
        ).arrayBuffer(),
      ),
    );
  const shapes = JSON.parse(fs.readFileSync(NG, 'utf8')).features.map((f) => ({
    id: f.properties.NUTS_ID,
    lvl: f.properties.LEVL_CODE,
    cc: f.properties.CNTR_CODE,
    g: f.geometry,
    a: areaGeo(f.geometry),
  }));
  // NUTS regions with their Latin and national names (GISCO)
  const csv = await (
    await fetch('https://gisco-services.ec.europa.eu/distribution/v2/nuts/csv/NUTS_AT_2024.csv')
  ).text();
  const nuts = csv
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((l) => {
      const c = l
        .match(/("([^"]|"")*"|[^,]*)(,|$)/g)
        .map((x) => x.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"'));
      return {
        cc: c[0],
        id: c[1],
        names: [c[2], c[3], ...c[2].split(/[\/–-]/), ...c[3].split(/[\/–-]/)].map(fold).filter((x) => x.length > 2),
      };
    })
    .filter((n) => n.id.length >= 3); // NUTS 1–3
  const data = {};
  for (const [id, [ds, filter, src, unit]] of Object.entries(EUROSTAT)) {
    data[id] = await esData(ds, filter);
    const years = Object.values(data[id])
      .map((x) => x.t)
      .sort();
    meta('es_' + id, 'Eurostat (' + src + ')', years[years.length - 1] || '', unit);
  }
  // match the map's regions (Natural Earth admin-1) to NUTS regions by name, within each country
  const a1 = JSON.parse(fs.readFileSync('assets/geo/admin1.json', 'utf8'));
  const report = [];
  for (const [iso3, c] of Object.entries(a1)) {
    const iso2 = (c.units.find((u) => u.p.iso_3166_2) || { p: {} }).p.iso_3166_2?.slice(0, 2);
    const cc = { GR: 'EL', GB: 'UK' }[iso2] || iso2;
    const cand = nuts.filter((n) => n.cc === cc);
    if (!cand.length) continue;
    let hit = 0;
    const res = {};
    for (const u of c.units) {
      const p = u.p;
      const names = [p.name, p.name_en, p.name_de, p.name_fr, p.name_es, p.name_it, p.name_nl, p.name_sv]
        .map(fold)
        .filter((x) => x.length > 2);
      // exact name first (deepest level wins), then one name containing the other
      const exact = cand
        .filter((n) => n.names.some((x) => names.includes(x)))
        .sort((a, b) => b.id.length - a.id.length)[0];
      const loose =
        exact ||
        cand
          .filter((n) =>
            n.names.some((x) => names.some((y) => (x.length > 4 && y.includes(x)) || (y.length > 4 && x.includes(y)))),
          )
          .sort((a, b) => b.id.length - a.id.length)[0];
      let m = loose;
      if (!m && u.c) {
        // by place: the NUTS region (any level) around the region's inner point that is closest in size
        const a = areaGeo(u.g);
        m = shapes
          .filter((n) => n.cc === cc && n.lvl >= 1 && inGeo(u.c, n.g))
          .sort((x, y) => Math.abs(Math.log(x.a / a)) - Math.abs(Math.log(y.a / a)))[0];
      }
      if (!m) continue;
      hit++;
      const v = {};
      for (const id of Object.keys(EUROSTAT)) {
        // the region's own value, else its parent NUTS region's
        for (let code = m.id; code.length >= 3; code = code.slice(0, -1)) {
          const x = data[id][code];
          if (x) {
            v['es_' + id] = +x.v.toFixed(EUROSTAT[id][4]);
            break;
          }
        }
      }
      if (Object.keys(v).length) res[p.adm1_code] = v;
    }
    if (Object.keys(res).length) out.adm1[iso3] = Object.assign(out.adm1[iso3] || {}, res);
    report.push(`${iso3} ${hit}/${c.units.length}`);
  }
  console.log('Eurostat matches:', report.join(', '));
}

// ---------- USA, states: County Health Rankings (via Data USA), ACS (via Data USA), CDC/NCHS ----------
const DUSA = 'https://api.datausa.io/tesseract/data.jsonrecords';
// id: [measure, scale, unit, digits]
const CHR = {
  us_obesity: ['Adult Obesity', 100, ' %', 1],
  us_smoking: ['Adult Smoking', 100, ' %', 1],
  us_diabetes: ['Diabetes Prevalence', 100, ' %', 1],
  us_inactive: ['Physical Inactivity', 100, ' %', 1],
  us_foodInsecure: ['Food Insecurity', 100, ' %', 1],
  us_income: ['Median Household Income', 1, ' $', 0],
  us_unemp: ['Unemployment', 100, ' %', 1],
  us_uninsured: ['Uninsured', 100, ' %', 1],
  us_childPoverty: ['Children In Poverty', 100, ' %', 1],
  us_crime: ['Violent Crime', 1, ' / 100,000', 0],
  us_overdose: ['Drug Overdose Deaths', 1, ' / 100,000', 1],
  us_someCollege: ['Some College', 100, ' %', 1],
};
async function usa() {
  const a1 = JSON.parse(fs.readFileSync('assets/geo/admin1.json', 'utf8')).USA.units;
  const byName = Object.fromEntries(a1.map((u) => [u.p.name_en || u.p.name, u.p.adm1_code]));
  const res = {};
  const put = (state, id, v) => {
    const c = byName[state];
    if (c && Number.isFinite(v)) (res[c] = res[c] || {})[id] = v;
  };
  for (const [id, [m, scale, unit, dig]] of Object.entries(CHR)) {
    const j = await (
      await fetch(
        `${DUSA}?cube=county_health_ranking&drilldowns=State,Year&measures=${encodeURIComponent(m)}&limit=5000`,
      )
    ).json();
    const last = {};
    for (const r of j.data) if (r[m] != null && (!last[r.State] || last[r.State].Year < r.Year)) last[r.State] = r;
    let y = 0;
    for (const r of Object.values(last)) {
      put(r.State, id, +(r[m] * scale).toFixed(dig));
      y = Math.max(y, r.Year);
    }
    meta(id, 'County Health Rankings & Roadmaps (via Data USA)', y, unit);
  }
  // median age (ACS 1-year)
  {
    const j = await (
      await fetch(`${DUSA}?cube=acs_ygs_median_age_total_1&drilldowns=State,Year&measures=Median+Age&limit=5000`)
    ).json();
    const last = {};
    for (const r of j.data)
      if (!r.Gender && r['Median Age'] != null && (!last[r.State] || last[r.State].Year < r.Year)) last[r.State] = r;
    let y = 0;
    for (const r of Object.values(last)) {
      put(r.State, 'us_medianAge', +r['Median Age'].toFixed(1));
      y = Math.max(y, r.Year);
    }
    meta('us_medianAge', 'US Census Bureau ACS (via Data USA)', y);
  }
  // life expectancy (CDC/NCHS state life tables)
  {
    const j = await (await fetch('https://data.cdc.gov/resource/it4f-frdc.json?$limit=500')).json();
    for (const r of j) if (/total/i.test(r.sex)) put(r.area || r.state, 'us_life', +(r.leb || r.le));
    meta('us_life', 'CDC / NCHS U.S. State Life Tables', 2021);
  }
  out.adm1.USA = res;
  console.log('USA:', Object.keys(res).length, 'states');
}

await denmark();
await eurostat();
await usa();
fs.writeFileSync(OUT, JSON.stringify(out));
console.log('wrote', OUT);

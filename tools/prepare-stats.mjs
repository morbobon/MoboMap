// Downloads country statistics from Our World in Data (CC BY 4.0) and writes assets/geo/world-stats.json:
//   { meta: { <id>: { year, source, slug } }, values: { <ISO3>: { <id>: number } } }
// Each indicator keeps every country's latest value (≥ MIN_YEAR). Run: npm run stats
import fs from 'fs';

const MIN_YEAR = 2015;
const THIS_YEAR = new Date().getFullYear();
// id: [OWID grapher slug, source shown in the legend, options]
const INDICATORS = {
  conflict: [
    'deaths-in-armed-conflicts-by-country',
    'UCDP via Our World in Data',
    { completeYearsOnly: true, defaultZero: true },
  ],
  regime: ['political-regime', 'V-Dem / Regimes of the World via Our World in Data'],
  poverty: ['share-of-population-in-extreme-poverty', 'World Bank PIP via Our World in Data'],
  hunger: ['prevalence-of-undernourishment', 'FAO via Our World in Data'],
  obesity: ['share-of-adults-defined-as-obese', 'WHO via Our World in Data'],
  life: ['life-expectancy', 'UN WPP via Our World in Data'],
  hdi: ['human-development-index', 'UNDP via Our World in Data'],
  fertility: ['children-per-woman-un', 'UN WPP via Our World in Data'],
  medianAge: ['median-age', 'UN WPP via Our World in Data'],
  internet: ['share-of-individuals-using-the-internet', 'ITU / World Bank via Our World in Data'],
  electricity: ['share-of-the-population-with-access-to-electricity', 'World Bank via Our World in Data'],
  co2: ['co-emissions-per-capita', 'Global Carbon Project via Our World in Data'],
  renewables: ['share-electricity-renewables', 'Ember / Energy Institute via Our World in Data'],
};
// Natural Earth ADM0_A3 -> OWID code where they differ
const NE_TO_OWID = { SDS: 'SSD', PSX: 'PSE', SAH: 'ESH', KOS: 'OWID_KOS' };
const OWID_TO_NE = Object.fromEntries(Object.entries(NE_TO_OWID).map(([a, b]) => [b, a]));

// Minimal CSV parser (quoted fields may contain commas)
function parseCSV(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line) continue;
    const out = [];
    let cur = '',
      q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') q = false;
        else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') {
        out.push(cur);
        cur = '';
      } else cur += ch;
    }
    out.push(cur);
    rows.push(out);
  }
  return rows;
}

const neCodes = new Set(
  JSON.parse(fs.readFileSync('assets/geo/w_detail.json', 'utf8')).features.map((f) => f.properties.ADM0_A3),
);
const values = {};
const meta = {};
for (const [id, [slug, source, opt = {}]] of Object.entries(INDICATORS)) {
  const url = `https://ourworldindata.org/grapher/${slug}.csv?v=1&csvType=full&useColumnShortNames=true`;
  const res = await fetch(url, { headers: { 'User-Agent': 'MoboMap-data-prep' } });
  if (!res.ok) throw new Error(`${slug}: HTTP ${res.status}`);
  const rows = parseCSV(await res.text());
  // first value column (estimates, not projections); skip incomplete current year where asked
  const latest = {};
  let maxYear = 0;
  for (const r of rows.slice(1)) maxYear = Math.max(maxYear, +r[2] || 0);
  const lastYear = opt.completeYearsOnly && maxYear >= THIS_YEAR ? THIS_YEAR - 1 : Infinity;
  for (const r of rows.slice(1)) {
    const code = OWID_TO_NE[r[1]] || r[1];
    const year = +r[2],
      v = r[3];
    if (!neCodes.has(code) || v === '' || isNaN(+v) || year < MIN_YEAR || year > lastYear) continue;
    if (!latest[code] || latest[code].year < year) latest[code] = { year, v: +v };
  }
  const years = Object.values(latest).map((x) => x.year);
  const mode = years.sort((a, b) => years.filter((y) => y === b).length - years.filter((y) => y === a).length)[0];
  for (const [code, { v }] of Object.entries(latest)) (values[code] ??= {})[id] = Math.round(v * 1000) / 1000;
  if (opt.defaultZero) for (const code of neCodes) if (values[code]?.[id] == null) (values[code] ??= {})[id] = 0;
  meta[id] = { year: mode, source, slug };
  console.log(id.padEnd(12), String(Object.keys(latest).length).padStart(3), 'countries, mostly', mode);
}
fs.writeFileSync(
  'assets/geo/world-stats.json',
  JSON.stringify({ license: 'CC BY 4.0 – Our World in Data and original sources', meta, values }),
);
console.log('assets/geo/world-stats.json', (fs.statSync('assets/geo/world-stats.json').size / 1024).toFixed(0) + ' KB');

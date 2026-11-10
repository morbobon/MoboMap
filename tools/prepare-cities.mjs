// Cities by population for the Display → Cities slider: GeoNames "cities5000" (every place with 5,000 or more
// people; CC BY 4.0, geonames.org). Kept: 50,000+ worldwide and 5,000+ in Denmark.
// Source (gitignored): assets/geo/source-cities5000.zip – downloaded if missing.
// Output: assets/geo/cities.json  { ISO3: [[name, lon, lat, population, capital 0/1], …] }, biggest first
import fs from 'fs';
import zlib from 'zlib';

const g = 'assets/geo/';
const SRC = g + 'source-cities5000.zip';
const URL = 'https://download.geonames.org/export/dump/cities5000.zip';
const WORLD_MIN = 50000,
  LOCAL_MIN = { DNK: 5000 };
if (!fs.existsSync(SRC)) {
  console.log('downloading', URL);
  const r = await fetch(URL);
  if (!r.ok) throw new Error('download failed: ' + r.status);
  fs.writeFileSync(SRC, Buffer.from(await r.arrayBuffer()));
}

// the zip's one file: found through the central directory (sizes in the local header can be 0)
function unzipOne(buf) {
  let e = buf.length - 22;
  while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  if (e < 0) throw new Error('not a zip file');
  const cd = buf.readUInt32LE(e + 16);
  if (buf.readUInt32LE(cd) !== 0x02014b50) throw new Error('bad central directory');
  const method = buf.readUInt16LE(cd + 10),
    size = buf.readUInt32LE(cd + 20),
    local = buf.readUInt32LE(cd + 42);
  const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
  const data = buf.subarray(start, start + size);
  return method === 8 ? zlib.inflateRawSync(data) : data;
}
const text = unzipOne(fs.readFileSync(SRC)).toString('utf8');

// GeoNames uses two-letter ISO codes, the map Natural Earth's three-letter ones (ISO_A2_EH fixes France,
// Norway … whose ISO_A2 is -99); populated places add small territories (Hong Kong, Singapore …)
const iso3 = {};
for (const f of JSON.parse(fs.readFileSync(g + 'source-places.geojson', 'utf8')).features) {
  const p = f.properties;
  if (p.iso_a2 && p.iso_a2 !== '-99') iso3[p.iso_a2] = p.adm0_a3;
}
for (const f of JSON.parse(fs.readFileSync(g + 'source-world.geojson', 'utf8')).features) {
  const p = f.properties;
  if (p.ISO_A2_EH && p.ISO_A2_EH !== '-99') iso3[p.ISO_A2_EH] = p.ADM0_A3;
}

// populated places only: no city districts (PPLX), historical, abandoned or destroyed places
const SKIP = new Set(['PPLX', 'PPLH', 'PPLQ', 'PPLW', 'PPLCH']);
const out = {};
let kept = 0,
  noCountry = new Set();
for (const line of text.split('\n')) {
  const f = line.split('\t');
  if (f.length < 15) continue;
  const [, name, , , lat, lon, cls, code, cc] = f;
  const pop = +f[14];
  if (cls !== 'P' || SKIP.has(code)) continue;
  const c = iso3[cc];
  if (!c) {
    noCountry.add(cc);
    continue;
  }
  if (pop < (LOCAL_MIN[c] ?? WORLD_MIN)) continue;
  // GeoNames lists some places twice: the same name close by is the same place
  if ((out[c] || []).some((o) => o[0] === name && Math.abs(o[1] - lon) < 0.1 && Math.abs(o[2] - lat) < 0.1)) continue;
  (out[c] ||= []).push([name, +(+lon).toFixed(3), +(+lat).toFixed(3), pop, code === 'PPLC' ? 1 : 0]);
  kept++;
}
for (const arr of Object.values(out)) arr.sort((a, b) => b[3] - a[3]);
fs.writeFileSync(g + 'cities.json', JSON.stringify(out));
console.log(
  'cities:',
  kept,
  'in',
  Object.keys(out).length,
  'countries; Denmark',
  (out.DNK || []).length,
  '·',
  (fs.statSync(g + 'cities.json').size / 1024).toFixed(0) + ' KB',
);
if (noCountry.size) console.log('no country for:', [...noCountry].join(' '));

// Prepares admin-1 units (states/regions/provinces) for all countries from Natural Earth 10m.
// Source (40 MB, gitignored): assets/geo/source-admin1.geojson – downloaded automatically if missing.
// Output: assets/geo/admin1.json  { ISO3: { units:[...geojson features], land:geometry, rlines:geometry } }
import mapshaper from 'mapshaper';
import fs from 'fs';

const SRC = 'assets/geo/source-admin1.geojson';
const URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson';
if (!fs.existsSync(SRC)) {
  console.log('downloading', URL);
  const r = await fetch(URL);
  fs.writeFileSync(SRC, Buffer.from(await r.arrayBuffer()));
}

const fields =
  'adm1_code,adm0_a3,name,name_en,name_de,name_fr,name_es,name_sv,name_nl,name_it,region,type_en,iso_3166_2';
// Global pass: simplify (interval in metres for unprojected data), keep shapes, drop tiny islands
const simp = await mapshaper.applyCommands(
  `-i in.json -filter-fields ${fields} -simplify dp interval=3500 keep-shapes -filter-islands min-area=25km2 remove-empty -clean -o out.json format=geojson precision=0.002`,
  { 'in.json': fs.readFileSync(SRC, 'utf8') },
);
const all = JSON.parse(simp['out.json']);
console.log('admin-1 units:', all.features.length);

const by = {};
for (const f of all.features) (by[f.properties.adm0_a3] = by[f.properties.adm0_a3] || []).push(f);

const out = {};
for (const [iso, feats] of Object.entries(by)) {
  if (iso === 'DNK') continue; // Denmark uses its municipalities (DAGI) instead
  const fc = JSON.stringify({ type: 'FeatureCollection', features: feats });
  const regions = new Set(feats.map((f) => f.properties.region).filter(Boolean));
  const useRegion = regions.size >= 2 && regions.size < feats.length;
  for (const f of feats) f.properties.grp = useRegion ? f.properties.region || f.properties.name : null;
  const fc2 = JSON.stringify({ type: 'FeatureCollection', features: feats });
  const land = JSON.parse(
    (
      await mapshaper.applyCommands(`-i in.json -dissolve2 -o out.json format=geojson precision=0.002`, {
        'in.json': fc,
      })
    )['out.json'],
  );
  let rl = null;
  if (useRegion)
    rl = JSON.parse(
      (
        await mapshaper.applyCommands(
          `-i in.json -dissolve2 grp -innerlines -o out.json format=geojson precision=0.002`,
          { 'in.json': fc2 },
        )
      )['out.json'],
    );
  const pts = JSON.parse(
    (
      await mapshaper.applyCommands(`-i in.json -points inner -o out.json format=geojson precision=0.002`, {
        'in.json': fc2,
      })
    )['out.json'],
  );
  const ptBy = Object.fromEntries(pts.features.map((p) => [p.properties.adm1_code, p.geometry.coordinates]));
  out[iso] = {
    units: feats.map((f) => ({ p: f.properties, g: f.geometry, c: ptBy[f.properties.adm1_code] })),
    land: (land.geometries || land.features.map((x) => x.geometry))[0],
    rlines: rl ? rl.geometries || rl.features.map((x) => x.geometry) : [],
  };
}
fs.writeFileSync('assets/geo/admin1.json', JSON.stringify(out));
console.log(
  'lande:',
  Object.keys(out).length,
  'size:',
  (fs.statSync('assets/geo/admin1.json').size / 1024).toFixed(0) + ' KB',
);

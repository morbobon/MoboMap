// Middle detail level for the world map, shown when zoomed in: country outlines from the admin-1 data
// (Natural Earth 10m, simplified, already in admin1.json), between the 1:110m world and a country map.
// The app takes the outlines themselves from admin1.json; this writes what it does not have:
//   wland_mid.json         all countries dissolved (the land outline)
//   wregionlines_mid.json  borders between continents
//   wextra_mid.json        rings for world units admin-1 lacks (Denmark: its municipalities) and for
//                          admin-1 territories the 110m world counts as part of a country (Åland, Hong Kong …)
// Run after prepare-geo.mjs and prepare-admin1.mjs.
import mapshaper from 'mapshaper';
import fs from 'fs';

const g = 'assets/geo/';
const read = (f) => JSON.parse(fs.readFileSync(g + f, 'utf8'));
const run = async (cmd, input) => JSON.parse((await mapshaper.applyCommands(cmd, { 'in.json': input }))['out.json']);
const geomsOf = (j) => j.geometries || j.features.map((f) => f.geometry);

const adm1 = read('admin1.json');
const world = read('w_detail.json');
const cont = Object.fromEntries(world.features.map((f) => [f.properties.ADM0_A3, f.properties.CONTINENT]));

// point in a (Multi)Polygon, even-odd over all rings
function inside([x, y], geom) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  let n = false;
  for (const p of polys)
    for (const r of p)
      for (let i = 0, j = r.length - 1; i < r.length; j = i++)
        if (r[i][1] > y !== r[j][1] > y && x < ((r[j][0] - r[i][0]) * (y - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0])
          n = !n;
  return n;
}

// admin-1 territories without a world unit join the world country they lie in (else they stay out, as in 110m);
// JOIN for those just outside the coarse 110m outline
const JOIN = { ALD: 'FIN', USG: 'CUB' };
const extra = {};
for (const [iso, c] of Object.entries(adm1)) {
  if (iso in cont) continue;
  const pt = c.units.find((u) => u.c)?.c;
  const host = JOIN[iso] || (pt && world.features.find((f) => inside(pt, f.geometry))?.properties.ADM0_A3);
  if (host) (extra[host] ||= []).push(c.land);
}

// Denmark: municipalities dissolved and taken from UTM 32N to degrees
const dk = await run(
  `-i in.json -dissolve2 -proj wgs84 init=EPSG:25832 -o out.json format=geojson precision=0.002`,
  fs.readFileSync(g + 'k_simple.json', 'utf8'),
);
extra.DNK = geomsOf(dk);

const feats = [];
for (const iso of Object.keys(cont)) {
  const gs = [...(adm1[iso] ? [adm1[iso].land] : []), ...(extra[iso] || [])];
  for (const geometry of gs) feats.push({ type: 'Feature', properties: { c: iso, k: cont[iso] }, geometry });
}
const fc = JSON.stringify({ type: 'FeatureCollection', features: feats });
const land = await run(`-i in.json -dissolve2 -o out.json format=geojson precision=0.002`, fc);
const rl = await run(`-i in.json -dissolve2 k -innerlines -o out.json format=geojson precision=0.002`, fc);

const out = {
  wland_mid: { type: 'GeometryCollection', geometries: geomsOf(land) },
  wregionlines_mid: { type: 'GeometryCollection', geometries: geomsOf(rl) },
  wextra_mid: extra,
};
for (const [f, v] of Object.entries(out)) {
  fs.writeFileSync(g + f + '.json', JSON.stringify(v));
  console.log(f, (fs.statSync(g + f + '.json').size / 1024).toFixed(0) + ' KB');
}
console.log(
  'joined:',
  Object.entries(extra)
    .map(([k, v]) => k + '+' + v.length)
    .join(' '),
);

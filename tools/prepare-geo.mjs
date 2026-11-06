// Forenkler kommunegrænser (kilde: DAGI via github.com/magnuslarsen/geoJSON-Danish-municipalities)
// Output: assets/geo/*.json i UTM32 (EPSG:25832), meter.
import mapshaper from 'mapshaper';
const g = 'assets/geo/';
const fix = `label_dk = label_dk == 'Århus' ? 'Aarhus' : label_dk == 'Brønderslev-Dronninglund' ? 'Brønderslev' : label_dk`;
for (const [lvl, pct, minArea] of [['detail', '35%', '0.3km2'], ['simple', '4%', '5km2']]) {
  await mapshaper.runCommands(`-i ${g}source-municipalities.geojson -filter "label_dk != 'Christiansø'" -each "${fix}" -dissolve2 lau_1 copy-fields=label_dk,iso_3166_2 -proj EPSG:25832 -simplify ${pct} keep-shapes -filter-islands min-area=${minArea} remove-empty -clean -o ${g}k_${lvl}.json format=geojson precision=10`);
  await mapshaper.runCommands(`-i ${g}k_${lvl}.json -filter "lau_1 != '400'" -dissolve2 -o ${g}land_${lvl}.json format=geojson precision=10`);
  await mapshaper.runCommands(`-i ${g}k_${lvl}.json -innerlines -o ${g}inner_${lvl}.json format=geojson precision=10`);
  await mapshaper.runCommands(`-i ${g}k_${lvl}.json -dissolve2 iso_3166_2 -innerlines -o ${g}regionlines_${lvl}.json format=geojson precision=10`);
}
await mapshaper.runCommands(`-i ${g}k_detail.json -points inner -o ${g}points.json format=geojson precision=10`);

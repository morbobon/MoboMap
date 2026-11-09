// Terrain relief from ETOPO1 elevation contours (DATA.elev, see tools/prepare-elevation.mjs).
// Bands are nested areas "at or above" a level (land) or "deeper than" a level (sea), drawn in order.
const ELEV_RINGS = [];
function elevRings(i) {
  if (!ELEV_RINGS[i]) {
    ELEV_RINGS[i] = decRings(DATA.elev.bands[i]).map((r) => ({ r, b: bboxR([r]) }));
  }
  return ELEV_RINGS[i];
}
// Visible window in app coordinates (x = lon+180, y = 90-lat); the whole globe in the world view.
function reliefWindow() {
  if (S.map === 'world' && !S.focus) return null;
  const b = S.map === 'dk' ? [188, 32.2, 195.2, 35.5] : GEO.main;
  const m = Math.max(4, (b[2] - b[0]) * 0.6, (b[3] - b[1]) * 0.6);
  return [b[0] - m, b[1] - m, b[2] + m, b[3] + m];
}
function reliefPath(i) {
  const key = 'elev' + i + '|' + S.focus;
  if (cache[key] != null) return cache[key];
  const win = reliefWindow();
  let d = '';
  for (const { r, b } of elevRings(i)) {
    if (win && (b[2] < win[0] || b[0] > win[2] || b[3] < win[1] || b[1] > win[3])) continue;
    for (let j = 0; j < r.length; j += 2) {
      // long segments (e.g. along the map edge) are densified so they follow the projection's curve
      const n = j ? Math.min(40, Math.ceil(Math.hypot(r[j] - r[j - 2], r[j + 1] - r[j - 1]) / 2)) : 1;
      for (let s = n - 1; s >= 0; s--) {
        const f = s / n;
        const [x, y] = worldPt(r[j] - (r[j] - (r[j - 2] ?? 0)) * f, r[j + 1] - (r[j + 1] - (r[j - 1] ?? 0)) * f);
        d += (j || s < n - 1 ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
      }
    }
    d += 'Z';
  }
  return (cache[key] = d);
}
// Hypsometric tints for the topographic style (land) and depth tints (sea)
const HYPSO = {
  100: '#c9dca0',
  200: '#dfe2a4',
  500: '#e6d595',
  1000: '#d9b97f',
  1500: '#c79f6c',
  2000: '#b0875e',
  3000: '#9c7c6a',
  4000: '#c8bdb5',
  5000: '#f3f0ec',
};
function reliefOn(sp) {
  // a statistic ("Colour by") takes over the land colours of the topographic style; the relief checkbox still adds it
  const byStat = typeof attrDef === 'function' && attrDef();
  return !!DATA.elev && ((sp.relief && !byStat) || sp.reliefShade || document.getElementById('relief').checked);
}
// Sea depths: drawn under the land.
function reliefSea(sp, bg, dark) {
  let out = '<g pointer-events="none">';
  DATA.elev.levels.forEach((lv, i) => {
    if (lv >= 0) return;
    const d = reliefPath(i);
    if (!d) return;
    const fill = sp.relief ? mix(bg, '#4f86b0', lv <= -2000 ? 0.38 : 0.2) : dark ? '#000000' : '#0a2540';
    out += `<path d="${d}" fill="${fill}" fill-opacity="${sp.relief ? 1 : dark ? 0.18 : 0.06}" fill-rule="evenodd"/>`;
  });
  return out + '</g>';
}
// Land elevation: clipped to the land, with the unit borders drawn again on top.
function reliefLand(sp, allPath, borders, strokeCol, sw, land) {
  // shade with black on light land, with white on dark land
  const shade = String(land).startsWith('#') && !light(land) ? '#ffffff' : '#000000';
  let out = `<clipPath id="reliefclip"><path d="${allPath}"/></clipPath><g clip-path="url(#reliefclip)" pointer-events="none">`;
  const lineCol = sp.relief ? '#6b5440' : shade;
  DATA.elev.levels.forEach((lv, i) => {
    if (lv < 0) return;
    const d = reliefPath(i);
    if (!d) return;
    const fill = sp.relief
      ? `fill="${HYPSO[lv] || '#ffffff'}" fill-opacity=".92"`
      : `fill="${shade}" fill-opacity="0.07"`;
    out += `<path d="${d}" ${fill} fill-rule="evenodd" stroke="${lineCol}" stroke-opacity="${sp.relief ? 0.35 : 0.12}" stroke-width=".5"/>`;
  });
  out += '</g>';
  if (borders)
    out += `<path d="${borders}" fill="none" stroke="${strokeCol}" stroke-width="${sw}" stroke-linejoin="round" pointer-events="none"/>`;
  return out;
}
// Legend rows for the topographic style
function reliefLegend(sp) {
  if (!sp.relief) return [];
  const lv = [0, 100, 500, 1000, 2000, 4000];
  const items = [{ head: true, label: t('elevation') }];
  lv.forEach((v, i) =>
    items.push({
      sw: v ? HYPSO[v] : sp.land,
      stroke: '#6b5440',
      sw2: 0.4,
      label: lv[i + 1] ? `${v}–${lv[i + 1]} m` : `> ${v} m`,
    }),
  );
  items.push({ src: true, label: t('elev_source') });
  return items;
}

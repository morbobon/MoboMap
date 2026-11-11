function pixelCells(det, colorOf) {
  const cell = Math.max(6, Math.round(Math.min(W, H) / 80)),
    gap = Math.max(1, cell * 0.14);
  const key = 'pix|' + det + '|' + cell + '|' + (S.focusHide ? S.focus : '');
  if (!cache[key]) {
    const cv = document.createElement('canvas');
    cv.width = 2;
    cv.height = 2;
    const ctx = cv.getContext('2d');
    const units = GEO.units
      .filter((k) => !(S.focusHide && !inFocus(k)))
      .map((k) => {
        const p = new Path2D(kp(k, det));
        const cs = [
          P(k.b[0], k.b[1], insOf(k)),
          P(k.b[2], k.b[3], insOf(k)),
          P(k.b[0], k.b[3], insOf(k)),
          P(k.b[2], k.b[1], insOf(k)),
        ];
        return {
          k,
          p,
          b: [
            Math.min(...cs.map((c) => c[0])) - cell,
            Math.min(...cs.map((c) => c[1])) - cell,
            Math.max(...cs.map((c) => c[0])) + cell,
            Math.max(...cs.map((c) => c[1])) + cell,
          ],
        };
      });
    const cells = [];
    // the world repeated: the cells of the one turn that is drawn (its copies follow), a unit's box in any copy
    const xa = REP && REP.tile ? REP.e0 : 0,
      xb = REP && REP.tile ? REP.e1 : W;
    for (let y = cell / 2; y < H - FOOT; y += cell)
      for (let x = xa + cell / 2; x < xb; x += cell) {
        for (const u of units) {
          const ux = REP ? x - Math.floor((x - u.b[0]) / REP.per) * REP.per : x;
          if (ux < u.b[0] || ux > u.b[2] || y < u.b[1] || y > u.b[3]) continue;
          if (ctx.isPointInPath(u.p, x, y, 'evenodd')) {
            cells.push([x, y, u.k]);
            break;
          }
        }
      }
    cache[key] = cells;
  }
  const byCol = {};
  for (const [x, y, k] of cache[key]) {
    const c = colorOf(k);
    (byCol[c] = byCol[c] || []).push(
      `M${(x - cell / 2 + gap / 2).toFixed(1)} ${(y - cell / 2 + gap / 2).toFixed(1)}h${(cell - gap).toFixed(1)}v${(cell - gap).toFixed(1)}h${(gap - cell).toFixed(1)}z`,
    );
  }
  return Object.entries(byCol)
    .map(([c, d]) => `<path d="${d.join('')}" fill="${c}"/>`)
    .join('');
}

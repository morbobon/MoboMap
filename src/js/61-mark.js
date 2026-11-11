// The MoboMap mark: "© MoboMap" as plain line work, with no text and no fonts. render() (60-render.js) draws it in
// several places of every map that is not made with a licensed brand profile (licensed, 20-design-systems.js),
// and the exports look for it again before they make a picture (80-export.js).
//
// markLine gives the path data of the words once, with their middle at x, y:
//   s     size (1 = capitals 10 units tall, the words about 83 wide)
//   deg   the angle they are turned
//   rnd   a random source (fxRng): which stroke comes first and where each round starts differ from map to map
//   back  every stroke is followed back to where it began, so the data encloses no area and can be put at the end
//         of a filled outline without changing its fill
const markLine = (() => {
  // strokes on a baseline at y = 0: a row of points [x, y, …], or a round [cx, cy, r] with an optional arc [from, to]
  const strokes = [];
  let x = 0;
  const put = (adv, ...ss) => {
    for (const s of ss)
      strokes.push(s.length === 3 || s.length === 5 ? [s[0] + x, ...s.slice(1)] : s.map((v, i) => (i % 2 ? v : v + x)));
    x += adv;
  };
  const M = [0, 0, 0, -10, 4.5, -3, 9, -10, 9, 0],
    o = [3.2, -3.2, 3.2];
  put(18, [5.5, -5, 5.5], [5.5, -5, 2.6, 40, 320]); // ©, and the space after it
  put(12, M);
  put(8.6, o);
  put(8.6, [0, -10.5, 0, 0], o); // b
  put(8.6, o);
  put(12, M);
  put(9, o, [6.4, -6.4, 6.4, 0]); // a
  put(6.4, [0, -6.4, 0, 3.6], o); // p
  const mid = x / 2;
  return (x0, y0, s, deg, rnd, back) => {
    const a = (deg * Math.PI) / 180,
      ca = Math.cos(a) * s,
      sa = Math.sin(a) * s,
      nd = s < 1 ? 2 : 1,
      pt = (px, py) =>
        (x0 + (px - mid) * ca - (py + 4) * sa).toFixed(nd) + ' ' + (y0 + (px - mid) * sa + (py + 4) * ca).toFixed(nd),
      r = (v) => (v * s).toFixed(nd),
      on = (cx, cy, rad, t) => pt(cx + rad * Math.cos((t * Math.PI) / 180), cy + rad * Math.sin((t * Math.PI) / 180));
    const order = strokes.map((st) => [rnd(), st]).sort((p, q) => p[0] - q[0]);
    let d = '';
    for (const [, st] of order) {
      if (st.length === 3) {
        // a full round, as two halves from a random start
        const [cx, cy, rad] = st,
          t = rnd() * 360,
          p0 = on(cx, cy, rad, t),
          p1 = on(cx, cy, rad, t + 180),
          arc = (f, p) => `A${r(rad)} ${r(rad)} 0 1 ${f} ${p}`;
        d += `M${p0}${arc(1, p1)}${arc(1, p0)}` + (back ? arc(0, p1) + arc(0, p0) : '');
      } else if (st.length === 5) {
        const [cx, cy, rad, t0, t1] = st,
          big = t1 - t0 > 180 ? 1 : 0,
          p0 = on(cx, cy, rad, t0),
          p1 = on(cx, cy, rad, t1);
        d += `M${p0}A${r(rad)} ${r(rad)} 0 ${big} 1 ${p1}` + (back ? `A${r(rad)} ${r(rad)} 0 ${big} 0 ${p0}` : '');
      } else {
        const ps = [];
        for (let i = 0; i < st.length; i += 2) ps.push(pt(st[i], st[i + 1]));
        d += 'M' + ps.join('L') + (back ? 'L' + ps.slice(0, -1).reverse().join('L') : '');
      }
    }
    return d;
  };
})();
// What the last drawing of the page put in: render() notes every piece, and the exports ask whether all of them are
// still in the page as they were drawn. A piece is { d, o, w, c, own }: its path data, its stroke opacity and width,
// its colour c, and own = false when the data is the end of an outline of the map instead of an element of its own.
const marked = (() => {
  let pieces = [];
  const shown = (e, live) => {
    for (const a of ['style', 'display', 'visibility', 'opacity', 'transform', 'clip-path', 'mask', 'filter'])
      if (e.hasAttribute(a)) return false;
    if (!live) return true;
    const cs = getComputedStyle(e);
    return cs.display !== 'none' && cs.visibility === 'visible' && +cs.opacity === 1 && cs.strokeOpacity !== '0';
  };
  return Object.freeze({
    note: (list) => (pieces = list.map((p) => Object.freeze(Object.assign({}, p)))),
    list: () => pieces.slice(),
    // root: the page's <svg>, or a copy of it (live = false: a copy has no computed styles)
    ok(root, live) {
      if (licensed(DS[S.ds])) return true;
      if (pieces.length < 3) return false;
      const paths = [...root.querySelectorAll('path')],
        byD = new Map(paths.map((e) => [e.getAttribute('d'), e]));
      for (const p of pieces) {
        const e = p.own ? byD.get(p.d) : paths.find((q) => (q.getAttribute('d') || '').includes(p.d));
        if (!e || !shown(e, live)) return false;
        if (!p.own) continue;
        if (!(+e.getAttribute('stroke-opacity') >= p.o) || !(+e.getAttribute('stroke-width') >= p.w)) return false;
        if (e.getAttribute('stroke') !== p.c) return false;
      }
      return true;
    },
  });
})();

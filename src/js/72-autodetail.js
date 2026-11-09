// Auto-detail zoom (on by default, Map tab): zooming in until one country fills more than half of the page
// opens that country's regions; zooming out until the current map (a focus, a country) is shrunk to less than
// a quarter of its full-page size (k < 0.5) steps up a level (focus -> whole map -> world). The view stays put across the switch, and each
// map remembers its highlight selections and statistic, so stepping back restores them.
const AUTO_IN = 0.5,
  AUTO_OUT = 0.25;
const autoDetailOn = () => localStorage.getItem('mobomap.autodetail') !== '0';
function setAutoDetail(on) {
  localStorage.setItem('mobomap.autodetail', on ? '1' : '0');
}
let AUTO_COOL = 0; // no second switch within the same wheel gesture
// screen rectangle of a data-coordinate box (x = lon+180, y = 90-lat), edge midpoints included for curved projections
function rectOfData(b) {
  const xs = [],
    ys = [];
  for (const fx of [0, 0.5, 1])
    for (const fy of [0, 0.5, 1]) {
      if (fx === 0.5 && fy === 0.5) continue;
      const [x, y] = P(b[0] + (b[2] - b[0]) * fx, b[1] + (b[3] - b[1]) * fy);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      xs.push(x);
      ys.push(y);
    }
  if (!xs.length) return null;
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
// screen rectangle of the current map's own extent (the box it is fitted to, incl. zoom)
const rectOfMain = () => [M[0] * sc + ox, M[1] * sc + oy, M[2] * sc + ox, M[3] * sc + oy];
const areaOf = (r) => Math.max(0, r[2] - r[0]) * Math.max(0, r[3] - r[1]);
const pageArea = () => W * (H - FOOT);
function clipped(r) {
  return [Math.max(0, r[0]), Math.max(0, r[1]), Math.min(W, r[2]), Math.min(H - FOOT, r[3])];
}
// a country's main cluster: its largest ring plus the rings near it (no far-away territories)
const MAINB = {};
function mainBox(u) {
  if (MAINB[u.c]) return MAINB[u.c];
  let big = null,
    ba = -1;
  const boxes = u.s.map((r) => bboxR([r]));
  boxes.forEach((b) => {
    const a = (b[2] - b[0]) * (b[3] - b[1]);
    if (a > ba) ((ba = a), (big = b));
  });
  if (!big) return (MAINB[u.c] = u.b);
  const m = Math.max(big[2] - big[0], big[3] - big[1]);
  const out = big.slice();
  for (const b of boxes)
    if (b[2] >= big[0] - m && b[0] <= big[2] + m && b[3] >= big[1] - m && b[1] <= big[3] + m && b[2] - b[0] < 180) {
      out[0] = Math.min(out[0], b[0]);
      out[1] = Math.min(out[1], b[1]);
      out[2] = Math.max(out[2], b[2]);
      out[3] = Math.max(out[3], b[3]);
    }
  // the simplified world outline may drop islands (Denmark: Jutland only): use the full box unless far-away
  // territories blow it up (France with Guiana)
  const ar = (b) => Math.max(1e-9, (b[2] - b[0]) * (b[3] - b[1]));
  if (u.b && u.b[2] - u.b[0] < 180 && ar(u.b) < ar(out) * 4) return (MAINB[u.c] = u.b.slice());
  return (MAINB[u.c] = out);
}
// keep the thing at screen rectangle A where it now is: zoom so that its unzoomed rectangle B lands on A
function zoomOnto(A, B) {
  if (!A || !B || areaOf(B) <= 0) return { k: 1, x: 0, y: 0 };
  const k = Math.min(40, Math.max(0.2, Math.sqrt(areaOf(A) / areaOf(B))));
  const acx = (A[0] + A[2]) / 2,
    acy = (A[1] + A[3]) / 2,
    bcx = (B[0] + B[2]) / 2,
    bcy = (B[1] + B[3]) / 2;
  return { k, x: acx - bcx * k, y: acy - bcy * k };
}
// selections and statistic per map, so stepping back and forth keeps them
const MAP_STASH = {};
function stashMap() {
  MAP_STASH[S.country || 'world'] = { sel: S.groups.map((g) => [...g.sel]), attr: S.attr };
}
function unstashMap() {
  const st = MAP_STASH[S.country || 'world'];
  if (!st) return;
  S.groups.forEach((g, i) => {
    g.sel = new Set((st.sel[i] || []).filter((c) => GEO.units.some((u) => u.c === c)));
  });
  if (st.attr === 'none' || Object.values(ATTRS).some((a) => a.some((x) => x.id === st.attr))) S.attr = st.attr;
}
// switch map without the usual first-visit example selection; place the new view with zoomOnto
function autoSwitch(id, placeOf) {
  stashMap();
  const key = id === 'world' ? 'world' : id;
  S.visited.add(key); // no example selection
  setMap(id);
  unstashMap();
  S.zoom = { k: 1, x: 0, y: 0 };
  setLayout(S.layout);
  S.zoom = placeOf();
  AUTO_COOL = Date.now() + 450;
  ui();
  zoomChanged();
  toast(t('ts_autodetail') + ': ' + (S.country ? countryLabel(S.country) : t('world')));
}
function countryLabel(c) {
  const u = DATA.world.units.find((k) => k.c === c);
  return u ? nm(u) : c;
}
// called after every wheel step; true when it switched
function autoDetailCheck(cursorC) {
  if (!autoDetailOn() || Date.now() < AUTO_COOL) return false;
  setLayout(S.layout); // sc/ox/oy for the new zoom
  const page = pageArea();
  // zoom in: a country with regions that fills more than half of the page
  if (S.map === 'world') {
    let best = null,
      bf = 0;
    for (const u of GEO.units) {
      if (!hasDetail(u.c) || isBH(u)) continue;
      const r = rectOfData(mainBox(u));
      if (!r) continue;
      const f = areaOf(clipped(r)) / page;
      // the country under the cursor wins a tie
      const score = f + (u.c === cursorC ? 0.05 : 0);
      if (f > AUTO_IN && score > bf) ((bf = score), (best = { u, r }));
    }
    if (best) {
      const A = best.r;
      autoSwitch(best.u.c, () => zoomOnto(A, rectOfMain()));
      return true;
    }
  }
  // zoom out: the current focus, or the whole country, fills less than a quarter
  if (S.zoom.k < Math.sqrt(AUTO_OUT) && (S.focus || S.map !== 'world')) {
    const A = rectOfMain();
    if (S.focus) {
      // focus -> whole map, the focused part stays where it is
      const fu = focusUnits() || [];
      const b = fu.reduce(
        (a, u) => [Math.min(a[0], u.b[0]), Math.min(a[1], u.b[1]), Math.max(a[2], u.b[2]), Math.max(a[3], u.b[3])],
        [Infinity, Infinity, -Infinity, -Infinity],
      );
      S.focus = '';
      LC = null;
      S.zoom = { k: 1, x: 0, y: 0 };
      setLayout(S.layout);
      // the focused part's place in the whole map
      const B = Number.isFinite(b[0]) ? rectOfData(b) : rectOfMain();
      S.zoom = zoomOnto(A, B);
      AUTO_COOL = Date.now() + 450;
      ui();
      zoomChanged();
      return true;
    }
    // country -> world, the country stays where it is
    const c = S.country;
    autoSwitch('world', () => {
      const u = GEO.units.find((k) => k.c === c);
      return zoomOnto(A, u ? rectOfData(mainBox(u)) : null);
    });
    return true;
  }
  return false;
}

const RAD = Math.PI / 180;
const ROB_X = [
  1, 0.9986, 0.9954, 0.99, 0.9822, 0.973, 0.96, 0.9427, 0.9216, 0.8962, 0.8679, 0.835, 0.7986, 0.7597, 0.7186, 0.6732,
  0.6213, 0.5722, 0.5322,
];
const ROB_Y = [
  0, 0.062, 0.124, 0.186, 0.248, 0.31, 0.372, 0.434, 0.4958, 0.5571, 0.6176, 0.6769, 0.7346, 0.7903, 0.8435, 0.8936,
  0.9394, 0.9761, 1,
];
const robin = (a, i, t) => a[i] + (a[Math.min(i + 1, 18)] - a[i]) * t;
const PROJS = {
  robinson: {
    n: 'Robinson',
    f: (l, p) => {
      const d = Math.abs(p) / RAD,
        i = Math.min(17, Math.floor(d / 5)),
        t = (d - i * 5) / 5;
      return [0.8487 * robin(ROB_X, i, t) * l, 1.3523 * robin(ROB_Y, i, t) * Math.sign(p)];
    },
  },
  equalEarth: {
    n: 'Equal Earth',
    f: (l, p) => {
      const A1 = 1.340264,
        A2 = -0.081106,
        A3 = 0.000893,
        A4 = 0.003796,
        M = Math.sqrt(3) / 2;
      const th = Math.asin(M * Math.sin(p)),
        t2 = th * th,
        t6 = t2 * t2 * t2;
      return [
        (l * Math.cos(th)) / (M * (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2))),
        th * (A1 + A2 * t2 + t6 * (A3 + A4 * t2)),
      ];
    },
  },
  naturalEarth: {
    n: 'Natural Earth',
    f: (l, p) => {
      const p2 = p * p,
        p4 = p2 * p2;
      return [
        l * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4))),
        p * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4))),
      ];
    },
  },
  mollweide: {
    n: 'Mollweide',
    f: (l, p) => {
      let th = p;
      // (at the poles the iteration divides by zero: they are the top and bottom point)
      for (let i = 0; i < 8 && Math.abs(p) < Math.PI / 2 - 1e-6; i++) {
        const d = (2 * th + Math.sin(2 * th) - Math.PI * Math.sin(p)) / (2 + 2 * Math.cos(2 * th));
        th -= d;
        if (Math.abs(d) < 1e-7) break;
      }
      return [((2 * Math.SQRT2) / Math.PI) * l * Math.cos(th), Math.SQRT2 * Math.sin(th)];
    },
  },
  winkel3: {
    n: 'Winkel Tripel',
    f: (l, p) => {
      const c = Math.acos(Math.cos(p) * Math.cos(l / 2)),
        sc = c ? Math.sin(c) / c : 1;
      const cp = Math.acos(2 / Math.PI);
      return [(l * cp + (2 * Math.cos(p) * Math.sin(l / 2)) / sc) / 2, (p + Math.sin(p) / sc) / 2];
    },
  },
  // cyl: cylindrical – every meridian a straight vertical line, so the world can repeat sideways (42-viewport.js)
  mercator: {
    n: 'Mercator',
    cyl: 1,
    f: (l, p) => {
      p = Math.max(-85 * RAD, Math.min(85 * RAD, p));
      return [l, Math.log(Math.tan(Math.PI / 4 + p / 2))];
    },
  },
  local: {
    n: 'Local',
    local: 1,
    f: (l, p) => laeaAt(localCenter(), l, p),
  },
  equirect: { n: 'Plate carrée', cyl: 1, f: (l, p) => [l, p] },
  miller: { n: 'Miller', cyl: 1, f: (l, p) => [l, 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * p))] },
};
// Lambert azimuthal equal-area centred on C = [lon0, lat0] (radians)
function laeaAt(C, l, p) {
  const l0 = C[0],
    p0 = C[1];
  let dl = l - l0;
  dl = ((((dl + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
  const k = Math.sqrt(2 / Math.max(1e-9, 1 + Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(dl)));
  return [k * Math.cos(p) * Math.sin(dl), k * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(dl))];
}
let LC = null;
function localCenter() {
  if (LC) return LC;
  const fu = (typeof focusUnits === 'function' && focusUnits()) || GEO.units.filter((k) => !isBH(k));
  let sx = 0,
    sy = 0,
    sz = 0,
    sa = 0;
  for (const k of fu) {
    const lo = (k.p[0] - 180) * RAD,
      la = (90 - k.p[1]) * RAD,
      w = Math.sqrt(k.a) || 1;
    sx += Math.cos(la) * Math.cos(lo) * w;
    sy += Math.cos(la) * Math.sin(lo) * w;
    sz += Math.sin(la) * w;
    sa += w;
  }
  return (LC = [Math.atan2(sy, sx), Math.atan2(sz, Math.hypot(sx, sy))]);
}
function prj(x, y) {
  const f = (PROJS[S.proj] || PROJS.robinson).f;
  const [px, py] = f((x - 180) * RAD, (90 - y) * RAD);
  return [px * 100, -py * 100];
}

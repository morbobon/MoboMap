// ---- the map as a picture while it is moved ----
// A wheel, drag or pinch gesture only moves and scales the last drawing (zoomPreview, 70-ui.js). The browser still
// paints every outline again for every frame, and a world map with relief has megabytes of them – more with the
// copies of the repeated world. So when that is slow, the drawn map is made into a picture once (the same way an
// export is: the SVG with its fonts, drawn on a canvas), and until the view settles that picture is moved
// instead: the drawing itself is hidden, not removed, and render() brings everything back as it was.
//   - repeated world (REP.tile): the picture is one turn of #mapzr and is laid side by side as far as needed;
//     what exists once (names, cities, pins: the layer after the body) stays as drawn, on top
//   - any other map: the picture is all of #mapz around what is in view; near its edge the next one is made
// A gesture begins by moving the drawing as before, and the time the browser takes to paint such a frame is
// measured (snapCost). Only when that is slow (SNAP_SLOW: a whole world with relief; zoomed far in, most outlines
// are out of view and frames are quick) is a picture made, from the next frame on – so one turn of the wheel, or a
// map that moves well as it is, never pays for one. While the picture is made the map stands still (SNAP_HOLD at
// most): painting the outlines at the same time makes both several times slower. Whenever a picture cannot be
// made, the gesture moves the drawing.
// GESTURE is true from the first moved frame until the next render, and #svg has the class "gest" for as long:
// gestureStart / gestureEnd are the places for anything else that should be lighter while the map moves.
let SNAP_ON = true,
  // { d: the DRAWN it belongs to, cur: the picture, busy: when making one began (0: not), fail: none can be made,
  //   cost: ms to paint a frame of the moved drawing (last, timing, moved: snapCost) }
  SNAP = null,
  GESTURE = false;
const SNAP_MAX = 6e6, // pixels in one picture
  SNAP_SIDE = 8192,
  SNAP_SLOW = 50, // ms to paint a frame of the moved drawing, from which a picture is worth making
  SNAP_HOLD = 350; // ms the map may stand still for a picture
function gestureStart() {
  GESTURE = true;
  svg.classList.add('gest');
}
function gestureEnd() {
  GESTURE = false;
  svg.classList.remove('gest');
  if (!svg.getAttribute('class')) svg.removeAttribute('class'); // (no empty class left in the exported SVG)
}
// what the gesture has done to the drawing: scaled by s, moved by tx, ty; v = what is in view, as it was drawn
function snapView() {
  const z0 = DRAWN.zoom,
    z = S.zoom,
    s = z.k / z0.k,
    tx = z.x - z0.x * s,
    ty = z.y - z0.y * s,
    a =
      FILL ||
      (FXL && FXL.active && FXL.P ? FXL.P.map((p, i) => (p - (i % 2 ? FXL.ty : FXL.tx)) / FXL.s) : [0, 0, W, H]),
    f = [Math.min(a[0], 0), Math.min(a[1], 0), Math.max(a[2], W), Math.max(a[3], H)];
  return { s, v: [(f[0] - tx) / s, (f[1] - ty) / s, (f[2] - tx) / s, (f[3] - ty) / s] };
}
// does picture p show all of v, grown by e times its size? (an edge where the drawing ends counts as shown)
function snapCovers(p, v, e) {
  const ex = (v[2] - v[0]) * e,
    ey = (v[3] - v[1]) * e,
    R = p.R;
  return (
    (p.tile || ((p.end[0] || R[0] <= v[0] - ex) && (p.end[2] || R[0] + R[2] >= v[2] + ex))) &&
    (p.end[1] || R[1] <= v[1] - ey) &&
    (p.end[3] || R[1] + R[3] >= v[3] + ey)
  );
}
// one frame of a gesture, before #mapz gets its transform tr: 2 when the picture is shown, 1 when the map stands
// still for this frame (a picture is on its way), 0 when the drawing is to be moved
function snapFrame(tr) {
  if (!GESTURE) gestureStart();
  if (!SNAP_ON) return 0;
  if (!SNAP || SNAP.d !== DRAWN) {
    snapDrop();
    SNAP = { d: DRAWN, cur: null, busy: 0, fail: false, cost: 0, last: 0, timing: false, moved: false };
  }
  const { s, v } = snapView(),
    p = SNAP.cur;
  // a new picture: none yet, the view is about to leave this one, or it has been magnified until it is soft
  if (SNAP.cost >= SNAP_SLOW && !SNAP.busy && !SNAP.fail && (!p || !snapCovers(p, v, 0.12) || s / p.s > 1.6))
    snapMake(s, v);
  if (!p || !snapCovers(p, v, 0)) {
    if (SNAP.busy && performance.now() - SNAP.busy < SNAP_HOLD) return 1;
    snapHide();
    snapCost();
    return 0;
  }
  snapPlace(p, tr, v);
  return 2;
}
// how long the browser takes to paint the frame in which the drawing has just been moved: from the frame that
// shows it until the next one can begin; SNAP.cost is the quicker of the last two
function snapCost() {
  const snap = SNAP;
  snap.moved = true;
  if (snap.timing) return;
  snap.timing = true;
  let t = 0;
  // from one frame to the next, for as long as every frame has the drawing moved
  const tick = () => {
    const now = performance.now();
    if (t) {
      // (two in a row: the first frame after a rest is often slow for other reasons)
      snap.cost = Math.min(now - t, snap.last);
      snap.last = now - t;
    }
    t = now;
    if (snap.moved && SNAP === snap && !snap.busy) requestAnimationFrame(tick);
    else snap.timing = false;
    snap.moved = false;
  };
  requestAnimationFrame(tick);
}
// makes the picture for the view v at scale s; it is shown as soon as it is ready
function snapMake(s, v) {
  const snap = SNAP,
    g = document.getElementById('mapz'),
    tile = REP && REP.tile ? document.getElementById('mapzr') : null,
    defs = svg.querySelector('defs'),
    m = g && g.parentNode.getScreenCTM();
  let B = null;
  try {
    B = (tile || g).getBBox();
  } catch (e) {}
  if (!m || !defs || !B || !(B.width > 0) || !(B.height > 0) || m.b || m.c || !(m.a > 0))
    return void (snap.fail = true);
  const dpr = window.devicePixelRatio || 1,
    unit = m.a * dpr, // screen pixels to one unit of the drawing as it was drawn
    vw = v[2] - v[0],
    vh = v[3] - v[1],
    pad = 40; // glows and shadows reach past the outlines
  // the area: the view and a margin of mg views around it, no further than the drawing goes; in the repeated
  // world one whole turn sideways. Fewer pixels to the unit (down to 0.7) before a smaller margin.
  let R = null,
    q = 0,
    end = null;
  for (const mg of [1, 0.5, 0.25]) {
    const x0 = tile ? REP.p0 : Math.max(B.x - pad, v[0] - mg * vw),
      x1 = tile ? REP.p1 : Math.min(B.x + B.width + pad, v[2] + mg * vw),
      y0 = Math.max(B.y - pad, v[1] - mg * vh),
      y1 = Math.min(B.y + B.height + pad, v[3] + mg * vh);
    if (!(x1 > x0 && y1 > y0)) return void (snap.fail = true);
    const want = unit * s,
      fit = Math.min(want, Math.sqrt(SNAP_MAX / ((x1 - x0) * (y1 - y0))), SNAP_SIDE / (x1 - x0), SNAP_SIDE / (y1 - y0));
    if (fit < 0.7 * want) continue;
    q = fit;
    R = [x0, y0, x1 - x0, y1 - y0];
    end = [
      x0 <= B.x - pad + 1e-6,
      y0 <= B.y - pad + 1e-6,
      x1 >= B.x + B.width + pad - 1e-6,
      y1 >= B.y + B.height + pad - 1e-6,
    ];
    break;
  }
  if (!R) return void (snap.fail = true);
  // whole screen pixels: the picture then lies on the pixels the drawing was painted on, and is as sharp
  const o = tile ? 2 / q : 0, // a turn is cut a little wider than it is, so no hairline shows where two meet
    snapTo = (x, e) => (Math.floor((x * m.a + e) * dpr) / dpr - e) / m.a;
  const x = snapTo(R[0] - o, m.e),
    y = snapTo(R[1], m.f),
    w = Math.ceil((R[0] + R[2] + o - x) * q - 1e-6),
    h = Math.ceil((R[1] + R[3] - y) * q - 1e-6),
    box = [x, y, w / q, h / q]; // what the picture shows: R, and a little more
  const src =
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${box.join(' ')}" width="${w}" height="${h}" preserveAspectRatio="none">` +
    `<style>${allFontCSS()}</style>${new XMLSerializer().serializeToString(defs)}` +
    (tile ? [tile] : [...g.children]).map((e) => new XMLSerializer().serializeToString(e)).join('') +
    '</svg>';
  const url = URL.createObjectURL(new Blob([src], { type: 'image/svg+xml;charset=utf-8' })),
    img = new Image(),
    done = (pic) => {
      URL.revokeObjectURL(url);
      snap.busy = 0;
      if (!pic) snap.fail = true;
      // the map has been drawn again in the meantime
      if (SNAP !== snap) return void (pic && URL.revokeObjectURL(pic.url));
      if (pic) {
        const old = snap.cur;
        snapHide();
        snap.cur = pic;
        if (old) URL.revokeObjectURL(old.url);
      }
      // the map stood still for this: now it goes to where the gesture has got to
      if (GESTURE) zoomPreview();
    };
  snap.busy = performance.now();
  img.onerror = () => done(null);
  img.onload = () => {
    try {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      c.toBlob((blob) => {
        if (!blob) return done(null);
        const pic = { R, box, s, end, tile: !!tile, url: URL.createObjectURL(blob), g: null, n: [] },
          dec = new Image();
        // decoded before it is shown: no frame without a map
        dec.src = pic.url;
        (dec.decode ? dec.decode() : Promise.resolve()).then(
          () => done(pic),
          () => done(pic),
        );
      }, 'image/png');
    } catch (e) {
      done(null);
    }
  };
  img.src = url;
}
// shows picture p under the transform of #mapz and hides what it stands for
function snapPlace(p, tr, v) {
  const g = document.getElementById('mapz');
  if (!p.g || !p.g.isConnected) {
    p.g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    p.g.setAttribute('id', 'snapg');
    p.n = [];
    g.parentNode.insertBefore(p.g, g);
    snapBody(g, p.tile).forEach((e) => e.setAttribute('visibility', 'hidden'));
  }
  p.g.setAttribute('transform', tr);
  // the turns in view (one picture when the world is not repeated)
  const j0 = p.tile ? Math.floor((v[0] - REP.p1) / REP.per) : 0,
    j1 = p.tile ? Math.ceil((v[2] - REP.p0) / REP.per) : 0;
  for (let j = j0, i = 0; j <= j1 || i < p.n.length; j++, i++) {
    let im = p.n[i];
    if (j > j1) {
      im.setAttribute('display', 'none');
      continue;
    }
    if (!im) {
      im = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      for (const [k, val] of [
        ['class', 'snp'],
        ['href', p.url],
        ['y', p.box[1]],
        ['width', p.box[2]],
        ['height', p.box[3]],
        ['preserveAspectRatio', 'none'],
      ])
        im.setAttribute(k, val);
      p.g.appendChild(im);
      p.n.push(im);
    }
    const x = String(p.box[0] + (p.tile ? j * REP.per : 0));
    if (im.getAttribute('x') !== x) im.setAttribute('x', x);
    if (im.getAttribute('display')) im.removeAttribute('display');
  }
}
// the parts of the drawing a picture stands for
function snapBody(g, tile) {
  const b = tile && document.getElementById('mapzr');
  return b ? [b.parentNode, b.parentNode.previousElementSibling].filter(Boolean) : [g];
}
// the drawing again instead of the picture (the picture is kept: the view may come back to it)
function snapHide() {
  const p = SNAP && SNAP.cur;
  if (!p || !p.g) return;
  p.g.remove();
  p.g = null;
  const g = document.getElementById('mapz');
  if (g) snapBody(g, p.tile).forEach((e) => e.removeAttribute('visibility'));
}
// forgets the picture: the map is drawn again (render)
function snapDrop() {
  snapHide();
  if (SNAP && SNAP.cur) URL.revokeObjectURL(SNAP.cur.url);
  SNAP = null;
}
// the drawing itself is needed (export): in the middle of a gesture the map is drawn where it now is
function snapSettle() {
  if (GESTURE) render();
}

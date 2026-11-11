// Page items: things on the page that are placed by dragging (the .drg groups and S.drag, 70-ui.js) and resized
// with the mouse wheel over them, or with the corner handle of the hovered (mouse) or tapped (touch) item.
// One behaviour for the brand logo, the partner logos and the text items; another kind (a compass, a stamp,
// a stain) joins by calling pageItem() with:
//   has(key)       the kind owns this data-drag key, and the item can be resized right now
//   get(key)       its size (a scale, a font size …)
//   set(key, v)    stores a new size; it does not draw (the page is drawn on the next frame)
//   lo, hi, step   the limits of the size and what it is rounded to
//   sync(key)      optional: brings the kind's own control in the panel up to date
//   corner         optional: 'bl' puts the handle at the bottom left (an item that grows from its top right)
const PAGE_ITEMS = [];
function pageItem(kind) {
  PAGE_ITEMS.push(kind);
}
const piKind = (key) => (key && PAGE_ITEMS.find((k) => k.has(key))) || null;
// resizing is editing: not on a locked map (there the wheel does what the lock says)
const piOff = () => !!S.lock.on;
// the resizable item at an element of the map, '' for anything else
function piKeyAt(el) {
  const g = el && el.closest && el.closest('#svg .drg');
  return g && !piOff() && piKind(g.dataset.drag) ? g.dataset.drag : '';
}
// key: the item that shows the handle; wheel: the running wheel gesture; drag: the handle being dragged
const PI = { key: '', touch: false, wheel: null, drag: null, hideT: 0 };
// a new size for an item: within the kind's limits, the panel follows, the page is drawn on the next frame
function piResize(key, v) {
  const kind = piKind(key);
  if (!kind || piOff() || !Number.isFinite(v)) return;
  const step = kind.step || 0.01;
  v = +(Math.round(Math.max(kind.lo, Math.min(kind.hi, v)) / step) * step).toFixed(4);
  if (v === kind.get(key)) return;
  kind.set(key, v);
  if (kind.sync) kind.sync(key);
  zoomChanged();
}
// ---- wheel over an item: its size instead of the map's zoom (with or without Alt) ----
document.getElementById('svg').addEventListener(
  'wheel',
  (e) => {
    const now = performance.now();
    let w = PI.wheel;
    // a run of wheel steps stays with what it started on: an item that shrinks away from under the pointer goes
    // on shrinking, and a map being zoomed does not stop at a text that slides in under the pointer
    if (!w || now - w.t > 350 || Math.hypot(e.clientX - w.x, e.clientY - w.y) > 4) {
      const key = piKeyAt(e.target);
      w = PI.wheel = { key, x: e.clientX, y: e.clientY, v: key ? piKind(key).get(key) : 0 };
    }
    w.t = now;
    if (!w.key) return; // the map zooms (70-ui.js)
    e.preventDefault();
    e.stopImmediatePropagation();
    const kind = piKind(w.key);
    if (!kind || piOff()) return;
    // the running size is kept unrounded, so small steps (a trackpad) add up
    w.v = Math.max(kind.lo, Math.min(kind.hi, w.v * Math.exp(Math.max(-0.1, Math.min(0.1, -e.deltaY * 0.001)))));
    piResize(w.key, w.v);
  },
  { capture: true, passive: false },
);
// ---- the corner handle ----
// puts the handle on its item's corner, or hides it (no item, a locked map, an item that is not drawn)
function piPlace() {
  const h = document.getElementById('pih');
  const kind = !piOff() && piKind(PI.key);
  const g = kind && document.querySelector(`#svg .drg[data-drag="${CSS.escape(PI.key)}"]`);
  const r = g && g.getBoundingClientRect();
  if (!r || !r.width) {
    h.hidden = true;
    if (!PI.drag) PI.key = '';
    return;
  }
  const o = document.getElementById('wrap').getBoundingClientRect(),
    left = kind.corner === 'bl';
  h.hidden = false;
  h.classList.toggle('bl', left);
  h.title = t('pi_resize');
  h.style.left = ((left ? r.left : r.right) - o.left).toFixed(1) + 'px';
  h.style.top = (r.bottom - o.top).toFixed(1) + 'px';
}
function piShow(key, touch) {
  clearTimeout(PI.hideT);
  PI.touch = !!touch;
  if (PI.key === key && !document.getElementById('pih').hidden) return;
  PI.key = key;
  piPlace();
}
// the mouse left the item: the handle stays a moment, so it can be reached
function piHideSoon() {
  if (PI.drag || !PI.key) return;
  clearTimeout(PI.hideT);
  PI.hideT = setTimeout(() => {
    PI.key = '';
    piPlace();
  }, 300);
}
{
  const svgEl = document.getElementById('svg'),
    h = document.getElementById('pih');
  // mouse: the item under the pointer
  svgEl.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || PI.drag) return;
    const key = piKeyAt(e.target);
    if (key) piShow(key);
    else {
      PI.touch = false;
      piHideSoon();
    }
  });
  svgEl.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && piHideSoon());
  // touch and pen: the item that was tapped, until something else is (capture: before the item's drag starts)
  document.addEventListener(
    'pointerdown',
    (e) => {
      if (e.pointerType === 'mouse' || PI.drag || (e.target.closest && e.target.closest('#pih'))) return;
      const key = piKeyAt(e.target);
      if (key) piShow(key, true);
      else if (PI.key) {
        PI.key = '';
        piPlace();
      }
    },
    true,
  );
  h.addEventListener('pointerenter', () => clearTimeout(PI.hideT));
  h.addEventListener('pointerleave', () => !PI.touch && piHideSoon());
  // dragging the handle: the size follows the distance to the item's opposite corner
  h.addEventListener('pointerdown', (e) => {
    const kind = !piOff() && piKind(PI.key);
    const g = kind && document.querySelector(`#svg .drg[data-drag="${CSS.escape(PI.key)}"]`);
    if (!g || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const r = g.getBoundingClientRect(),
      o = [kind.corner === 'bl' ? r.right : r.left, r.top];
    PI.drag = {
      id: e.pointerId,
      key: PI.key,
      o,
      d0: Math.max(8, Math.hypot(e.clientX - o[0], e.clientY - o[1])),
      v0: kind.get(PI.key),
    };
    h.setPointerCapture(e.pointerId);
    document.getElementById('wrap').classList.add('resizing');
  });
  h.addEventListener('pointermove', (e) => {
    const d = PI.drag;
    if (d && e.pointerId === d.id) piResize(d.key, (d.v0 * Math.hypot(e.clientX - d.o[0], e.clientY - d.o[1])) / d.d0);
  });
  const end = (e) => {
    if (!PI.drag || e.pointerId !== PI.drag.id) return;
    PI.drag = null;
    document.getElementById('wrap').classList.remove('resizing');
    // one undo step per drag
    clearTimeout(HIST.timer);
    HIST.timer = setTimeout(() => {
      HIST.timer = 0;
      pushHistory();
    }, 60);
  };
  h.addEventListener('pointerup', end);
  h.addEventListener('pointercancel', end);
  // the wheel over the handle belongs to its item too
  h.addEventListener(
    'wheel',
    (e) => {
      const kind = !piOff() && piKind(PI.key);
      if (!kind) return;
      e.preventDefault();
      piResize(PI.key, kind.get(PI.key) * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
    },
    { passive: false },
  );
  document.getElementById('pane').addEventListener('scroll', piPlace, { passive: true });
  window.addEventListener('resize', piPlace);
}

// ---- the brand logo: its size on this map and its own link (S.logo; the logo itself is the design system's) ----
function logoClean(o) {
  o = o && typeof o === 'object' ? o : {};
  return { scale: Math.max(0.3, Math.min(3, +o.scale || 1)), link: String(o.link || '').slice(0, 500) };
}
const logoScale = () => logoClean(S.logo).scale;
// what a project stores: only what is set
function logoOut() {
  const o = logoClean(S.logo),
    d = {};
  if (o.scale !== 1) d.scale = o.scale;
  if (o.link) d.link = o.link;
  return Object.keys(d).length ? { logo: d } : {};
}
function logoSet(k, v) {
  S.logo = logoClean(Object.assign({}, S.logo, { [k]: v }));
  logoUI();
  render();
}
function logoUI() {
  const o = logoClean(S.logo),
    pct = Math.round(o.scale * 100),
    link = document.getElementById('logoLink');
  document.getElementById('logoSize').value = pct;
  document.getElementById('logoSizeV').textContent = pct + ' %';
  if (document.activeElement !== link) link.value = o.link;
}
pageItem({
  has: (key) => key === 'logo',
  get: logoScale,
  set: (key, v) => (S.logo = Object.assign(logoClean(S.logo), { scale: v })),
  lo: 0.3,
  hi: 3,
  step: 0.01,
  sync: logoUI,
  corner: 'bl',
});

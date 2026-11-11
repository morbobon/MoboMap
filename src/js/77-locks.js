// Map locks ("viewer mode"): position (no panning), zoom (none, or within a range), highlights (clicks do not
// select) and editing (the editor is hidden), each on its own, switched on and off together by the lock button on
// the map or, on touch screens, a double tap with two fingers. Saved in projects and links (lk=). A lock in a link is
// a presentation setting, not protection: whoever gets the link can remove the parameter.
const LOCK_DEFAULT = { on: false, pos: true, zoom: 1, zr: [1, 4], hl: true, edit: false };
// what a lock holds while the map is locked: pos, hl, edit → true / false; zoom → 0 free, 1 locked, 2 a range
const lockOn = (what) => (S.lock.on ? S.lock[what] : what === 'zoom' ? 0 : false);
// opened from a link in viewer mode: the receiver sees no lock button (to edit: the context menu)
let LOCK_LINK = false;
{
  const v = new URLSearchParams(location.search).get('lk');
  LOCK_LINK = v != null && v.split('.').includes('e');
}
function lockClean(o) {
  o = o && typeof o === 'object' ? o : {};
  const zr = Array.isArray(o.zr) ? o.zr.map(Number) : [];
  const c = (v, d) => (Number.isFinite(v) && v > 0 ? Math.min(40, Math.max(0.3, v)) : d);
  let lo = c(zr[0], 1),
    hi = c(zr[1], 4);
  if (hi < lo) [lo, hi] = [hi, lo];
  return {
    on: !!o.on,
    pos: o.pos !== false,
    zoom: [0, 1, 2].includes(+o.zoom) ? +o.zoom : 1,
    zr: [lo, hi],
    hl: o.hl !== false,
    edit: !!o.edit,
  };
}
// what a project stores: nothing while the locks are as they come
function lockOut() {
  return JSON.stringify(S.lock) === JSON.stringify(LOCK_DEFAULT) ? {} : { lock: Object.assign({}, S.lock) };
}
// link: lk=<tokens> only while locked; p position, z zoom (z1-4: within 1–4), h highlights, e editing ('-': none)
function lockParam(l) {
  if (!l || !l.on) return '';
  const f = [];
  if (l.pos) f.push('p');
  if (l.zoom === 1) f.push('z');
  if (l.zoom === 2) f.push('z' + l.zr[0] + '-' + l.zr[1]);
  if (l.hl) f.push('h');
  if (l.edit) f.push('e');
  return f.join('.') || '-';
}
function lockFromParam(v) {
  const o = { on: true, pos: false, zoom: 0, hl: false, edit: false };
  for (const f of String(v || '').split('.')) {
    if (f === 'p') o.pos = true;
    else if (f === 'h') o.hl = true;
    else if (f === 'e') o.edit = true;
    else if (f === 'z') o.zoom = 1;
    else {
      const m = /^z(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/.exec(f);
      if (m) ((o.zoom = 2), (o.zr = [+m[1], +m[2]]));
    }
  }
  return lockClean(o);
}
// the page centre in map coordinates: a locked position zooms around it
function lockCentre() {
  const r = svg.getBoundingClientRect();
  return svgPoint({ clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
}
// a zoom within the range: scaled around the page centre
function lockClamp() {
  if (lockOn('zoom') !== 2) return;
  const z = S.zoom,
    k = Math.min(S.lock.zr[1], Math.max(S.lock.zr[0], z.k));
  if (k === z.k) return;
  const [cx, cy] = lockCentre();
  S.zoom = { k, x: cx - ((cx - z.x) / z.k) * k, y: cy - ((cy - z.y) / z.k) * k };
}
const LOCK_ICON = (on) =>
  `<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><rect x="3" y="7" width="10" height="7.5" rx="1.6" fill="currentColor"/><path d="${on ? 'M5.2 7V5a2.8 2.8 0 0 1 5.6 0v2' : 'M5.2 7V5a2.8 2.8 0 0 1 5.5-.7'}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`;
// the lock button, the options and the page (viewer mode) follow the state
function lockUI() {
  const L = S.lock,
    on = L.on;
  document.body.classList.toggle('viewer', on && L.edit);
  document.body.classList.toggle('viewer-link', on && L.edit && LOCK_LINK);
  const wrap = document.getElementById('wrap');
  wrap.classList.toggle('locked', on);
  wrap.classList.toggle('lock-pos', on && (L.pos || L.zoom === 1));
  wrap.classList.toggle('lock-hl', on && L.hl);
  const b = document.getElementById('lockBtn');
  if (!b) return;
  b.classList.toggle('on', on);
  b.setAttribute('aria-pressed', on);
  b.innerHTML = LOCK_ICON(on) + '<span>' + esc(t(on ? 'lock_locked' : 'lock_map')) + '</span>';
  b.title = t(on ? 'lock_unlock_t' : 'lock_t');
  const set = (id, prop, v) => {
    const el = document.getElementById(id);
    if (el) el[prop] = v;
  };
  set('lkOn', 'checked', on);
  set('lkPos', 'checked', L.pos);
  set('lkZoom', 'value', String(L.zoom));
  set('lkMin', 'value', L.zr[0]);
  set('lkMax', 'value', L.zr[1]);
  set('lkHl', 'checked', L.hl);
  set('lkEdit', 'checked', L.edit);
  const rg = document.getElementById('lkRange');
  if (rg) rg.hidden = L.zoom !== 2;
}
function toggleLock(on = !S.lock.on, how) {
  S.lock = Object.assign({}, S.lock, { on: !!on });
  if (!on) LOCK_LINK = false;
  lockClamp();
  lockUI();
  toast(
    t(
      how === 'tap'
        ? on
          ? 'ts_lock_tap'
          : 'ts_unlock_tap'
        : !on
          ? 'ts_unlocked'
          : S.lock.edit
            ? 'ts_locked_view'
            : 'ts_locked',
    ),
    on && S.lock.edit ? 5000 : 0,
  );
  render();
}
function setLock(what, v) {
  S.lock = Object.assign({}, S.lock, { [what]: v });
  if (what === 'edit' && v && S.lock.on) toast(t('ts_locked_view'), 5000);
  lockClamp();
  lockUI();
  render();
}
function setLockRange() {
  S.lock = lockClean(
    Object.assign({}, S.lock, {
      zr: [+document.getElementById('lkMin').value, +document.getElementById('lkMax').value],
    }),
  );
  lockClamp();
  lockUI();
  render();
}
function lockPop(show) {
  const p = document.getElementById('lockPop');
  if (!p) return;
  p.hidden = show == null ? !p.hidden : !show;
  if (!p.hidden) lockUI();
}
document.addEventListener('pointerdown', (e) => {
  const p = document.getElementById('lockPop');
  if (p && !p.hidden && !e.target.closest('#lockPop, #lockMore')) p.hidden = true;
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') lockPop(false);
});

// touch: a double tap with two fingers switches the lock (a double tap with one finger opens / goes to an area).
// Not in viewer mode from a link, where the lock button is hidden too.
{
  const pts = new Map();
  let two = null, // the current two-finger touch: { t, d, m, moved }
    lastTwo = 0;
  const dist = () => {
    const [a, b] = [...pts.values()];
    return { d: Math.hypot(a[0] - b[0], a[1] - b[1]), m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] };
  };
  svg.addEventListener(
    'pointerdown',
    (e) => {
      if (e.pointerType !== 'touch') return;
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2) two = Object.assign({ t: Date.now(), moved: false }, dist());
      else if (pts.size > 2) two = null;
    },
    true,
  );
  window.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (two && pts.size === 2) {
      const n = dist();
      if (Math.abs(n.d - two.d) > 24 || Math.hypot(n.m[0] - two.m[0], n.m[1] - two.m[1]) > 24) two.moved = true;
    }
  });
  const up = (e) => {
    if (!pts.delete(e.pointerId) || pts.size) return;
    const tap = two && !two.moved && Date.now() - two.t < 350;
    two = null;
    if (!tap) return;
    const now = Date.now();
    if (now - lastTwo < 450) {
      lastTwo = 0;
      if (!(S.lock.on && S.lock.edit && LOCK_LINK)) toggleLock(!S.lock.on, 'tap');
    } else lastTwo = now;
  };
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}

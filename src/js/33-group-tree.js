// Supergroups: a group can hold subgroups (one level). A supergroup has no areas of its own: its area is its
// subgroups' together. S.groups is kept in tree order (each supergroup followed by its subgroups), which is also the
// drawing order: the supergroup under, its subgroups on top.
const groupById = (id) => S.groups.find((g) => g.id === id);
const subsOf = (g) => S.groups.filter((s) => s.parent === g.id);
const isSuper = (g) => S.groups.some((s) => s.parent === g.id);
// all areas a group stands for: its own, or for a supergroup those of its subgroups that are shown
const areasOf = (g) => (isSuper(g) ? new Set(subsOf(g).flatMap((s) => (s.off ? [] : [...s.sel]))) : g.sel);
// tree order, the active group kept active; a parent that no longer exists makes its subgroups groups again
function orderGroups() {
  const act = S.groups[S.active];
  for (const g of S.groups) if (g.parent && !groupById(g.parent)) g.parent = null;
  S.groups = S.groups.filter((g) => !g.parent).flatMap((g) => [g, ...subsOf(g)]);
  S.active = Math.max(0, S.groups.indexOf(act));
}
// a group about to get its first subgroup hands its own areas to a subgroup in its own style
// (as "Subgroup 1"); returns that subgroup, or nothing when there were no areas to hand over
function makeSuper(g) {
  if (isSuper(g) || !g.sel.size) return null;
  const s = newGroup(t('subgroup') + ' 1', [...g.hl], g.color, 0.5);
  s.parent = g.id;
  s.sel = g.sel;
  g.sel = new Set();
  g.text = null;
  S.groups.splice(S.groups.indexOf(g) + 1, 0, s); // first among its subgroups
  return s;
}
// "+ Subgroup": a new subgroup of the active group (or of its supergroup when a subgroup is active). The first one
// of a group with areas is those areas.
function addSubgroup() {
  const base = S.groups[S.active];
  if (!base) return;
  const sup = base.parent ? groupById(base.parent) : base;
  let s = makeSuper(sup);
  if (!s) {
    const D = DS[S.ds];
    s = newGroup(
      t('subgroup') + ' ' + (subsOf(sup).length + 1),
      ['fill'],
      D.highlight[(S.groups.length + 1) % D.highlight.length],
      0.5,
    );
    s.parent = sup.id;
    S.groups.push(s);
  }
  orderGroups();
  S.active = S.groups.indexOf(s);
  sup.lastSub = s.id;
  s.openedAt = Date.now();
  ui();
  render();
}
// a group card dropped on another: it becomes a subgroup there (beside it, when the target is a subgroup);
// dropped on free space it becomes a group of its own. One level: a supergroup cannot become a subgroup.
function nestGroup(from, to) {
  // the drop redraws the cards, so the dragged one may never see its dragend
  document.body.classList.remove('grpdrag');
  const g = S.groups[from],
    target = to == null ? null : S.groups[to];
  if (!g || g === target) return;
  if (!target) g.parent = null;
  else {
    if (isSuper(g)) return toast(t('grp_nest_refused'));
    const sup = target.parent ? groupById(target.parent) : target;
    if (sup === g) return;
    makeSuper(sup);
    g.parent = sup.id;
  }
  orderGroups();
  ui();
  render();
}
// the group that clicks on the map add to: the active one, or for a supergroup its last used subgroup
function leafOf(g) {
  if (!g || !isSuper(g)) return g;
  const ss = subsOf(g);
  return ss.find((s) => s.id === g.lastSub) || ss[0];
}
// the groups as drawn: hidden ones (and the subgroups of a hidden supergroup) left out, a supergroup with its
// subgroups' areas (sup), and its Raised passed on to them, so they stay on top of it
function drawnGroups() {
  const out = [];
  for (const g of S.groups) {
    const p = g.parent ? groupById(g.parent) : null;
    if (g.off || (p && p.off)) continue;
    if (isSuper(g)) out.push(Object.assign(Object.create(g), { sel: areasOf(g), sup: true }));
    else if (p && p.hl.has('emboss') && !g.hl.has('emboss'))
      out.push(Object.assign(Object.create(g), { hl: new Set([...g.hl, 'emboss']) }));
    else out.push(g);
  }
  return out;
}
// where a group's own name goes ("Use group name as label", and every supergroup): the largest connected piece
// (units whose boxes touch), at the unit nearest that piece's area-weighted centre
function nameAnchor(g) {
  const ks = [...g.sel].map((c) => GEO.units.find((k) => k.c === c)).filter((k) => k && !(S.focusHide && !inFocus(k)));
  if (!ks.length) return null;
  const root = ks.map((_, i) => i);
  const find = (i) => (root[i] === i ? i : (root[i] = find(root[i])));
  const touch = (a, b) => a[0] <= b[2] + 0.01 && b[0] <= a[2] + 0.01 && a[1] <= b[3] + 0.01 && b[1] <= a[3] + 0.01;
  for (let i = 0; i < ks.length; i++)
    for (let j = i + 1; j < ks.length; j++) if (touch(ks[i].b, ks[j].b)) root[find(i)] = find(j);
  const piece = {};
  ks.forEach((k, i) => (piece[find(i)] ||= []).push(k));
  const big = Object.values(piece).sort((a, b) => b.reduce((s, k) => s + k.a, 0) - a.reduce((s, k) => s + k.a, 0))[0];
  const tot = big.reduce((s, k) => s + k.a, 0);
  const cx = big.reduce((s, k) => s + kc(k)[0] * k.a, 0) / tot,
    cy = big.reduce((s, k) => s + kc(k)[1] * k.a, 0) / tot;
  const dist = (k) => {
    const [x, y] = kc(k);
    return Math.hypot(x - cx, y - cy);
  };
  return big.reduce((a, b) => (dist(b) < dist(a) ? b : a));
}
// what a group's labels and callouts say: one entry with its name, or one per area (key: drag key after lb:/co:)
function labelsOf(g) {
  if (!g.sel.size) return [];
  if (g.sup || g.nameLabel) {
    const k = nameAnchor(g);
    return k ? [{ k, text: g.name, key: '#' + g.id }] : [];
  }
  return [...g.sel]
    .map((c) => GEO.units.find((k) => k.c === c))
    .filter((k) => k && !(S.focusHide && !inFocus(k)))
    .map((k) => ({ k, text: nm(k), key: k.c }));
}
// the drop strip for "a group of its own" shows only while a card is dragged
document.addEventListener('dragend', () => document.body.classList.remove('grpdrag'));
document.addEventListener('drop', () => document.body.classList.remove('grpdrag'));

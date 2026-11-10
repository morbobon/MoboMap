// Context menu on the map (right-click, or a long press on touch screens): what is under the pointer and shortcuts
// to its settings in the side panel. Shift+click runs the first shortcut: the settings of the topmost item.

// open the panel at a control: its tab, its section, scrolled into view and flashed
function jumpTo(sel) {
  const find = () => (typeof sel === 'function' ? sel() : document.querySelector(sel));
  let el = find();
  if (!el) return;
  const tab = el.closest('aside .tab');
  if (tab) {
    if (isPhone()) document.body.classList.add('sheet-open');
    else if (document.body.classList.contains('no-panel')) toggleChrome('panel');
    setTab(tab.dataset.tab);
    el = find() || el; // the tab may have been redrawn (highlight groups)
  }
  const sec = el.closest('.sec');
  if (sec && sec.classList.contains('closed')) toggleSec(sec.dataset.sec);
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el.classList.remove('flash');
  void el.offsetWidth; // restart the animation
  el.classList.add('flash');
  if (el.matches('input[type="text"], textarea') && !isPhone()) el.focus({ preventScroll: true });
}
const secOf = (id) => `.sec[data-sec="${id}"]`;
// the item at a map element: { title, items: [{ label, go }] }, the first item being its own settings
function ctxItems(target) {
  const items = [],
    add = (label, go) => items.push({ label, go });
  const drg = target.closest && target.closest('.drg');
  const key = drg ? drg.dataset.drag : '';
  const unit = target.closest && target.closest('.k');
  // labels and callouts belong to their unit
  const c = unit ? unit.dataset.c : /^(lb|co):/.test(key) ? key.slice(3) : '';
  let title = '';
  if (c) {
    const k = GEO.units.find((k) => k.c === c);
    title = k ? nm(k) : c;
    const gi = groupOf(c),
      g = S.groups[gi];
    if (g) {
      add(t('ctx_group').replace('{g}', g.name), () => {
        activateGroup(gi);
        jumpTo('#groups .grp.active');
      });
      add(t('ctx_remove').replace('{g}', g.name), () => {
        g.sel.delete(c);
        syncText();
        ui();
        render();
      });
    } else {
      add(t('sec_groups'), () => jumpTo(S.groups.length ? '#groups .grp.active' : secOf('groups')));
      add(t('ctx_add').replace('{g}', S.groups.length ? activeGroup().name : t('new_group_short')), () => {
        S.groups.forEach((o) => o.sel.delete(c));
        activeGroup().sel.add(c);
        syncText();
        ui();
        render();
      });
    }
    const nav =
      S.map === 'world' && hasDetail(c) ? 'ctx_open' : S.focus === c ? 'ctx_out' : S.map === 'world' ? '' : 'ctx_zoom';
    if (nav) add(t(nav), () => focusClick(c));
    if (attrDef()) add(t('sec_data'), () => jumpTo(secOf('data')));
  } else if (key === 'title' || key === 'sub') {
    title = document.getElementById(key).value || t('sec_text');
    add(t('sec_text'), () => jumpTo('#' + key));
  } else if (key === 'legend') {
    title = t('show_legend');
    add(t('sec_pageel'), () => jumpTo('#legend'));
  } else if (key === 'logo') {
    title = t('sec_logo');
    add(t('sec_logo'), () => jumpTo(secOf('logo')));
  } else if (key.startsWith('pt:')) {
    const p = S.partners.find((p) => 'pt:' + p.id === key);
    title = p ? p.name : t('sec_footer');
    add(t('sec_footer'), () =>
      jumpTo(
        () =>
          document.querySelector(`.partner[data-pid="${CSS.escape(key.slice(3))}"]`) ||
          document.querySelector(secOf('footer')),
      ),
    );
  }
  if (key && S.drag && S.drag[key])
    add(t('ctx_reset_one'), () => {
      const d = Object.assign({}, S.drag);
      delete d[key];
      S.drag = d;
      render();
    });
  // the page and the map as a whole (also what the sea or the background offers first)
  if (!title) title = S.country ? countryName(S.country) : t('world');
  if (!c && !key && (S.focus || S.country)) add(t('ctx_out'), () => focusClick(null));
  add(t('sec_style'), () => jumpTo('#styles'));
  add(t('sec_display'), () => jumpTo(secOf('display')));
  add(t('sec_fx'), () => jumpTo(secOf('fx')));
  add(t('sec_layout'), () => jumpTo('#layouts'));
  return { title, items };
}
function showCtx(target, cx, cy) {
  const { title, items } = ctxItems(target);
  const m = document.getElementById('ctx');
  m.innerHTML =
    `<div class="ctxhd">${esc(title)}</div>` +
    items.map((it, i) => `<button data-i="${i}"${i ? '' : ' class="first"'}>${esc(it.label)}</button>`).join('') +
    `<div class="ctxhint">${esc(t('ctx_shift'))}</div>`;
  m._items = items;
  m.style.display = 'block';
  tip.style.display = 'none';
  // kept on screen
  m.style.left = Math.max(4, Math.min(cx, innerWidth - m.offsetWidth - 4)) + 'px';
  m.style.top = Math.max(4, Math.min(cy, innerHeight - m.offsetHeight - 4)) + 'px';
}
function hideCtx() {
  const m = document.getElementById('ctx');
  if (m) m.style.display = 'none';
}
{
  const svgEl = document.getElementById('svg'),
    m = document.getElementById('ctx');
  svgEl.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showCtx(e.target, e.clientX, e.clientY);
  });
  // Shift+click: straight to the first shortcut (capture: before selecting the unit)
  svgEl.addEventListener(
    'click',
    (e) => {
      if (!e.shiftKey) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const first = ctxItems(e.target).items[0];
      if (first) first.go();
    },
    true,
  );
  m.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    hideCtx();
    m._items[+b.dataset.i].go();
  });
  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('#ctx')) hideCtx();
  });
  document.addEventListener('keydown', (e) => e.key === 'Escape' && hideCtx());
  window.addEventListener('wheel', hideCtx, { passive: true });
  window.addEventListener('resize', hideCtx);
}

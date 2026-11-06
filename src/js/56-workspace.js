// Workspace: side-panel tabs, export menu, looks strip (presets + saved looks with live thumbnails), undo/redo.

// ---- tabs (Map · Highlight · Look · Page) ----
const TABS = ['map', 'highlight', 'look', 'page'];
function setTab(id) {
  if (!TABS.includes(id)) id = 'map';
  localStorage.setItem('mobomap.tab', id);
  document.querySelectorAll('.rail button').forEach((b) => b.classList.toggle('on', b.dataset.tab === id));
  document.querySelectorAll('aside .tab').forEach((p) => p.classList.toggle('on', p.dataset.tab === id));
  document.querySelector('aside').scrollTop = 0;
}

// ---- export menu ----
function toggleExportMenu(e) {
  e.stopPropagation();
  document.getElementById('expMenu').classList.toggle('open');
}
document.addEventListener('click', () => document.getElementById('expMenu').classList.remove('open'));

// ---- looks: built-in presets plus the user's saved looks (style + effects + frame + surface; never the profile) ----
const LOOKS_KEY = 'mobomap.looks';
function userLooks() {
  try {
    return JSON.parse(localStorage.getItem(LOOKS_KEY) || '[]').filter((l) => l && l.id && l.fx);
  } catch {
    return [];
  }
}
function allLooks() {
  const pre = FX_PRESET_IDS.map((id) => ({ id, name: t('pre_' + id), builtin: true, ...FX_PRESETS[id] }));
  pre[0].name = t('look_plain');
  return pre.concat(userLooks().map((l) => ({ ...l, builtin: false })));
}
function lookOf(id) {
  return allLooks().find((l) => l.id === id);
}
function applyLook(id) {
  const l = lookOf(id);
  if (!l) return;
  if (l.builtin) {
    applyFxPreset(id);
    if (id === 'none') S.fx.preset = 'none';
  } else {
    S.fx = Object.assign({}, S.fx, { fx: l.fx.slice(), frame: l.frame, preset: id });
    if (l.surface) S.fx.surface = l.surface;
    if (l.style && STYLES.some((s) => s.id === l.style)) S.style = l.style;
    ui();
    render();
  }
}
function saveLook() {
  const name = (prompt(t('look_name'), t('look_mine') + ' ' + (userLooks().length + 1)) || '').trim();
  if (!name) return;
  const id = 'u' + Date.now().toString(36);
  const looks = userLooks();
  looks.push({ id, name, fx: S.fx.fx.slice(), frame: S.fx.frame, surface: S.fx.surface, style: S.style });
  localStorage.setItem(LOOKS_KEY, JSON.stringify(looks));
  S.fx.preset = id;
  THUMB.key = '';
  ui();
  render();
}
function deleteLook(id, e) {
  e.stopPropagation();
  localStorage.setItem(LOOKS_KEY, JSON.stringify(userLooks().filter((l) => l.id !== id)));
  if (S.fx.preset === id) S.fx.preset = '';
  THUMB.key = '';
  renderLooks();
}
function renderLooks() {
  const el = document.getElementById('looks');
  if (!el) return;
  el.innerHTML =
    allLooks()
      .map(
        (l) =>
          `<button class="look ${S.fx.preset === l.id ? 'on' : ''}" onclick="applyLook('${l.id}')" title="${esc(l.name)}"><span class="lthumb"><img data-look="${l.id}" alt="" ${THUMB.img[l.id] ? `src="${THUMB.img[l.id]}"` : ''}/></span><span class="lname">${esc(l.name)}</span>${l.builtin ? '' : `<span class="ldel" onclick="deleteLook('${l.id}', event)" title="${esc(t('delete'))}">×</span>`}</button>`,
      )
      .join('') +
    `<button class="look add" onclick="saveLook()"><span class="lthumb">＋</span><span class="lname">${esc(t('look_save'))}</span></button>`;
}
// Thumbnails show the current map (area, groups, profile, format) in each look. They are rendered into a
// detached SVG one by one, so the page never flickers, and redone when the map content changes.
const THUMB = { key: '', img: {}, queue: [], timer: 0 };
function thumbKey() {
  return JSON.stringify([
    S.country,
    S.focus,
    S.layout,
    S.ds,
    S.attr,
    S.proj,
    S.far,
    S.lang,
    S.groups.map((g) => [g.color, g.sel.size, [...g.hl]]),
    S.partners.length,
    S.zoom,
    S.focusHide,
    S.dsColours,
    S.guard,
    CK.map((k) => document.getElementById(k).checked),
    ['title', 'sub', 'titlePos', 'subPos', 'frameSel', 'footerLabel', 'autoText'].map((k) => {
      const el = document.getElementById(k);
      return el.type === 'checkbox' ? el.checked : el.value;
    }),
  ]);
}
function scheduleThumbs() {
  const k = thumbKey();
  if (k === THUMB.key) return;
  THUMB.key = k;
  clearTimeout(THUMB.timer);
  THUMB.timer = setTimeout(() => {
    THUMB.queue = allLooks().map((l) => l.id);
    nextThumb();
  }, 700);
}
let thumbSvg = null;
function nextThumb() {
  const id = THUMB.queue.shift();
  if (!id) return;
  const l = lookOf(id);
  if (!l) return nextThumb();
  if (!thumbSvg) thumbSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  // apply the look temporarily, draw it off-page, restore
  const keep = { style: S.style, fx: S.fx, fxl: FXL };
  S.fx = Object.assign({}, S.fx, { fx: l.fx.slice(), frame: l.frame, surface: l.surface || S.fx.surface });
  if (l.style && STYLES.some((s) => s.id === l.style)) S.style = l.style;
  try {
    render(thumbSvg);
  } finally {
    S.style = keep.style;
    S.fx = keep.fx;
    FXL = keep.fxl;
  }
  thumbSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  thumbSvg.setAttribute('width', W);
  thumbSvg.setAttribute('height', H);
  const url = URL.createObjectURL(new Blob([thumbSvg.outerHTML], { type: 'image/svg+xml' }));
  const img = new Image();
  img.onload = img.onerror = () => {
    if (img.naturalWidth) {
      const c = document.createElement('canvas');
      c.width = 176;
      c.height = Math.round((176 * H) / W);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      THUMB.img[id] = c.toDataURL('image/jpeg', 0.8);
      const tag = document.querySelector(`#looks img[data-look="${id}"]`);
      if (tag) tag.src = THUMB.img[id];
    }
    URL.revokeObjectURL(url);
    setTimeout(nextThumb, 30);
  };
  img.src = url;
}

// ---- undo / redo: snapshots of the project state, taken shortly after changes ----
const HIST = { list: [], pos: -1, timer: 0, restoring: false };
function snapState() {
  const p = projectState();
  delete p.saved;
  return JSON.stringify(p);
}
function pushHistory() {
  const s = snapState();
  if (s === HIST.list[HIST.pos]) return;
  HIST.list = HIST.list.slice(0, HIST.pos + 1);
  HIST.list.push(s);
  if (HIST.list.length > 80) HIST.list.shift();
  HIST.pos = HIST.list.length - 1;
  histButtons();
}
function restore(pos) {
  if (pos < 0 || pos >= HIST.list.length) return;
  HIST.pos = pos;
  HIST.restoring = true;
  try {
    loadProject(JSON.parse(HIST.list[pos]), true);
  } finally {
    HIST.restoring = false;
  }
  histButtons();
}
function flushHistory() {
  if (!HIST.timer) return;
  clearTimeout(HIST.timer);
  HIST.timer = 0;
  pushHistory();
}
const undo = () => {
  flushHistory();
  restore(HIST.pos - 1);
};
const redo = () => {
  flushHistory();
  restore(HIST.pos + 1);
};
function histButtons() {
  const u = document.getElementById('undoBtn'),
    r = document.getElementById('redoBtn');
  if (u) u.disabled = HIST.pos <= 0;
  if (r) r.disabled = HIST.pos >= HIST.list.length - 1;
}
document.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey)) return;
  const tag = (document.activeElement && document.activeElement.tagName) || '';
  if (/INPUT|TEXTAREA|SELECT/.test(tag) && document.activeElement.type !== 'checkbox') return;
  const k = e.key.toLowerCase();
  if (k === 'z' && !e.shiftKey) {
    e.preventDefault();
    undo();
  } else if (k === 'y' || (k === 'z' && e.shiftKey)) {
    e.preventDefault();
    redo();
  }
});

// called at the end of every page render
function afterRender() {
  renderLooks();
  scheduleThumbs();
  const di = document.getElementById('dataInfo');
  if (di) {
    const a = attrDef();
    di.textContent = a ? t(a.n) : t('off');
  }
  const dsum = document.getElementById('displayInfo');
  if (dsum) {
    const on = ['labels', 'showCities', 'showNeighbours', 'relief', 'detail', 'focusHide'].filter(
      (k) => document.getElementById(k).checked,
    ).length;
    dsum.textContent = on + '/6';
  }
  if (HIST.restoring) return;
  clearTimeout(HIST.timer);
  HIST.timer = setTimeout(
    () => {
      HIST.timer = 0;
      pushHistory();
    },
    HIST.list.length ? 450 : 0,
  );
}

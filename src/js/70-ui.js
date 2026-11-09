function ui() {
  if (!DS[S.ds]) S.ds = DSORDER[0];
  applyTheme();
  const D = DS[S.ds];
  const sel = document.getElementById('ds');
  const grp = { builtin: t('grp_builtin'), private: t('grp_private'), file: t('grp_file'), user: t('grp_user') };
  sel.innerHTML = Object.keys(grp)
    .map((g) => {
      const items = DSORDER.filter((i) => (g === 'private' ? DS[i].private : DS[i].source === g && !DS[i].private));
      return items.length
        ? `<optgroup label="${grp[g]}">` +
            items.map((k) => `<option value="${k}">${esc(loc(DS[k].name))}</option>`).join('') +
            '</optgroup>'
        : '';
    })
    .join('');
  sel.value = S.ds;
  document.getElementById('dsSw').innerHTML =
    D.swatches.map((c) => `<span class="sw" style="background:${c}" title="${c}"></span>`).join('') +
    (D.company.link
      ? ` <a href="${esc(D.company.link)}" target="_blank" rel="noopener" style="font-size:11px;color:var(--accent2)">${esc(loc(D.company.name))} ↗</a>`
      : '');
  document.getElementById('dsName').textContent = loc(D.name);
  document.getElementById('dsName').title = loc(D.note) || (D.source === 'user' ? t('grp_user') : '');
  document.getElementById('dsDel').style.display = D.source === 'user' ? '' : 'none';
  // "Colour by": attributes grouped by category (Geography, Economy, Society, Health, Politics, Environment)
  const attrs = ATTRS[S.map] || [];
  document.getElementById('attrSel').innerHTML =
    `<option value="none">${esc(t('colour_by'))}: ${esc(t('none'))}</option>` +
    ATTR_CATS.map((c) => {
      const list = attrs.filter((a) => a.cat === c);
      return list.length
        ? `<optgroup label="${esc(t('cat_' + c))}">` +
            list.map((a) => `<option value="${a.id}">${esc(t(a.n))}</option>`).join('') +
            '</optgroup>'
        : '';
    }).join('');
  document.getElementById('attrSel').value = S.attr;
  document.getElementById('mapInfo').textContent =
    (S.country ? countryName(S.country) + ' · ' : '') + GEO.units.length + ' ' + t(MAPS[S.map].unitKey);
  document.getElementById('attrBtn').style.display = S.attr === 'none' ? 'none' : '';
  const ps = document.getElementById('projSel');
  ps.innerHTML = GEO.geo
    ? Object.entries(PROJS)
        .filter(([k, p]) => !p.local || S.country || S.focus)
        .map(
          ([k, p]) => `<option value="${k}">${esc(t('projection'))}: ${p.local ? esc(t('proj_local')) : p.n}</option>`,
        )
        .join('')
    : `<option>${esc(t('projection'))}: UTM 32N</option>`;
  ps.disabled = !GEO.geo;
  fxUI();
  document.getElementById('dsColours').checked = !!S.dsColours;
  document.getElementById('guard').checked = S.guard !== false;
  const far = document.getElementById('farSel');
  far.style.display = farParts(S.country ? countryData(S.country) : DATA.world) ? '' : 'none';
  far.value = S.far;
  if (GEO.geo) ps.value = S.proj;
  const fsel = document.getElementById('focusSel2');
  const cmp = (a, b) => a[1].localeCompare(b[1], S.lang);
  const ctry = [...new Set([...Object.keys(DATA.adm1), 'DNK'])].map((c) => [c, countryName(c)]).sort(cmp);
  const og = (label, arr) =>
    arr.length
      ? `<optgroup label="${esc(label)}">` +
        arr.map(([v, n]) => `<option value="${esc(v)}">${esc(n)}</option>`).join('') +
        '</optgroup>'
      : '';
  let h = '';
  if (S.map === 'world') {
    h +=
      `<option value="">${esc(t('focus'))}: ${esc(t('world'))}</option>` +
      og(t('continents'), Object.entries(GEO.groups)) +
      og(
        t('countries_drill'),
        ctry.map(([c, n]) => ['c:' + c, n]),
      );
  } else {
    h += `<option value="world">← ${esc(t('world'))}</option><option value="">${esc(t('focus'))}: ${esc(countryName(S.country))} – ${esc(t('whole_country'))}</option>`;
    const gs = Object.entries(GEO.groups).filter(([r]) => r !== '_');
    if (gs.length > 1) h += og(t('regions'), gs.sort(cmp));
    const cl = cityList();
    if (cl.length)
      h += og(
        t('focus_cities'),
        cl
          .slice()
          .sort((a, b) => b.cap - a.cap || b.pop - a.pop)
          .map((c) => [CITY_PREFIX + c.n, c.n]),
      );
    h += og(t('zoom_unit'), GEO.units.map((k) => [k.c, nm(k)]).sort(cmp));
    h += og(
      t('other_countries'),
      ctry.filter(([c]) => c !== S.country).map(([c, n]) => ['c:' + c, n]),
    );
  }
  fsel.innerHTML = h;
  fsel.value = S.focus;
  const presets = Object.entries(GEO.groups).filter(([r]) => r !== '_');
  const rp = document.getElementById('regionPresets');
  rp.style.display = presets.length > 1 ? '' : 'none';
  rp.innerHTML =
    `<option value="">${esc(t('add_region'))}</option>` +
    presets.map(([r, n]) => `<option value="${esc(r)}">${esc(n)}</option>`).join('');
  document.getElementById('langSel').innerHTML = Object.keys(T)
    .map((l) => `<option value="${l}">${LANGN[l]}</option>`)
    .join('');
  document.getElementById('langSel').value = S.lang;
  document.getElementById('layouts').innerHTML = LAYOUTS.map(
    (l) =>
      `<button class="tile ${S.layout === l.id ? 'on' : ''}" onclick="S.layout='${l.id}';ui();render()"><b>${t('lay_' + l.id)}</b><i>${l.d}</i></button>`,
  ).join('');
  // section summaries (visible when a section is collapsed)
  document.getElementById('layoutInfo').textContent = t('lay_' + S.layout) + ' · ' + W + '×' + H;
  document.getElementById('styleNo').textContent = t('st_' + S.style);
  document.getElementById('styles').innerHTML = STYLES.map(
    (s) =>
      `<button class="tile ${S.style === s.id ? 'on' : ''}" title="${esc(t('st_' + s.id + '_d'))}" onclick="S.style='${s.id}';ui();render()"><b>${esc(t('st_' + s.id))}</b></button>`,
  ).join('');
  const cols = D.highlight;
  // Groups: the active one fully expanded, the others as one compact line; none at all is allowed
  const swatch = (g) =>
    g.hl.has('hatch')
      ? `repeating-linear-gradient(45deg,${g.color} 0 3px,transparent 3px 6px)`
      : g.hl.has('fill') || g.hl.has('tint') || g.hl.has('dots')
        ? g.color
        : 'transparent';
  const removeBtn = (i) =>
    `<button class="x" title="${esc(t('remove_group'))}" onclick="event.stopPropagation();removeGroup(${i})">×</button>`;
  const fullCard = (g, i) => `<div class="grp active">
  <div class="hd"><input type="radio" name="act" checked title="${esc(t('active_group'))}"><input type="text" value="${esc(g.name)}" oninput="S.groups[${i}].name=this.value;render()" placeholder="${esc(t('group_name'))}"><span class="cnt">${g.sel.size}</span>${removeBtn(i)}</div>
  <textarea rows="2" id="list${i}" oninput="fromText(${i})" placeholder="${esc(t('ph_units').replace('{ex}', MAPS[S.map].ex))}">${esc(g.text != null ? g.text : [...g.sel].map((c) => nm(GEO.units.find((k) => k.c === c))).join(', '))}</textarea>
  <div class="warn" id="warn${i}" style="${g.bad.length ? 'display:block' : ''}">${g.bad.length ? t('not_recognised') + ': ' + esc(g.bad.join(', ')) : ''}</div>
  <div class="row" style="margin-top:6px">${cols.map((c) => `<button class="sw sm ${g.color === c ? 'on' : ''}" style="background:${c}" title="${c}" onclick="event.stopPropagation();S.groups[${i}].color='${c}';ui();render()"></button>`).join('')}<input type="color" value="${g.color}" title="${esc(t('custom_colour'))}" style="width:26px;height:22px;padding:0;border:1px solid var(--line);border-radius:6px;background:none" onclick="event.stopPropagation()" oninput="S.groups[${i}].color=this.value;render()"></div>
  <div class="row" style="margin-top:6px">${HLS.map((h) => `<button class="chip sm ${g.hl.has(h.id) ? 'on' : ''}" title="${esc(t('hl_' + h.id + '_t'))}" onclick="event.stopPropagation();toggleHL(${i},'${h.id}')">${esc(t('hl_' + h.id))}</button>`).join('')}</div>
 </div>`;
  const compact = (g, i) =>
    `<div class="grp compact" title="${esc(t('active_group'))}" onclick="S.active=${i};ui();render()"><span class="dot" style="background:${swatch(g)};border-color:${g.color}"></span><span class="nm">${esc(g.name)}</span><span class="cnt">${g.sel.size}</span>${removeBtn(i)}</div>`;
  document.getElementById('groups').innerHTML = S.groups.length
    ? S.groups.map((g, i) => (i === S.active ? fullCard(g, i) : compact(g, i))).join('')
    : `<div class="groups-empty">${esc(t('no_groups'))}</div>`;
  S.groups.forEach((g) => {
    if (!g.color) g.color = cols[Math.min(S.groups.indexOf(g), cols.length - 1)];
  });
  document.getElementById('partners').innerHTML =
    S.partners
      .map(
        (p, i) =>
          `<div class="partner">${p.logo && p.logo.src ? `<img src="${p.logo.src}" alt="">` : '<span style="flex:0;width:70px;text-align:center;color:var(--mute)">(' + esc(t('text_only')) + ')</span>'}<span>${esc(p.name)}${p.link ? ` · <a href="${esc(p.link)}" target="_blank" rel="noopener" style="color:var(--accent2)">link</a>` : ''}</span><button class="x chip sm" onclick="removePartner(${i})">×</button></div>`,
      )
      .join('') || '<p class="note" style="margin:0">' + esc(t('no_partners')) + '</p>';
  document.getElementById('partnerCount').textContent = S.partners.length + ' ' + t('partners');
}
function setDS(v) {
  // groups using the previous profile's palette take the matching colour of the new one; custom colours stay
  const prev = DS[S.ds];
  if (prev && prev !== DS[v])
    S.groups.forEach((g) => {
      const i = prev.highlight.findIndex((c) => c.toLowerCase() === String(g.color).toLowerCase());
      if (i >= 0) g.color = DS[v].highlight[Math.min(i, DS[v].highlight.length - 1)];
    });
  S.ds = v;
  const D = DS[v];
  const d = D.defaults;
  if (d && !document.getElementById('autoText').checked) {
    if (d.title != null) document.getElementById('title').value = loc(d.title);
    if (d.sub != null) document.getElementById('sub').value = loc(d.sub);
  }
  S.partners = D.partners.map((p) => ({ name: p.name, link: p.link, logo: Object.assign({}, p.logo) }));
  const fl = document.getElementById('footerLabel');
  fl.value = loc(D.footer.label);
  fl.dataset.auto = '1';
  ui();
  render();
}
function toggleHL(i, id) {
  const g = S.groups[i];
  if (g.hl.has(id)) {
    if (g.hl.size > 1) g.hl.delete(id);
    else return toast(t('ts_min_one'));
  } else {
    g.hl.add(id);
    const ex = ['fill', 'hatch', 'dots', 'tint'];
    if (ex.includes(id)) ex.filter((x) => x !== id).forEach((x) => g.hl.delete(x));
  }
  ui();
  render();
}
function addGroup() {
  const D = DS[S.ds];
  const i = S.groups.length;
  const defaults = [['fill', 'glow'], ['hatch'], ['dots'], ['tint', 'outline'], ['outline']];
  S.groups.push(
    newGroup(
      t('group') + ' ' + (i + 1),
      defaults[i % defaults.length],
      D.highlight[Math.min(i, D.highlight.length - 1)],
    ),
  );
  S.active = i;
  ui();
  render();
}
function removeGroup(i) {
  S.groups.splice(i, 1);
  S.active = Math.max(0, Math.min(S.active, S.groups.length - 1));
  ui();
  render();
}
function fromText(i) {
  const g = S.groups[i];
  const raw = document.getElementById('list' + i).value;
  g.text = raw;
  const toks = raw
    .split(/[\n,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  g.sel = new Set();
  g.bad = [];
  for (const t of toks) {
    const c = lookup(t);
    if (c) {
      S.groups.forEach((o, j) => {
        if (j !== i) o.sel.delete(c);
      });
      g.sel.add(c);
    } else g.bad.push(t);
  }
  const w = document.getElementById('warn' + i);
  w.style.display = g.bad.length ? 'block' : 'none';
  w.textContent = g.bad.length ? t('not_recognised') + ': ' + g.bad.join(', ') : '';
  S.groups.forEach((o, j) => {
    if (j !== i) {
      o.text = null;
      const el = document.getElementById('list' + j);
      if (el) el.value = [...o.sel].map((c) => nm(GEO.units.find((k) => k.c === c))).join(', ');
    }
  });
  document.querySelector(`#groups .grp:nth-child(${i + 1}) .cnt`).textContent = g.sel.size;
  render();
}
function syncText() {
  S.groups.forEach((g) => {
    g.text = null;
    g.bad = [];
  });
}
function setMap(id) {
  const prevW = S.map === 'world';
  if (prevW) S.worldProj = S.proj;
  setData(id);
  S.attr = 'none';
  S.focusHide = false;
  document.getElementById('focusHide').checked = false;
  S.proj =
    S.map === 'world'
      ? S.worldProj && !PROJS[S.worldProj].local
        ? S.worldProj
        : DEFAULT_PROJ
      : GEO.geo
        ? 'local'
        : S.proj;
  // keep the user's groups (names, colours, modes – possibly none) but clear selections: unit codes differ per map
  S.groups = S.groups.map((g) => newGroup(g.name, [...g.hl], g.color));
  // example selection only the first time a map is opened in this session
  const key = S.country || 'world';
  if (!S.visited.has(key) && S.groups.length) MAPS[S.map].defaults.forEach((c) => S.groups[0].sel.add(c));
  S.visited.add(key);
  S.active = Math.min(S.active, Math.max(0, S.groups.length - 1));
  ui();
  render();
}
// The active group, created on demand when there are none (so a click or preset is never lost)
function activeGroup() {
  if (!S.groups.length) {
    const D = DS[S.ds];
    S.groups.push(newGroup(t('group') + ' 1', ['fill'], D.highlight[0]));
    S.active = 0;
  }
  return S.groups[Math.min(S.active, S.groups.length - 1)];
}
function clearGroups() {
  S.groups = [];
  S.active = 0;
  ui();
  render();
}
function setFocus(v) {
  if (v === 'world') return setMap('world');
  if (v.startsWith('c:')) return setMap(v.slice(2));
  S.focus = v;
  S.zoom = { k: 1, x: 0, y: 0 };
  LC = null;
  ui();
  render();
}
function presetRegionActive(r) {
  if (!r) return;
  const g = activeGroup();
  const list = GEO.units.filter((k) => k.r === r).map((k) => k.c);
  list.forEach((c) => {
    S.groups.forEach((o) => o.sel.delete(c));
    g.sel.add(c);
  });
  syncText();
  ui();
  render();
}
function toast(m) {
  const t = document.getElementById('toast');
  t.textContent = m;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 2800);
}
const svg = document.getElementById('svg'),
  tip = document.getElementById('tip');
// Ctrl/Cmd+click = navigate instead of select:
//   world view: open the country's regions (or zoom to it if no detail exists)
//   country view: zoom to the clicked unit; on empty sea step out (unit -> whole country -> world)
const hasDetail = (iso) => iso === 'DNK' || !!DATA.adm1[iso];
function focusClick(c) {
  if (!c) return setFocus(S.focus ? '' : S.country ? 'world' : '');
  if (S.map === 'world') return setFocus(hasDetail(c) ? 'c:' + c : c);
  setFocus(S.focus === c ? '' : c);
}
svg.addEventListener('click', (e) => {
  const p = e.target.closest('.k');
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    tip.style.display = 'none';
    return focusClick(p && p.dataset.c);
  }
  if (!p) return;
  const c = p.dataset.c;
  const g = activeGroup();
  if (g.sel.has(c)) g.sel.delete(c);
  else {
    S.groups.forEach((o) => o.sel.delete(c));
    g.sel.add(c);
  }
  syncText();
  ui();
  render();
});
// ---- wheel zoom (around the cursor) and drag pan; "Reset zoom" or a new focus/country resets ----
function svgPoint(e) {
  const r = svg.getBoundingClientRect();
  if (!r.width || !r.height) return [W / 2, H / 2];
  return fxToContent([((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]);
}
let zoomRaf = 0;
function zoomChanged() {
  const z = S.zoom;
  document.getElementById('wrap').classList.toggle('zoomed', z.k !== 1 || !!z.x || !!z.y);
  if (!zoomRaf)
    zoomRaf = requestAnimationFrame(() => {
      zoomRaf = 0;
      render();
    });
}
function resetZoom() {
  S.zoom = { k: 1, x: 0, y: 0 };
  zoomChanged();
}
svg.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    const [sx, sy] = svgPoint(e);
    const z = S.zoom;
    let k2 = Math.min(40, Math.max(0.5, z.k * Math.exp(-e.deltaY * 0.0015)));
    if (Math.abs(k2 - 1) < 0.03) k2 = 1;
    // keep the point under the cursor in place: screen = unzoomed * k + offset
    const bx = (sx - z.x) / z.k,
      by = (sy - z.y) / z.k;
    S.zoom = { k: k2, x: sx - bx * k2, y: sy - by * k2 };
    zoomChanged();
  },
  { passive: false },
);
let drag = null,
  dragged = false;
svg.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  drag = { p: svgPoint(e), z: Object.assign({}, S.zoom) };
  dragged = false;
});
window.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const [x, y] = svgPoint(e);
  const dx = x - drag.p[0],
    dy = y - drag.p[1];
  if (!dragged && Math.hypot(dx, dy) < 6) return;
  dragged = true;
  tip.style.display = 'none';
  document.getElementById('wrap').classList.add('panning');
  S.zoom = { k: drag.z.k, x: drag.z.x + dx, y: drag.z.y + dy };
  zoomChanged();
});
window.addEventListener('pointerup', () => {
  drag = null;
  document.getElementById('wrap').classList.remove('panning');
});
// a drag is not a click (capture phase: runs before the selection handler)
svg.addEventListener(
  'click',
  (e) => {
    if (dragged) {
      e.stopImmediatePropagation();
      dragged = false;
    }
  },
  true,
);
svg.addEventListener('mousemove', (e) => {
  const p = e.target.closest('.k');
  if (!p) {
    tip.style.display = 'none';
    return;
  }
  const k = GEO.units.find((k) => k.c === p.dataset.c);
  const gi = groupOf(k.c);
  const nav =
    S.map === 'world' && hasDetail(k.c) ? 'tip_ctrl_open' : S.focus === k.c ? 'tip_ctrl_out' : 'tip_ctrl_zoom';
  tip.innerHTML = `<b>${nm(k)}</b> · ${GEO.groups[k.r]} · ${gi >= 0 ? t('tip_in') + ' "' + esc(S.groups[gi].name) + '"' : t('tip_click') + ' "' + esc(S.groups.length ? S.groups[S.active].name : t('new_group_short')) + '"'}<br><span style="opacity:.75">${esc(t(nav))}</span>`;
  tip.style.display = 'block';
  tip.style.left = e.clientX + 14 + 'px';
  tip.style.top = e.clientY - 10 + 'px';
});
// The hover outline is a separate, non-clickable overlay. Never move the hovered path in the DOM:
// mousedown and mouseup would then hit different elements and the click would never fire.
function hoverLine(p) {
  let g = document.getElementById('hoverwrap');
  if (!p) {
    if (g) g.remove();
    return;
  }
  if (!g || g.parentNode !== svg) {
    // a clipped group (stays on the sheet), holding the outline path
    g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.id = 'hoverwrap';
    const h = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    h.id = 'hoverline';
    g.appendChild(h);
  }
  if (document.getElementById('fxclip')) g.setAttribute('clip-path', 'url(#fxclip)');
  const h = g.firstChild;
  h.setAttribute('d', p.getAttribute('d'));
  // same placement as the unit: the frame/sheet transform, then the unit's own (raised highlight)
  const t = [
    FXL.active ? 'translate(' + FXL.tx + ',' + FXL.ty + ') scale(' + FXL.s + ')' : '',
    p.parentNode.getAttribute('transform') || '',
  ]
    .join(' ')
    .trim();
  if (t) h.setAttribute('transform', t);
  else h.removeAttribute('transform');
  svg.appendChild(g);
}
svg.addEventListener('mouseleave', () => {
  tip.style.display = 'none';
  hoverLine(null);
});
svg.addEventListener('mouseover', (e) => {
  hoverLine(e.target.closest('.k'));
});

// ---- collapsible panel sections (open/closed remembered per browser) ----
const SEC_KEY = 'mobomap.sections';
const SEC_DEFAULT_OPEN = ['map', 'groups'];
function secState() {
  try {
    return JSON.parse(localStorage.getItem(SEC_KEY)) || null;
  } catch (e) {
    return null;
  }
}
function applySections() {
  const open = secState() || SEC_DEFAULT_OPEN;
  document.querySelectorAll('.sec').forEach((s) => s.classList.toggle('closed', !open.includes(s.dataset.sec)));
}
function toggleSec(id) {
  const el = document.querySelector(`.sec[data-sec="${id}"]`);
  el.classList.toggle('closed');
  const open = [...document.querySelectorAll('.sec')]
    .filter((s) => !s.classList.contains('closed'))
    .map((s) => s.dataset.sec);
  localStorage.setItem(SEC_KEY, JSON.stringify(open));
}

// ---- UI light/dark mode: 'auto' follows the operating system; the choice is remembered ----
const UI_MODES = ['auto', 'light', 'dark'];
const UI_ICONS = { auto: '◐', light: '☀', dark: '☾' };
const sysDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
function uiMode() {
  const m = localStorage.getItem('mobomap.ui');
  return UI_MODES.includes(m) ? m : 'auto';
}
function applyUiMode() {
  const m = uiMode();
  const fixed = UI_STYLES[uiStyle()];
  const dark = fixed ? fixed.dark : m === 'dark' || (m === 'auto' && sysDark && sysDark.matches);
  document.documentElement.dataset.ui = dark ? 'dark' : 'light';
  const us = document.getElementById('uiStyle');
  if (us) {
    us.innerHTML = UI_STYLE_IDS.map((id) => `<option value="${id}">${esc(t('uis_' + id))}</option>`).join('');
    us.value = uiStyle();
  }
  const b = document.getElementById('uiMode');
  // light/dark only applies when the UI follows the profile
  b.style.display = fixed ? 'none' : '';
  b.textContent = UI_ICONS[m];
  b.title = t('ui_mode') + ': ' + t('ui_' + m);
}
function cycleUiMode() {
  localStorage.setItem('mobomap.ui', UI_MODES[(UI_MODES.indexOf(uiMode()) + 1) % UI_MODES.length]);
  applyUiMode();
}
if (sysDark) sysDark.addEventListener('change', applyUiMode);

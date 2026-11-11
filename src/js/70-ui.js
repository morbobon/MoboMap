function ui() {
  if (!DS[S.ds]) S.ds = DSORDER[0];
  applyTheme();
  syncDetailLevel();
  syncCityMin();
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
  // the same picker in the Brand tab
  const sel2 = document.getElementById('ds2');
  sel2.innerHTML = sel.innerHTML;
  sel2.value = S.ds;
  document.getElementById('dsSw').innerHTML =
    D.swatches.map((c) => `<span class="sw" style="background:${c}" title="${c}"></span>`).join('') +
    (D.company.link
      ? ` <a href="${esc(D.company.link)}" target="_blank" rel="noopener" style="font-size:11px;color:var(--accent2)">${esc(loc(D.company.name))} ↗</a>`
      : '');
  document.getElementById('dsName').textContent = loc(D.name);
  document.getElementById('dsName').title = loc(D.note) || (D.source === 'user' ? t('grp_user') : '');
  document.getElementById('dsDel').style.display = D.source === 'user' ? '' : 'none';
  // "Colour by": attributes grouped by category (Geography, Economy, Society, Health, Politics, Environment)
  const attrs = (ATTRS[S.map] || []).filter(hasStat); // statistics without data here are left out
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
  attrScopeUI();
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
  textFxUI();
  document.getElementById('dsColours').checked = !!S.dsColours;
  document.getElementById('guard').checked = S.guard !== false;
  const far = document.getElementById('farSel');
  far.style.display = farParts(S.country ? countryData(S.country) : DATA.world) ? '' : 'none';
  far.value = S.far;
  if (GEO.geo) ps.value = S.proj;
  const fsel = document.getElementById('focusSel2');
  const cmp = (a, b) => a[1].localeCompare(b[1], S.lang);
  const ctry = [...new Set([...Object.keys(DATA.adm1i), 'DNK'])].map((c) => [c, countryName(c)]).sort(cmp);
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
    (l, i) =>
      (i && LAYOUTS[i - 1].g === l.g ? '' : `<div class="laygrp">${esc(t('lay_g_' + l.g))}</div>`) +
      `<button class="tile ${S.layout === l.id ? 'on' : ''}" onclick="S.layout='${l.id}';ui();render()"><b>${l.n}</b><i>${esc(t('lay_' + l.o))}</i></button>`,
  ).join('');
  // section summaries (visible when a section is collapsed)
  document.getElementById('layoutInfo').textContent = layoutName(layoutOf(S.layout));
  document.getElementById('styleNo').textContent = t('st_' + S.style);
  document.getElementById('styles').innerHTML = STYLES.map(
    (s) =>
      `<button class="tile ${S.style === s.id ? 'on' : ''}" title="${esc(t('st_' + s.id + '_d'))}" onclick="setStyle('${s.id}')"><b>${esc(t('st_' + s.id))}</b></button>`,
  ).join('');
  const cols = D.highlight;
  // Groups: the active one fully expanded, the others as one compact line; none at all is allowed
  const swatch = (g) =>
    g.hl.has('hatch')
      ? `repeating-linear-gradient(45deg,${g.color} 0 3px,transparent 3px 6px)`
      : g.hl.has('cross')
        ? `repeating-linear-gradient(45deg,${g.color} 0 2px,transparent 2px 6px),repeating-linear-gradient(-45deg,${g.color} 0 2px,transparent 2px 6px)`
        : g.hl.has('fill') || g.hl.has('tint') || g.hl.has('dots')
          ? g.color
          : 'transparent';
  const removeBtn = (i) =>
    `<button class="x" title="${esc(t('remove_group'))}" onclick="event.stopPropagation();removeGroup(${i})">×</button>`;
  const onBox = (g, i) =>
    `<input type="checkbox" class="on" ${g.off ? '' : 'checked'} title="${esc(t('grp_on_t'))}" onclick="event.stopPropagation()" onchange="setGroupOn(${i},this.checked)">`;
  // a card's drag handle: dropped on another card the group becomes its subgroup (33-group-tree.js)
  const grip = (i) =>
    `<span class="grip" draggable="true" title="${esc(t('grp_drag_t'))}" ondragstart="event.stopPropagation();document.body.classList.add('grpdrag');event.dataTransfer.setData('text/x-grp','${i}');event.dataTransfer.effectAllowed='move'">⋮⋮</span>`;
  const drop = (i) =>
    ` ondragover="if(event.dataTransfer.types.includes('text/x-grp')){event.preventDefault();this.classList.add('dropto')}" ondragleave="this.classList.remove('dropto')" ondrop="event.preventDefault();event.stopPropagation();this.classList.remove('dropto');nestGroup(+event.dataTransfer.getData('text/x-grp'),${i})"`;
  const cls = (g) => (g.parent ? ' sub' : '') + (isSuper(g) ? ' super' : '') + (g.off ? ' off' : '');
  const opt = (i, key, on, label) =>
    `<label class="gopt"><input type="checkbox" ${on ? 'checked' : ''} onchange="S.groups[${i}].${key}=this.checked;render()"> ${esc(t(label))}</label>`;
  const fullCard = (g, i) => `<div class="grp ${i === S.active ? 'active' : 'open'}${cls(g)}"${drop(i)}>
  <div class="hd"${i === S.active ? '' : ` onclick="if(event.target===this||event.target.type==='radio')activateGroup(${i})"`}>${grip(i)}<input type="radio" name="act" ${i === S.active ? 'checked' : ''} title="${esc(t('active_group'))}">${onBox(g, i)}<input type="text" value="${esc(g.name)}" oninput="S.groups[${i}].name=this.value;render()" placeholder="${esc(t('group_name'))}"><span class="cnt">${areasOf(g).size}</span>${i === S.active ? '' : `<button class="fold" title="${esc(t('grp_fold'))}" onclick="event.stopPropagation();foldGroup(${i})">▴</button>`}${removeBtn(i)}</div>
  ${
    isSuper(g)
      ? `<div class="note">${esc(t('grp_in_subs').replace('{n}', areasOf(g).size).replace('{m}', subsOf(g).length))}</div>`
      : `<textarea rows="2" id="list${i}" oninput="fromText(${i})" placeholder="${esc(t('ph_units').replace('{ex}', MAPS[S.map].ex))}">${esc(g.text != null ? g.text : [...g.sel].map((c) => nm(GEO.units.find((k) => k.c === c))).join(', '))}</textarea>
  <div class="warn" id="warn${i}" style="${g.bad.length ? 'display:block' : ''}">${g.bad.length ? t('not_recognised') + ': ' + esc(g.bad.join(', ')) : ''}</div>`
  }
  <div class="row" style="margin-top:6px">${cols.map((c) => `<button class="sw sm ${g.color === c ? 'on' : ''}" style="background:${c}" title="${c}" onclick="event.stopPropagation();S.groups[${i}].color='${c}';ui();render()"></button>`).join('')}<input type="color" value="${g.color}" title="${esc(t('custom_colour'))}" style="width:26px;height:22px;padding:0;border:1px solid var(--line);border-radius:6px;background:none" onclick="event.stopPropagation()" oninput="S.groups[${i}].color=this.value;render()"></div>
  <label class="op" title="${esc(t('grp_opacity_t'))}" onclick="event.stopPropagation()"><span>${esc(t('grp_opacity'))}</span><input type="range" min="0.1" max="1" step="0.05" value="${g.op ?? 1}" oninput="S.groups[${i}].op=+this.value;this.nextElementSibling.textContent=Math.round(this.value*100)+'%';render()"><b>${Math.round((g.op ?? 1) * 100)}%</b></label>
  <div class="row" style="margin-top:6px">${HLS.map((h) => `<button class="chip sm ${g.hl.has(h.id) ? 'on' : ''}" title="${esc(t('hl_' + h.id + '_t'))}" onclick="event.stopPropagation();toggleHL(${i},'${h.id}')">${esc(t('hl_' + h.id))}</button>`).join('')}</div>
  <div class="row gopts">${opt(i, 'legend', g.legend !== false, 'grp_legend')}${isSuper(g) ? opt(i, 'sepLegend', g.sepLegend, 'grp_seplegend') : opt(i, 'nameLabel', g.nameLabel, 'grp_namelabel')}</div>
 </div>`;
  const compact = (g, i) =>
    `<div class="grp compact${cls(g)}" title="${esc(t('active_group'))}" onclick="activateGroup(${i})"${drop(i)}>${grip(i)}${onBox(g, i)}<span class="dot" style="background:${swatch(g)};border-color:${g.color}"></span><span class="nm">${esc(g.name)}</span><span class="cnt">${areasOf(g).size}</span>${removeBtn(i)}</div>`;
  // as many groups open as there is room for: the active one always, then the most recently opened;
  // the rest fold to one line only when the panel would otherwise scroll
  const gEl = document.getElementById('groups');
  const html = (open) =>
    S.groups.length
      ? S.groups.map((g, i) => (open.has(i) ? fullCard(g, i) : compact(g, i))).join('') +
        // shown while a card is dragged: dropped here a subgroup becomes a group of its own
        `<div class="grp-root" ondragover="event.preventDefault();this.classList.add('dropto')" ondragleave="this.classList.remove('dropto')" ondrop="event.preventDefault();this.classList.remove('dropto');nestGroup(+event.dataTransfer.getData('text/x-grp'),null)">${esc(t('grp_drop_root'))}</div>`
      : `<div class="groups-empty">${esc(t('no_groups'))}</div>`;
  const want = S.groups.map((_, i) => i).filter((i) => i === S.active || !S.groups[i].closed);
  const spare = want
    .filter((i) => i !== S.active)
    .sort((a, b) => (S.groups[a].openedAt || 0) - (S.groups[b].openedAt || 0));
  const open = new Set(want);
  gEl.innerHTML = html(open);
  const sc = gEl.closest('aside');
  if (sc && gEl.offsetParent !== null && sc.clientHeight)
    while (sc.scrollHeight > sc.clientHeight + 1 && spare.length) {
      open.delete(spare.shift()); // the longest-unused first
      gEl.innerHTML = html(open);
    }
  S.groups.forEach((g) => {
    if (!g.color) g.color = cols[Math.min(S.groups.indexOf(g), cols.length - 1)];
  });
  document.getElementById('addSubBtn').disabled = !S.groups.length;
  partnersUI();
  textsUI();
  lockUI();
}
function setDS(v) {
  if (typeof PENDING_LINK !== 'undefined' && PENDING_LINK && PENDING_LINK.ds !== v) PENDING_LINK = null;
  // groups using the previous profile's palette take the matching colour of the new one; custom colours stay
  const prev = DS[S.ds];
  if (prev && prev !== DS[v])
    S.groups.forEach((g) => {
      const i = prev.highlight.findIndex((c) => c.toLowerCase() === String(g.color).toLowerCase());
      if (i >= 0) g.color = DS[v].highlight[Math.min(i, DS[v].highlight.length - 1)];
    });
  S.ds = v;
  const D = DS[v];
  // the design system's title flair (or back to auto) – a later choice of map style or look can change it again
  textFxFromDS(D);
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
    if (HL_FILLS.includes(id)) HL_FILLS.filter((x) => x !== id).forEach((x) => g.hl.delete(x));
  }
  ui();
  render();
}
function activateGroup(i) {
  const g = S.groups[i];
  if (!g) return;
  S.active = i;
  if (g.parent) groupById(g.parent).lastSub = g.id;
  g.closed = false;
  g.openedAt = Date.now();
  ui();
  render();
}
function foldGroup(i) {
  S.groups[i].closed = true;
  ui();
}
// room changes: tab, window size, panel
let groupFitT = 0;
window.addEventListener('resize', () => {
  clearTimeout(groupFitT);
  groupFitT = setTimeout(() => typeof ui === 'function' && ui(), 150);
});
function setGroupOn(i, on) {
  S.groups[i].off = !on;
  ui();
  render();
}
function addGroup() {
  const D = DS[S.ds];
  const i = S.groups.length;
  const defaults = [['fill', 'glow'], ['hatch'], ['dots'], ['tint', 'outline'], ['outline']];
  S.groups.push(
    newGroup(
      t('group') + ' ' + (S.groups.filter((g) => !g.parent).length + 1), // subgroups do not count
      defaults[i % defaults.length],
      D.highlight[Math.min(i, D.highlight.length - 1)],
    ),
  );
  S.active = i;
  S.groups[i].openedAt = Date.now();
  ui();
  render();
}
// a removed supergroup's subgroups become groups of their own
function removeGroup(i) {
  S.groups.splice(i, 1);
  S.active = Math.max(0, Math.min(S.active, S.groups.length - 1));
  orderGroups();
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
  S.groups = S.groups.map((g) =>
    Object.assign(newGroup(g.name, [...g.hl], g.color, g.op, g.off), {
      id: g.id,
      parent: g.parent,
      legend: g.legend,
      nameLabel: g.nameLabel,
      sepLegend: g.sepLegend,
    }),
  );
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
  return leafOf(S.groups[Math.min(S.active, S.groups.length - 1)]);
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
function toast(m, ms) {
  const t = document.getElementById('toast');
  t.textContent = m;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), ms || 2800);
}
const svg = document.getElementById('svg'),
  tip = document.getElementById('tip');
// Ctrl/Cmd+click = navigate instead of select:
//   world view: open the country's regions (or zoom to it if no detail exists)
//   country view: zoom to the clicked unit; on empty sea step out (unit -> whole country -> world)
const hasDetail = (iso) => iso === 'DNK' || !!DATA.adm1i[iso];
function focusClick(c) {
  if (!c) return setFocus(S.focus ? '' : S.country ? 'world' : '');
  if (S.map === 'world') return setFocus(hasDetail(c) ? 'c:' + c : c);
  setFocus(S.focus === c ? '' : c);
}
// touch: a second tap on the same unit (or sea) within 350 ms is a mouse's Ctrl+click; the first tap's selection
// is undone, so a double-tap only navigates
let lastTap = null;
svg.addEventListener('click', (e) => {
  const p = e.target.closest('.k');
  const touch = lastPointer === 'touch';
  // a locked position: no going to another area
  if (touch && lastTap && lastTap.c === (p ? p.dataset.c : null) && Date.now() - lastTap.t < 350 && !lockOn('pos')) {
    const u = lastTap;
    lastTap = null;
    if (u.c) {
      S.groups.forEach((o) => o.sel.delete(u.c));
      if (S.groups.length > u.groups) S.groups.length = u.groups;
      if (u.gi >= 0) S.groups[u.gi].sel.add(u.c);
      S.active = Math.min(S.active, Math.max(0, S.groups.length - 1));
      syncText();
      ui();
    }
    tip.style.display = 'none';
    return focusClick(u.c);
  }
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    tip.style.display = 'none';
    return lockOn('pos') ? undefined : focusClick(p && p.dataset.c);
  }
  if (!p) {
    lastTap = touch ? { c: null, t: Date.now() } : null;
    return;
  }
  const c = p.dataset.c;
  if (touch) lastTap = { c, t: Date.now(), gi: S.groups.findIndex((o) => o.sel.has(c)), groups: S.groups.length };
  // locked highlights: a click selects nothing
  if (lockOn('hl') || txTesting()) return;
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
let zoomRaf = 0,
  zoomIdle = 0;
// gesture (wheel, drag, pinch): the drawn map is moved and scaled at once and drawn again when the view settles;
// otherwise (buttons, auto-detail) it is drawn on the next frame
function zoomChanged(gesture) {
  const z = S.zoom;
  document.getElementById('wrap').classList.toggle('zoomed', z.k !== 1 || !!z.x || !!z.y);
  clearTimeout(zoomIdle);
  if (gesture && zoomPreview()) {
    zoomIdle = setTimeout(render, 180);
    return;
  }
  if (!zoomRaf)
    zoomRaf = requestAnimationFrame(() => {
      zoomRaf = 0;
      render();
    });
}
// moves and scales the last drawing of the same map to the current zoom; false when there is none
function zoomPreview() {
  const g = document.getElementById('mapz');
  if (!g || !DRAWN || DRAWN.view !== S.map + '|' + S.country + '|' + S.focus) return false;
  // screen = unzoomed * k + offset, so from the drawn zoom z0 to z: scale k/k0, then shift
  const z0 = DRAWN.zoom,
    z = S.zoom,
    s = z.k / z0.k;
  g.setAttribute('transform', `translate(${z.x - z0.x * s} ${z.y - z0.y * s}) scale(${s})`);
  hoverLine(null);
  return true;
}
function resetZoom() {
  S.zoom = { k: 1, x: 0, y: 0 };
  zoomChanged();
}
svg.addEventListener(
  'wheel',
  (e) => {
    // a locked zoom leaves the wheel to the page
    if (lockOn('zoom') === 1) return;
    e.preventDefault();
    // a locked position zooms around the page centre
    const [sx, sy] = lockOn('pos') ? lockCentre() : svgPoint(e);
    const z = S.zoom;
    const step = Math.max(-0.12, Math.min(0.12, -e.deltaY * 0.0006));
    // with auto-detail a country or focus can be zoomed out far enough to step up a level
    const kMin = autoDetailOn() && (S.focus || S.map !== 'world') ? 0.3 : 0.5;
    // small countries need a deep world zoom before they fill half the page and open their regions
    const kMax = autoDetailOn() && S.map === 'world' ? 400 : 40;
    let k2 = Math.min(kMax, Math.max(kMin, z.k * Math.exp(step)));
    if (Math.abs(k2 - 1) < 0.03) k2 = 1;
    if (lockOn('zoom') === 2) k2 = Math.min(S.lock.zr[1], Math.max(S.lock.zr[0], k2));
    if (k2 === z.k) return;
    // keep the point under the cursor in place: screen = unzoomed * k + offset
    const bx = (sx - z.x) / z.k,
      by = (sy - z.y) / z.k;
    S.zoom = { k: k2, x: sx - bx * k2, y: sy - by * k2 };
    // auto-detail: a country filling the page opens its regions, a small map steps up a level
    const under = e.target.closest && e.target.closest('.k');
    if (!lockOn('pos') && typeof autoDetailCheck === 'function' && autoDetailCheck(under && under.dataset.c, k2 > z.k))
      return;
    zoomChanged(true);
  },
  { passive: false },
);
let drag = null,
  dragged = false,
  lastPointer = 'mouse'; // the kind of the last press on the map: 'mouse', 'pen' or 'touch'
// touch: every finger on the map by pointerId; two of them pinch (zoom around their midpoint, and pan)
const fingers = new Map();
let pinch = null,
  pressT = 0;
svg.addEventListener('pointerdown', (e) => {
  lastPointer = e.pointerType;
  if (e.button !== 0) return;
  if (e.pointerType === 'touch') {
    fingers.set(e.pointerId, e);
    clearTimeout(pressT);
    if (fingers.size === 2) return startPinch();
    // long press: the context menu, and no selection when the finger lifts
    const target = e.target,
      cx = e.clientX,
      cy = e.clientY;
    pressT = setTimeout(() => {
      if (!drag || dragged || fingers.size !== 1) return;
      showCtx(target, cx, cy);
      dragged = true;
    }, 500);
  }
  tip.style.display = 'none';
  drag = { p: svgPoint(e), z: Object.assign({}, S.zoom) };
  dragged = false;
});
const midOf = () => {
  const [a, b] = [...fingers.values()];
  return {
    p: svgPoint({ clientX: (a.clientX + b.clientX) / 2, clientY: (a.clientY + b.clientY) / 2 }),
    d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
  };
};
function startPinch() {
  const m = midOf();
  pinch = { p: m.p, d: Math.max(m.d, 1), z: Object.assign({}, S.zoom) };
  drag = null;
  dragged = true;
}
window.addEventListener('pointermove', (e) => {
  if (fingers.has(e.pointerId)) fingers.set(e.pointerId, e);
  if (pinch && fingers.size >= 2) {
    const m = midOf(),
      z0 = pinch.z,
      kMax = autoDetailOn() && S.map === 'world' ? 400 : 40;
    // a locked zoom: the fingers scale the page instead (77-locks.js / page scale)
    if (lockOn('zoom') === 1) {
      if (typeof pinchPage === 'function') pinchPage(m.d / pinch.d, pinch);
      return;
    }
    let k = Math.min(kMax, Math.max(0.3, (z0.k * m.d) / pinch.d));
    if (lockOn('zoom') === 2) k = Math.min(S.lock.zr[1], Math.max(S.lock.zr[0], k));
    // the map point under the first midpoint stays under the current one (a locked position: the page centre)
    const c = lockOn('pos') ? lockCentre() : null,
      p0 = c || pinch.p,
      p1 = c || m.p;
    const bx = (p0[0] - z0.x) / z0.k,
      by = (p0[1] - z0.y) / z0.k,
      prev = S.zoom.k;
    S.zoom = { k, x: p1[0] - bx * k, y: p1[1] - by * k };
    if (!c && typeof autoDetailCheck === 'function' && Math.abs(k - prev) > 1e-3 && autoDetailCheck(null, k > prev)) {
      // another map now: the fingers start over from here
      pinch = null;
      return;
    }
    zoomChanged(true);
    return;
  }
  if (!drag) return;
  const [x, y] = svgPoint(e);
  const dx = x - drag.p[0],
    dy = y - drag.p[1];
  if (!dragged && Math.hypot(dx, dy) < 6) return;
  dragged = true;
  tip.style.display = 'none';
  if (lockOn('pos')) return; // a locked position does not pan (and the press is no click)
  document.getElementById('wrap').classList.add('panning');
  S.zoom = { k: drag.z.k, x: drag.z.x + dx, y: drag.z.y + dy };
  zoomChanged(true);
});
function pointerEnd(e) {
  fingers.delete(e.pointerId);
  clearTimeout(pressT);
  if (pinch && fingers.size < 2) {
    pinch = null;
    // one finger left: it pans on from where it is
    const f = [...fingers.values()][0];
    drag = f ? { p: svgPoint(f), z: Object.assign({}, S.zoom) } : null;
    if (!f) document.getElementById('wrap').classList.remove('panning');
    return;
  }
  drag = null;
  document.getElementById('wrap').classList.remove('panning');
}
window.addEventListener('pointerup', pointerEnd);
window.addEventListener('pointercancel', pointerEnd);
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
svg.addEventListener('mousemove', (e) => showTip(e.target, e.clientX, e.clientY));
// the unit's tooltip at a screen point (mouse hover, or a long press on touch screens)
function showTip(target, cx, cy) {
  const p = target.closest && target.closest('.k');
  if (!p) {
    tip.style.display = 'none';
    return;
  }
  const k = GEO.units.find((k) => k.c === p.dataset.c);
  const gi = groupOf(k.c);
  // locked highlights: the name and its group, no hints about clicking
  if (lockOn('hl')) {
    tip.innerHTML = `<b>${nm(k)}</b>${gi >= 0 && S.groups[gi].legend !== false ? ' · ' + esc(S.groups[gi].name) : ''}`;
    tip.style.display = 'block';
    tip.style.left = Math.max(4, Math.min(cx + 14, innerWidth - tip.offsetWidth - 4)) + 'px';
    tip.style.top = Math.max(4, cy - 10) + 'px';
    return;
  }
  // on a touch screen the hints name taps instead of clicks and Ctrl
  const touch = lastPointer === 'touch';
  const nav =
    (touch ? 'tip_dbl_' : 'tip_ctrl_') +
    (S.map === 'world' && hasDetail(k.c) ? 'open' : S.focus === k.c ? 'out' : 'zoom');
  tip.innerHTML = `<b>${nm(k)}</b> · ${GEO.groups[k.r]} · ${gi >= 0 ? t('tip_in') + ' "' + esc((S.groups[gi].parent ? groupById(S.groups[gi].parent).name + ' › ' : '') + S.groups[gi].name) + '"' : t(touch ? 'tip_tap' : 'tip_click') + ' "' + esc(S.groups.length ? S.groups[S.active].name : t('new_group_short')) + '"'}<br><span style="opacity:.75">${esc(t(nav))}${touch ? '' : '<br>' + esc(t('tip_shift'))}</span>`;
  tip.style.display = 'block';
  // kept on screen (a finger sits near the edge as often as not)
  tip.style.left = Math.max(4, Math.min(cx + 14, innerWidth - tip.offsetWidth - 4)) + 'px';
  tip.style.top = Math.max(4, cy - 10 - (cx + 14 + tip.offsetWidth > innerWidth ? 40 : 0)) + 'px';
}
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
  // locked highlights: only areas that do something (a text's trigger, 78-triggers.js) are outlined
  const k = e.target.closest('.k');
  hoverLine(k && lockOn('hl') && !(typeof txHot === 'function' && txHot(k.dataset.c)) ? null : k);
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

// ---- drag texts (title, subtitle, legend, logo, callout and label pills); double-click puts one back ----
let textDrag = null;
svg.addEventListener(
  'pointerdown',
  (e) => {
    const g = e.target.closest && e.target.closest('.drg');
    if (!g || e.button !== 0 || lockOn('edit')) return; // viewer mode: nothing moves
    e.stopImmediatePropagation(); // not a map pan
    e.preventDefault();
    const key = g.dataset.drag;
    const base = ((S.drag || {})[key] || [0, 0]).slice();
    let box = null;
    try {
      // the group's children without its own offset
      const hit = g.querySelector(':scope > .drg-hit');
      if (hit) hit.remove();
      const bb = g.getBBox();
      box = [bb.x, bb.y, bb.x + bb.width, bb.y + bb.height];
    } catch {
      /* not rendered */
    }
    textDrag = { key, p: svgPoint(e), base, box, moved: false };
    document.getElementById('wrap').classList.add('dragging');
  },
  true,
);
window.addEventListener('pointermove', (e) => {
  if (!textDrag) return;
  const [x, y] = svgPoint(e);
  const dx = x - textDrag.p[0],
    dy = y - textDrag.p[1];
  if (!textDrag.moved && Math.hypot(dx, dy) < 3) return;
  textDrag.moved = true;
  let ox = textDrag.base[0] + dx,
    oy = textDrag.base[1] + dy;
  // page elements snap to the page's left / centre / right and top / middle / bottom (Ctrl: free)
  SNAP_GUIDES = null;
  if (SNAP_KEYS.includes(textDrag.key) && snapOn() && !e.ctrlKey && !e.metaKey && textDrag.box) {
    const [bx0, by0, bx1, by1] = textDrag.box;
    const mx = PAD.l - 12,
      my = 22,
      T = 16;
    const xs = [
      [mx, bx0],
      [W / 2, (bx0 + bx1) / 2],
      [W - mx, bx1],
    ];
    const ys = [
      [my, by0],
      [(H - FOOT) / 2, (by0 + by1) / 2],
      [H - FOOT - my, by1],
    ];
    const best = (list, o) =>
      list.map(([target, edge]) => [target, target - edge]).sort((a, b) => Math.abs(a[1] - o) - Math.abs(b[1] - o))[0];
    const bxS = best(xs, ox),
      byS = best(ys, oy);
    SNAP_GUIDES = {};
    if (Math.abs(bxS[1] - ox) < T) ((ox = bxS[1]), (SNAP_GUIDES.x = bxS[0]));
    if (Math.abs(byS[1] - oy) < T) ((oy = byS[1]), (SNAP_GUIDES.y = byS[0]));
  }
  // at least part of the element stays on the page, so it can always be grabbed again
  if (textDrag.box) {
    const [bx0, by0, bx1, by1] = textDrag.box,
      keep = 24;
    ox = Math.min(W - keep - bx0, Math.max(keep - bx1, ox));
    oy = Math.min(H - keep - by0, Math.max(keep - by1, oy));
  }
  S.drag = Object.assign({}, S.drag, { [textDrag.key]: [ox, oy] });
  tip.style.display = 'none';
  zoomChanged(); // re-render on the next frame
});
window.addEventListener('pointerup', (e) => {
  if (!textDrag) return;
  // a partner logo snaps into a footer row / slot (Ctrl or snapping off: stays where dropped)
  if (textDrag.moved && textDrag.key.startsWith('pt:'))
    partnerDrop(textDrag.key, textDrag.box, e.ctrlKey || e.metaKey || !snapOn()) && zoomChanged();
  // a text item keeps the place it was dropped at (page- or map-anchored)
  if (textDrag.moved && textDrag.key.startsWith('tx:')) {
    txDrop(textDrag.key);
    zoomChanged();
  }
  if (SNAP_GUIDES) {
    SNAP_GUIDES = null;
    zoomChanged();
  }
  // one undo step per drag
  if (textDrag.moved) {
    clearTimeout(HIST.timer);
    HIST.timer = setTimeout(() => {
      HIST.timer = 0;
      pushHistory();
    }, 60);
  }
  if (textDrag.moved) dragged = true; // the click that follows is not a selection
  textDrag = null;
  document.getElementById('wrap').classList.remove('dragging');
});
svg.addEventListener('dblclick', (e) => {
  const g = e.target.closest && e.target.closest('.drg');
  if (lockOn('edit')) return;
  if (g && g.dataset.drag.startsWith('tx:')) return txEdit(g.dataset.drag);
  if (!g || !S.drag || !S.drag[g.dataset.drag]) return;
  const d = Object.assign({}, S.drag);
  delete d[g.dataset.drag];
  S.drag = d;
  render();
});
function resetDrag() {
  S.drag = {};
  render();
}
// snapping: page elements only; on by default, the checkbox in the Page tab turns it off, Ctrl overrides
const SNAP_KEYS = ['title', 'sub', 'legend', 'logo'];
let SNAP_GUIDES = null;
const snapOn = () => localStorage.getItem('mobomap.snap') !== '0';
function setSnap(on) {
  localStorage.setItem('mobomap.snap', on ? '1' : '0');
}

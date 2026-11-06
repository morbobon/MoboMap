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
  document.getElementById('dsName').textContent = loc(D.note) || (D.source === 'user' ? t('grp_user') : '');
  document.getElementById('dsDel').style.display = D.source === 'user' ? '' : 'none';
  document.getElementById('attrSel').innerHTML =
    `<option value="none">${esc(t('colour_by'))}: ${esc(t('none'))}</option>` +
    (ATTRS[S.map] || []).map((a) => `<option value="${a.id}">${esc(t('colour_by'))}: ${esc(t(a.n))}</option>`).join('');
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
    h += og(t('zoom_unit'), GEO.units.map((k) => [k.c, nm(k)]).sort(cmp));
    h += og(
      t('other_countries'),
      ctry.filter(([c]) => c !== S.country).map(([c, n]) => ['c:' + c, n]),
    );
  }
  fsel.innerHTML = h;
  fsel.value = S.focus;
  document.getElementById('regionPresets').innerHTML = Object.entries(GEO.groups)
    .map(
      ([r, n]) => `<button class="chip" onclick="presetRegionActive('${r}')">${esc(n)} ${esc(t('to_active'))}</button>`,
    )
    .join('');
  document.getElementById('langSel').innerHTML = Object.keys(T)
    .map((l) => `<option value="${l}">${LANGN[l]}</option>`)
    .join('');
  document.getElementById('langSel').value = S.lang;
  document.getElementById('layouts').innerHTML = LAYOUTS.map(
    (l) =>
      `<button class="tile ${S.layout === l.id ? 'on' : ''}" onclick="S.layout='${l.id}';ui();render()"><b>${t('lay_' + l.id)}</b><i>${l.d}</i></button>`,
  ).join('');
  document.getElementById('layoutInfo').textContent = W + '×' + H;
  document.getElementById('styles').innerHTML = STYLES.map(
    (s, i) =>
      `<button class="tile ${S.style === s.id ? 'on' : ''}" onclick="S.style='${s.id}';ui();render()"><b>${i + 1}. ${esc(t('st_' + s.id))}</b><i>${esc(t('st_' + s.id + '_d'))}</i></button>`,
  ).join('');
  document.getElementById('styleNo').textContent =
    '#' + (STYLES.findIndex((s) => s.id === S.style) + 1) + ' / ' + STYLES.length;
  const cols = D.highlight;
  document.getElementById('groups').innerHTML = S.groups
    .map(
      (
        g,
        i,
      ) => `<div class="grp ${S.active === i ? 'active' : ''}" onclick="if(S.active!==${i}){S.active=${i};ui();render()}">
  <div class="hd"><input type="radio" name="act" ${S.active === i ? 'checked' : ''} title="${esc(t('active_group'))}"><input type="text" value="${esc(g.name)}" oninput="S.groups[${i}].name=this.value;render()" placeholder="${esc(t('group_name'))}"><span class="cnt">${g.sel.size}</span>${S.groups.length > 1 ? `<button class="x" title="${esc(t('remove_group'))}" onclick="event.stopPropagation();removeGroup(${i})">×</button>` : ''}</div>
  <textarea rows="2" id="list${i}" oninput="fromText(${i})" placeholder="${esc(t('ph_units').replace('{ex}', MAPS[S.map].ex))}">${esc(g.text != null ? g.text : [...g.sel].map((c) => nm(GEO.units.find((k) => k.c === c))).join(', '))}</textarea>
  <div class="warn" id="warn${i}" style="${g.bad.length ? 'display:block' : ''}">${g.bad.length ? t('not_recognised') + ': ' + esc(g.bad.join(', ')) : ''}</div>
  <div class="row" style="margin-top:6px">${cols.map((c) => `<button class="sw sm ${g.color === c ? 'on' : ''}" style="background:${c}" title="${c}" onclick="event.stopPropagation();S.groups[${i}].color='${c}';ui();render()"></button>`).join('')}<input type="color" value="${g.color}" title="${esc(t('custom_colour'))}" style="width:26px;height:22px;padding:0;border:1px solid var(--line);border-radius:6px;background:none" onclick="event.stopPropagation()" oninput="S.groups[${i}].color=this.value;render()"></div>
  <div class="row" style="margin-top:6px">${HLS.map((h) => `<button class="chip sm ${g.hl.has(h.id) ? 'on' : ''}" title="${esc(t('hl_' + h.id + '_t'))}" onclick="event.stopPropagation();toggleHL(${i},'${h.id}')">${esc(t('hl_' + h.id))}</button>`).join('')}</div>
 </div>`,
    )
    .join('');
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
        : 'robinson'
      : GEO.geo
        ? 'local'
        : S.proj;
  const D = DS[S.ds];
  const tmpl = S.groups.length
    ? S.groups
    : [
        { name: t('g_fill'), hl: new Set(['fill', 'glow']), color: D.highlight[0] },
        { name: t('g_hatch'), hl: new Set(['hatch']), color: D.highlight[1] || D.highlight[0] },
      ];
  S.groups = tmpl.map((g) => newGroup(g.name, [...g.hl], g.color));
  if (!S.groups.length) S.groups = [newGroup(t('g_fill'), ['fill'], D.highlight[0])];
  MAPS[S.map].defaults.forEach((c) => S.groups[0].sel.add(c));
  S.active = 0;
  ui();
  render();
}
function setFocus(v) {
  if (v === 'world') return setMap('world');
  if (v.startsWith('c:')) return setMap(v.slice(2));
  S.focus = v;
  LC = null;
  ui();
  render();
}
function presetRegionActive(r) {
  const g = S.groups[S.active];
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
svg.addEventListener('click', (e) => {
  const p = e.target.closest('.k');
  if (!p) return;
  const c = p.dataset.c;
  const g = S.groups[S.active];
  if (g.sel.has(c)) g.sel.delete(c);
  else {
    S.groups.forEach((o) => o.sel.delete(c));
    g.sel.add(c);
  }
  syncText();
  ui();
  render();
});
svg.addEventListener('mousemove', (e) => {
  const p = e.target.closest('.k');
  if (!p) {
    tip.style.display = 'none';
    return;
  }
  const k = GEO.units.find((k) => k.c === p.dataset.c);
  const gi = groupOf(k.c);
  tip.innerHTML = `<b>${nm(k)}</b> · ${GEO.groups[k.r]} · ${gi >= 0 ? t('tip_in') + ' "' + esc(S.groups[gi].name) + '"' : t('tip_click') + ' "' + esc(S.groups[S.active].name) + '"'}`;
  tip.style.display = 'block';
  tip.style.left = e.clientX + 14 + 'px';
  tip.style.top = e.clientY - 10 + 'px';
});
// The hover outline is a separate, non-clickable overlay. Never move the hovered path in the DOM:
// mousedown and mouseup would then hit different elements and the click would never fire.
function hoverLine(p) {
  let h = document.getElementById('hoverline');
  if (!p) {
    if (h) h.remove();
    return;
  }
  if (!h) {
    h = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    h.id = 'hoverline';
  }
  h.setAttribute('d', p.getAttribute('d'));
  const t = p.parentNode.getAttribute('transform');
  if (t) h.setAttribute('transform', t);
  else h.removeAttribute('transform');
  svg.appendChild(h);
}
svg.addEventListener('mouseleave', () => {
  tip.style.display = 'none';
  hoverLine(null);
});
svg.addEventListener('mouseover', (e) => {
  hoverLine(e.target.closest('.k'));
});

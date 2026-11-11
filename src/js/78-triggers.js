// Visibility rules of text items (the title and the subtitle too): show when (trigger) – with (transition) –
// until (end). The rules run while the map is locked (77-locks.js) or while "Test triggers" is on; in the editor
// the texts they hide are drawn faint, so they can still be placed. Exports show every text whose "Show in export"
// is on, whatever its rule.
//   rule: { on, target, delay, level, area, step, fx, until, secs }
//   on: always | hover | click | delay (s after the start) | level (map zoom at least ×level) | area (the map shows
//       an area) | step (presentation step); target (hover, click): 'u:<unit>' | 'g:<group id>' (stored: the
//       group's index) | 'hl' (any highlighted area) | 't:<text key>'
//   fx: none | fade | scale (from the target area) | slide | type (typewriter) | blur | wipe
//   until: leave (pointer leaves) | away (a click elsewhere) | time (after secs) | next (next step) |
//          while (the condition holds) | stay
const TR_ON = ['always', 'hover', 'click', 'delay', 'level', 'area', 'step'];
const TR_FX = ['none', 'fade', 'scale', 'slide', 'type', 'blur', 'wipe'];
const TR_UNTIL = ['leave', 'away', 'time', 'next', 'while', 'stay'];
const TR_ON_KEYS = {
  always: 'tr_on_always',
  hover: 'tr_on_hover',
  click: 'tr_on_click',
  delay: 'tr_on_delay',
  level: 'tr_on_level',
  area: 'tr_on_area',
  step: 'tr_on_step',
};
const TR_FX_KEYS = {
  none: 'trfx_none',
  fade: 'trfx_fade',
  scale: 'trfx_scale',
  slide: 'trfx_slide',
  type: 'trfx_type',
  blur: 'trfx_blur',
  wipe: 'trfx_wipe',
};
const TR_UNTIL_KEYS = {
  leave: 'tru_leave',
  away: 'tru_away',
  time: 'tru_time',
  next: 'tru_next',
  while: 'tru_while',
  stay: 'tru_stay',
};
// the ends that make sense per trigger (the first is the default)
const TR_ENDS = {
  always: ['stay', 'time', 'next', 'away'],
  hover: ['leave', 'away', 'time', 'next', 'stay'],
  click: ['away', 'leave', 'time', 'next', 'stay'],
  delay: ['stay', 'time', 'next', 'away'],
  level: ['while', 'time', 'stay'],
  area: ['while', 'time', 'stay'],
  step: ['next', 'stay', 'time'],
};
const trNum = (v, lo, hi, d) => (Number.isFinite(+v) && v !== '' && v != null ? Math.min(hi, Math.max(lo, +v)) : d);
// a stored rule → a safe one; null = always shown (the plain text)
function ruleClean(r) {
  if (!r || typeof r !== 'object' || !TR_ON.includes(r.on)) return null;
  const o = { on: r.on, fx: TR_FX.includes(r.fx) ? r.fx : 'fade' };
  o.until = TR_UNTIL.includes(r.until) && TR_ENDS[o.on].includes(r.until) ? r.until : TR_ENDS[o.on][0];
  if (o.on === 'hover' || o.on === 'click')
    o.target = /^(u:.{1,40}|g:\d{1,4}|hl|t:(title|sub|tx:t\d+))$/.test(r.target || '') ? r.target : 'hl';
  if (o.on === 'delay') o.delay = trNum(r.delay, 0, 3600, 2);
  if (o.on === 'level') o.level = trNum(r.level, 0.3, 400, 2);
  if (o.on === 'area') o.area = String(r.area || '').slice(0, 40);
  if (o.on === 'step') o.step = Math.round(trNum(r.step, 1, 99, 1));
  if (o.until === 'time') o.secs = trNum(r.secs, 0.5, 3600, 4);
  if (o.on === 'always' && o.fx === 'none' && o.until === 'stay') return null;
  return o;
}
// project form: a group target by its place in the list (group ids live only in the session)
function ruleOut(r) {
  if (!r) return r;
  const o = Object.assign({}, r);
  if (/^g:\d+$/.test(o.target || ''))
    o.target =
      'g:' +
      Math.max(
        0,
        S.groups.findIndex((g) => g.id === +o.target.slice(2)),
      );
  return o;
}
// after a project is loaded: group places → the new groups' ids (made in list order, so by id)
function ruleLoad() {
  const byIdx = S.groups.slice().sort((a, b) => a.id - b.id);
  for (const it of [S.tb.title, S.tb.sub, ...S.texts]) {
    const r = it.rule;
    if (r && /^g:\d+$/.test(r.target || '')) {
      const g = byIdx[+r.target.slice(2)];
      r.target = g ? 'g:' + g.id : 'hl';
    }
  }
  TR.reset = true;
}
// link form: on~target-or-area~fx~until~number~secs
function ruleStr(r) {
  const n = { delay: r.delay, level: r.level, step: r.step }[r.on];
  const f = [r.on, txEnc(r.target || r.area || ''), r.fx, r.until, n ?? '', r.secs ?? ''].map(String);
  while (f.length > 1 && f[f.length - 1] === '') f.pop();
  return f.join('~');
}
function ruleParse(s) {
  const [on, tg, fx, until, n, secs] = String(s).split('~');
  const t = safeDecode(tg || '');
  return ruleClean({ on, fx, until, secs, target: t, area: t, delay: n, level: n, step: n });
}

// ---- runtime ----
const TR = {
  live: false,
  test: false,
  reset: false,
  shown: new Set(),
  fired: new Set(),
  timers: new Map(),
  step: 0,
  t0: 0,
};
const txTesting = () => TR.test;
// every text with a rule: [key, item, rule]
function txRules() {
  const out = [];
  for (const k of ['title', 'sub']) if (S.tb[k].rule) out.push([k, S.tb[k], S.tb[k].rule]);
  for (const it of S.texts) if (it.rule) out.push([txKey(it), it, it.rule]);
  return out;
}
const trSteps = () => Math.max(0, ...txRules().map(([, , r]) => (r.on === 'step' ? r.step : 0)));
// what the pointer is on: a unit's code and / or a text's key
function txHit(el) {
  const k = el && el.closest && el.closest('.k'),
    d = el && el.closest && el.closest('.drg');
  return { c: k ? k.dataset.c : null, key: d ? d.dataset.drag : null };
}
function txMatch(target, hit) {
  if (!target) return false;
  if (target[0] === 't') return hit.key === target.slice(2);
  if (!hit.c) return false;
  if (target === 'hl') return groupOf(hit.c) >= 0;
  if (target[0] === 'u') return hit.c === target.slice(2);
  const g = groupById(+target.slice(2));
  return !!g && !g.off && g.sel.has(hit.c);
}
// an area that sets off a text (outlined and clickable on a map with locked highlights)
function txHot(c) {
  return TR.live && txRules().some(([, , r]) => (r.on === 'hover' || r.on === 'click') && txMatch(r.target, { c }));
}
function txShow(key, r) {
  TR.shown.add(key);
  clearTimeout(TR.timers.get(key));
  if (r.until === 'time')
    TR.timers.set(
      key,
      setTimeout(() => (txHide(key), txApply()), r.secs * 1000),
    );
}
function txHide(key) {
  TR.shown.delete(key);
  clearTimeout(TR.timers.get(key));
  TR.timers.delete(key);
}
const trArea = (a) => !!a && (S.focus === a || S.country === a || S.focus === 'c:' + a || S.focus === 'g:' + a);
// the conditions (zoom, area, step) and the start (always, delay)
function txUpdate() {
  for (const [key, , r] of txRules()) {
    if (r.on === 'always' || r.on === 'delay') {
      if (TR.fired.has(key)) continue;
      TR.fired.add(key);
      if (r.on === 'always') txShow(key, r);
      else
        TR.timers.set(
          key,
          setTimeout(
            () => {
              txShow(key, r);
              txApply();
            },
            Math.max(0, r.delay * 1000 - (Date.now() - TR.t0)),
          ),
        );
      continue;
    }
    if (!['level', 'area', 'step'].includes(r.on)) continue;
    const cond =
      r.on === 'level'
        ? S.zoom.k >= r.level - 1e-6
        : r.on === 'area'
          ? trArea(r.area)
          : r.until === 'stay'
            ? TR.step >= r.step
            : TR.step === r.step;
    if (cond && !TR.fired.has(key)) {
      TR.fired.add(key);
      txShow(key, r);
    } else if (!cond) {
      TR.fired.delete(key);
      if (r.until !== 'stay' || r.on === 'step') txHide(key);
    }
  }
}
function trStart() {
  for (const t of TR.timers.values()) clearTimeout(t);
  Object.assign(TR, { shown: new Set(), fired: new Set(), timers: new Map(), t0: Date.now(), reset: false });
  TR.step = trSteps() ? 1 : 0;
}
// presentation steps: ‹ n / N ›
function txStep(d) {
  const n = trSteps();
  if (!TR.live || !n) return;
  const s = Math.min(n, Math.max(1, TR.step + d));
  if (s === TR.step) return;
  TR.step = s;
  for (const [key, , r] of txRules()) if (r.until === 'next' && r.on !== 'step') txHide(key);
  txApply();
}
function txTest(on) {
  TR.test = !!on;
  TR.reset = true;
  render();
}
// the page follows the state: classes switch (so the transitions run), the step bar
function txApply() {
  const live = S.lock.on || TR.test;
  if (live !== TR.live || TR.reset) {
    TR.live = live;
    trStart();
    // from hidden, so the texts shown at the start come in with their transition
    if (live) {
      document.querySelectorAll('#svg .txi[data-ghost]').forEach((g) => g.classList.add('off'));
      void svg.getBoundingClientRect();
    }
    if (!live) for (const t of TR.timers.values()) clearTimeout(t);
    document
      .querySelectorAll('#svg .txi')
      .forEach((g) => g.classList.toggle('ghost', !live && g.dataset.ghost === '1'));
  }
  if (TR.live) txUpdate();
  document
    .querySelectorAll('#svg .txi[data-ghost]')
    .forEach((g) => g.classList.toggle('off', TR.live && !TR.shown.has(g.dataset.tx)));
  const bar = document.getElementById('stepBar'),
    n = trSteps();
  if (bar) {
    bar.hidden = !(TR.live && n);
    document.getElementById('stepN').textContent = TR.step + ' / ' + n;
  }
  document.querySelectorAll('#svg .k.hot').forEach((k) => k.classList.remove('hot'));
  if (TR.live && S.lock.on && S.lock.hl)
    document.querySelectorAll('#svg .k').forEach((k) => txHot(k.dataset.c) && k.classList.add('hot'));
}
// drawn with the page: a text with a rule, a link or "not in export" gets a wrapper (others stay as they were)
function txWrap(key, inner) {
  const it = txOf(key);
  if (!it || (!it.rule && !it.link && it.exp !== false)) return inner;
  const r = it.rule,
    ghost = r && r.on !== 'always';
  const cls = [
    'txi',
    r ? 'fx-' + r.fx : '',
    TR.live && r && !TR.shown.has(key) ? 'off' : '',
    !TR.live && ghost ? 'ghost' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const n =
    r && r.fx === 'type' ? Math.max(4, (txBuilt(key) ? document.getElementById(key).value : it.text).length) : 0;
  return `<g class="${cls}" data-tx="${esc(key)}"${r ? ` data-ghost="${ghost ? 1 : 0}"` : ''}${it.exp === false ? ' data-exp="0"' : ''}${it.link ? ' data-link="1"' : ''}${n ? ` style="--n:${n}"` : ''}>${inner}</g>`;
}
// after each render: where "scale up" starts (the target area), the links of the PDF export, the state
function txAfterRender() {
  document.querySelectorAll('#svg .txi.fx-scale').forEach((g) => {
    const it = txOf(g.dataset.tx),
      tg = (it && it.rule && it.rule.target) || '';
    let c = tg[0] === 'u' ? tg.slice(2) : tg[0] === 'g' ? [...((groupById(+tg.slice(2)) || {}).sel || [])][0] : null;
    const k = c && GEO.units.find((u) => u.c === c);
    if (!k) return;
    try {
      const b = g.getBBox(),
        [x, y] = kc(k);
      g.style.transformOrigin = `${(x - b.x).toFixed(1)}px ${(y - b.y).toFixed(1)}px`;
    } catch {
      /* not laid out */
    }
  });
  if (window._links)
    document.querySelectorAll('#svg .txi[data-link]').forEach((g) => {
      const it = txOf(g.dataset.tx),
        url = it && txLink(it.link);
      if (!url || g.dataset.exp === '0') return;
      try {
        const b = g.getBBox();
        if (b.width) window._links.push({ x: b.x, y: b.y, w: b.width, h: b.height, url });
      } catch {
        /* not laid out */
      }
    });
  txApply();
}
// pointer and clicks while the rules run (on touch screens a tap is the hover)
svg.addEventListener('pointerover', (e) => {
  if (!TR.live || e.pointerType === 'touch') return;
  const hit = txHit(e.target);
  let ch = false;
  for (const [key, , r] of txRules()) {
    if (r.on !== 'hover' && !(r.on === 'click' && r.until === 'leave')) continue;
    const on = txMatch(r.target, hit) || (TR.shown.has(key) && hit.key === key);
    if (r.on === 'hover' && on && !TR.shown.has(key)) ((ch = true), txShow(key, r));
    else if (!on && TR.shown.has(key) && r.until === 'leave') ((ch = true), txHide(key));
  }
  if (ch) txApply();
});
svg.addEventListener('pointerleave', (e) => {
  if (!TR.live || e.pointerType === 'touch') return;
  let ch = false;
  for (const [key, , r] of txRules()) if (r.until === 'leave' && TR.shown.has(key)) ((ch = true), txHide(key));
  if (ch) txApply();
});
svg.addEventListener('click', (e) => {
  if (!TR.live) return;
  const hit = txHit(e.target),
    touch = typeof lastPointer !== 'undefined' && lastPointer === 'touch';
  // a text with a link opens it
  const it = hit.key && txOf(hit.key),
    url = it && txLink(it.link);
  if (url && (!it.rule || TR.shown.has(hit.key))) window.open(url, '_blank', 'noopener');
  for (const [key, , r] of txRules()) {
    const tap = r.on === 'click' || (touch && r.on === 'hover');
    const on = txMatch(r.target, hit);
    if (tap && on) {
      if (TR.shown.has(key) && r.on === 'click' && r.until !== 'stay') txHide(key);
      else txShow(key, r);
    } else if (
      TR.shown.has(key) &&
      hit.key !== key &&
      !on &&
      (r.until === 'away' || (touch && (r.on === 'hover' || r.until === 'leave')))
    )
      txHide(key);
  }
  txApply();
});
document.addEventListener('keydown', (e) => {
  if (!TR.live || !trSteps() || e.ctrlKey || e.metaKey || e.altKey) return;
  const tag = (document.activeElement && document.activeElement.tagName) || '';
  if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
  const d = { ArrowRight: 1, PageDown: 1, ' ': 1, ArrowLeft: -1, PageUp: -1 }[e.key];
  if (!d) return;
  e.preventDefault();
  txStep(d);
});

// ---- panel: the rule controls in a text's card ----
function txRule(key, prop, v) {
  const it = txOf(key);
  if (!it) return;
  let r = it.rule ? Object.assign({}, it.rule) : { on: 'always', fx: 'none', until: 'stay' };
  if (prop === 'on') {
    r = { on: v, fx: r.fx === 'none' && v !== 'always' ? 'fade' : r.fx, until: TR_ENDS[v][0], target: r.target };
    if ((v === 'hover' || v === 'click') && !r.target) r.target = S.groups.some((g) => g.sel.size) ? 'hl' : '';
    if (v === 'step') r.step = trSteps() + 1;
  } else r[prop] = v;
  it.rule = ruleClean(r);
  TR.reset = true;
  TX_OPEN = key;
  textsUI();
  render();
}
function ruleCard(key, it) {
  const r = it.rule || { on: 'always', fx: 'none', until: 'stay' };
  const call = (prop, expr) => `txRule('${key}','${prop}',${expr})`;
  const opts = (list, cur) =>
    list
      .map(([v, l]) => `<option value="${esc(v)}"${String(cur) === String(v) ? ' selected' : ''}>${esc(l)}</option>`)
      .join('');
  const sel = (prop, list, cur) => `<select onchange="${call(prop, 'this.value')}">${opts(list, cur)}</select>`;
  const num = (prop, v, lo, hi, step) =>
    `<input type="number" min="${lo}" max="${hi}" step="${step}" value="${v}" onchange="${call(prop, '+this.value')}"/>`;
  const lab = (k18, inner) => `<label><span>${esc(t(k18))}</span>${inner}</label>`;
  const units = GEO.units.map((k) => [k.c, nm(k)]).sort((a, b) => a[1].localeCompare(b[1]));
  let h = `<div class="txrule"><div class="row2">${lab(
    'tr_show',
    sel(
      'on',
      TR_ON.map((v) => [v, t(TR_ON_KEYS[v])]),
      r.on,
    ),
  )}`;
  if (r.on === 'hover' || r.on === 'click') {
    const tg = r.target || '';
    let o = `<option value="hl"${tg === 'hl' ? ' selected' : ''}>${esc(t('tr_t_hl'))}</option>`;
    if (S.groups.length)
      o += `<optgroup label="${esc(t('sec_groups'))}">${opts(
        S.groups.map((g) => ['g:' + g.id, g.name]),
        tg,
      )}</optgroup>`;
    o += `<optgroup label="${esc(t('tr_t_areas'))}">${opts(
      units.map(([c, n]) => ['u:' + c, n]),
      tg,
    )}</optgroup>`;
    const others = ['title', 'sub', ...S.texts.map(txKey)].filter((k) => k !== key);
    o += `<optgroup label="${esc(t('sec_text'))}">${opts(
      others.map((k) => ['t:' + k, txName(k)]),
      tg,
    )}</optgroup>`;
    if (tg && !o.includes(`value="${esc(tg)}"`))
      o += `<option value="${esc(tg)}" selected>${esc(tg.slice(2))}</option>`;
    h += lab('tr_target', `<select onchange="${call('target', 'this.value')}">${o}</select>`);
  } else if (r.on === 'delay') h += lab('tr_delay', num('delay', r.delay, 0, 3600, 0.5));
  else if (r.on === 'level') h += lab('tr_level', num('level', r.level, 0.3, 400, 0.5));
  else if (r.on === 'step') h += lab('tr_step', num('step', r.step, 1, 99, 1));
  else if (r.on === 'area') {
    const list = units.slice();
    if (r.area && !list.some(([c]) => c === r.area)) list.unshift([r.area, r.area]);
    h += lab('tr_area', sel('area', [['', '–'], ...list], r.area));
  } else h += '<span></span>';
  h += '</div>';
  if (r.on !== 'always' || r.fx !== 'none' || it.rule) {
    h += `<div class="row2">${lab(
      'tr_fx',
      sel(
        'fx',
        TR_FX.map((v) => [v, t(TR_FX_KEYS[v])]),
        r.fx,
      ),
    )}${lab(
      'tr_until',
      sel(
        'until',
        TR_ENDS[r.on].map((v) => [v, t(TR_UNTIL_KEYS[v])]),
        r.until,
      ),
    )}</div>`;
    if (r.until === 'time')
      h += `<div class="row2">${lab('tr_secs', num('secs', r.secs, 0.5, 3600, 0.5))}<span></span></div>`;
  } else
    h += `<div class="row2">${lab(
      'tr_fx',
      sel(
        'fx',
        TR_FX.map((v) => [v, t(TR_FX_KEYS[v])]),
        r.fx,
      ),
    )}<span></span></div>`;
  h += `<label class="ck"><input type="checkbox"${it.exp !== false ? ' checked' : ''} onchange="txSet('${key}','exp',this.checked)"/> <span>${esc(t('tr_exp'))}</span></label></div>`;
  return h;
}

// Text items (Page tab → Text on the map).
// The title and the subtitle are two built-in items: their text, position and flair keep their own fields
// (#title, #sub, #titlePos, #subPos, S.fx.title / S.fx.sub), so old links and projects read as before. S.tb
// holds what they share with the custom items: { font, size, weight, color, hide, link, rule, exp }.
// Custom items live in S.texts:
//   { id, text, font, size, weight, color, align: l|c|r, fx, box, anchor: 'page'|'map', x, y, hide, link, rule, exp }
// Page-anchored: x, y are fractions of the page. Map-anchored: world coordinates (lon + 180, 90 - lat), so
// the item follows zoom, pan, focus and projection.
let TX_SEQ = 0,
  TX_OPEN = ''; // the card to open when the list is drawn next
// effects of a custom item: the title's, and the subtitle's that keep the item's own font
const TX_SUB_FX = ['rules', 'ornament', 'pill', 'tag', 'underline'];
const TX_FX = TITLE_FX.filter((f) => f !== 'auto').concat(TX_SUB_FX);
const TX_WEIGHTS = [400, 500, 600, 700],
  TX_W_KEYS = { 400: 'tx_w400', 500: 'tx_w500', 600: 'tx_w600', 700: 'tx_w700' };
const txKey = (it) => 'tx:' + it.id;
const txBuilt = (key) => key === 'title' || key === 'sub';
function txOf(key) {
  return txBuilt(key) ? S.tb[key] : S.texts.find((x) => txKey(x) === key);
}
// '' = the item's default font, 'head' / 'body' = the design system's, else a font family
function txFont(v, def, ds) {
  return !v ? def : v === 'head' ? ds.head : v === 'body' ? ds.body : v;
}
// selectable families: the embedded fonts and the design systems' own faces (no web fonts: exports stay self-contained)
function txFonts() {
  const fams = new Set(Object.keys(FONTS));
  Object.keys(extraFaces).forEach((k) => fams.add(k.split('|')[0]));
  return [...fams].sort();
}
const txLink = (u) => {
  u = String(u || '').trim();
  if (!u) return '';
  return /^(https?:|mailto:)/i.test(u) ? u : /^[a-z][a-z0-9+.-]*:/i.test(u) ? '' : 'https://' + u;
};
// a stored item (project, link) → a safe one; built: the title's / subtitle's shared part only
function txClean(o, built) {
  o = o && typeof o === 'object' ? o : {};
  const n = (v, lo, hi, d) => (Number.isFinite(+v) && v !== '' && v != null ? Math.min(hi, Math.max(lo, +v)) : d);
  const it = {
    font: String(o.font || '')
      .replace(/['"<>&;{}\\]/g, '')
      .slice(0, 60),
    size: n(o.size, 0, 400, 0),
    weight: TX_WEIGHTS.includes(+o.weight) ? +o.weight : 0,
    color: isHex(o.color) ? o.color : '',
    hide: !!o.hide,
    link: String(o.link || '').slice(0, 500),
    rule: typeof ruleClean === 'function' ? ruleClean(o.rule) : null,
    exp: o.exp !== false,
  };
  if (built) return it;
  return Object.assign(it, {
    id: /^t\d+$/.test(o.id) ? o.id : 't' + ++TX_SEQ,
    text: String(o.text ?? '').slice(0, 2000),
    size: it.size || 28,
    align: ['l', 'c', 'r'].includes(o.align) ? o.align : 'l',
    fx: TX_FX.includes(o.fx) ? o.fx : 'none',
    box: !!o.box,
    anchor: o.anchor === 'map' ? 'map' : 'page',
    x: n(o.x, -1e4, 1e4, 0.5),
    y: n(o.y, -1e4, 1e4, 0.5),
  });
}
// what a project stores: custom items whole, the built-in ones only where they differ from plain
function txOut() {
  const tb = {};
  for (const k of ['title', 'sub']) {
    const o = S.tb[k],
      d = {};
    if (o.font) d.font = o.font;
    if (o.size) d.size = o.size;
    if (o.weight) d.weight = o.weight;
    if (o.color) d.color = o.color;
    if (o.hide) d.hide = true;
    if (o.link) d.link = o.link;
    if (o.rule) d.rule = typeof ruleOut === 'function' ? ruleOut(o.rule) : o.rule;
    if (o.exp === false) d.exp = false;
    if (Object.keys(d).length) tb[k] = d;
  }
  return {
    ...(S.texts.length
      ? {
          texts: S.texts.map((o) =>
            Object.assign({}, o, { rule: o.rule && typeof ruleOut === 'function' ? ruleOut(o.rule) : o.rule }),
          ),
        }
      : {}),
    ...(Object.keys(tb).length ? { tb } : {}),
  };
}
function txLoad(p) {
  TX_SEQ = 0;
  const seen = new Set();
  S.texts = (Array.isArray(p.texts) ? p.texts : [])
    .slice(0, 200)
    .map((o) => txClean(o))
    .filter((o) => !seen.has(o.id) && seen.add(o.id));
  TX_SEQ = Math.max(0, ...S.texts.map((o) => +o.id.slice(1)));
  const tb = p.tb || {};
  S.tb = { title: txClean(tb.title, true), sub: txClean(tb.sub, true) };
  if (typeof ruleLoad === 'function') ruleLoad();
}

// ---- link parameter: tx=<item>_<item>…, an item being id*text*x*y*flags*size*weight*font*colour*fx*link*rule
// id: T / S (title, subtitle: no text, place or fx) or the item's number; x, y: 1/10000 of the page, or world
// coordinates with flag m; flags: m map-anchored, c / r centred / right-aligned, b box, h hidden, x not exported
// (the separators and % are escaped; the URL encoding does the rest)
const txEnc = (s) => String(s || '').replace(/[%*_~]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
function txParam(p) {
  const row = (id, o, built) => {
    const f = [
      id,
      built ? '' : txEnc(o.text),
      built ? '' : o.anchor === 'map' ? +o.x.toFixed(4) : Math.round(o.x * 1e4),
      built ? '' : o.anchor === 'map' ? +o.y.toFixed(4) : Math.round(o.y * 1e4),
      (built ? '' : (o.anchor === 'map' ? 'm' : '') + (o.align === 'l' ? '' : o.align) + (o.box ? 'b' : '')) +
        (o.hide ? 'h' : '') +
        (o.exp === false ? 'x' : ''),
      o.size && (built || o.size !== 28) ? o.size : '',
      o.weight || '',
      txEnc(o.font),
      String(o.color || '').replace('#', ''),
      built || !o.fx || o.fx === 'none' ? '' : o.fx,
      txEnc(o.link),
      o.rule && typeof ruleStr === 'function' ? ruleStr(o.rule) : '',
    ].map(String);
    while (f.length > 1 && f[f.length - 1] === '') f.pop();
    return f.join('*');
  };
  const rows = [];
  for (const k of ['title', 'sub']) {
    const r = row(k === 'title' ? 'T' : 'S', (p.tb || {})[k] || {}, true);
    if (r.length > 1) rows.push(r);
  }
  (p.texts || []).forEach((o) => rows.push(row(String(o.id).slice(1), o)));
  return rows.join('_');
}
function txFromParam(v, p) {
  p.texts = [];
  p.tb = {};
  for (const part of String(v || '').split('_')) {
    if (!part) continue;
    const f = part.split('*'),
      d = (i) => safeDecode(f[i] || ''),
      fl = f[4] || '';
    const o = {
      size: num(f[5]) || 0,
      weight: num(f[6]) || 0,
      font: d(7),
      color: /^[0-9a-f]{3,8}$/i.test(f[8] || '') ? '#' + f[8] : '',
      link: d(10),
      hide: fl.includes('h'),
      exp: !fl.includes('x'),
      rule: f[11] && typeof ruleParse === 'function' ? ruleParse(f[11]) : null,
    };
    if (f[0] === 'T' || f[0] === 'S') p.tb[f[0] === 'T' ? 'title' : 'sub'] = o;
    else if (/^\d+$/.test(f[0])) {
      const map = fl.includes('m');
      p.texts.push(
        Object.assign(o, {
          id: 't' + f[0],
          text: d(1),
          anchor: map ? 'map' : 'page',
          x: (num(f[2]) ?? (map ? 180 : 5000)) / (map ? 1 : 1e4),
          y: (num(f[3]) ?? (map ? 90 : 5000)) / (map ? 1 : 1e4),
          align: fl.includes('c') ? 'c' : fl.includes('r') ? 'r' : 'l',
          box: fl.includes('b'),
          fx: f[9] || 'none',
        }),
      );
    }
  }
}

// ---- placing ----
// page point → world coordinates (the inverse of worldPt, found numerically: the projections have no inverse
// of their own); null where the point is off the map (beside a globe)
function worldInv(px, py) {
  let x = 190.5,
    y = 34; // Denmark, for the municipality map
  if (GEO.geo) {
    let bd = Infinity;
    for (const k of GEO.units) {
      if (insOf(k)) continue;
      const [a, b] = kc(k),
        d = (a - px) ** 2 + (b - py) ** 2;
      if (d < bd) ((bd = d), ([x, y] = k.p));
    }
  }
  const h = 0.01;
  for (let i = 0; i < 30; i++) {
    const [fx, fy] = worldPt(x, y),
      ex = px - fx,
      ey = py - fy;
    if (Math.abs(ex) + Math.abs(ey) < 0.05) break;
    const [ax, ay] = worldPt(x + h, y),
      [bx, by] = worldPt(x, y + h);
    const j11 = (ax - fx) / h,
      j21 = (ay - fy) / h,
      j12 = (bx - fx) / h,
      j22 = (by - fy) / h,
      det = j11 * j22 - j12 * j21;
    if (!Number.isFinite(det) || Math.abs(det) < 1e-9) break;
    let dx = (ex * j22 - j12 * ey) / det,
      dy = (j11 * ey - j21 * ex) / det;
    const m = Math.max(Math.abs(dx), Math.abs(dy));
    if (m > 15) ((dx *= 15 / m), (dy *= 15 / m));
    x += dx;
    y += dy;
  }
  const [fx, fy] = worldPt(x, y);
  return Math.hypot(fx - px, fy - py) < 1.5 ? [x, y] : null;
}
// where an item is drawn (page units)
function txPagePos(it) {
  return it.anchor === 'map' ? worldPt(it.x, it.y) : [it.x * W, it.y * H];
}
function txPlace(it, px, py, anchor) {
  if (anchor === 'map') {
    const w = worldInv(px, py);
    if (!w) {
      toast(t('tx_off_map'));
      return false;
    }
    [it.x, it.y] = [+w[0].toFixed(4), +w[1].toFixed(4)];
  } else [it.x, it.y] = [+(px / W).toFixed(4), +(py / H).toFixed(4)];
  it.anchor = anchor;
  return true;
}
// a dragged item was dropped: the offset becomes its place
function txDrop(key) {
  const it = txOf(key),
    d = (S.drag || {})[key];
  if (!it || !d) return;
  const [px, py] = txPagePos(it);
  const rest = Object.assign({}, S.drag);
  delete rest[key];
  S.drag = rest;
  txPlace(it, px + d[0], py + d[1], it.anchor);
}

// ---- drawing (called by render, after the title and the subtitle) ----
// c: { ds, ink, bg, dark, guard, textBgs, hcol, Lt, dragG }
function textItemsSvg(c) {
  let out = '';
  const pick = (cands) => (c.guard ? readable(cands.filter(isHex), c.textBgs, 3) : cands.find(isHex) || c.ink);
  const bgHex = isHex(c.bg) ? c.bg : c.dark ? '#111111' : '#ffffff';
  for (const it of S.texts) {
    if (it.hide || !it.text.trim()) continue;
    const [px, py] = txPagePos(it);
    if (![px, py].every(Number.isFinite)) continue;
    const size = it.size || 28,
      lh = size * 1.24,
      font = txFont(it.font, c.ds.head, c.ds),
      weight = it.weight || 700,
      anchor = it.align === 'c' ? 'middle' : it.align === 'r' ? 'end' : 'start',
      lines = it.text.split('\n').slice(0, 40);
    let fill = it.color || c.hcol,
      inner = '';
    if (it.box) {
      const w = Math.max(...lines.map((l) => textW(l, font, weight, size, 0))),
        pad = size * 0.5,
        x0 = textSpan(px, anchor, w, 0)[0];
      if (c.guard) fill = readable([fill, c.ink, '#1b1b1b', '#ffffff'].filter(isHex), [bgHex], 4.5);
      inner += `<rect x="${r1(x0 - pad)}" y="${r1(py - size * 0.78 - pad)}" width="${r1(w + pad * 2)}" height="${r1((lines.length - 1) * lh + size + pad * 2)}" rx="${r1(Math.min(10, size * 0.3))}" fill="${bgHex}" fill-opacity=".94" stroke="${mix(bgHex, isHex(c.ink) ? c.ink : '#808080', 0.3)}" stroke-width="1"/>`;
    }
    // on the map itself a text gets a halo in the page colour (contrast guard), as the unit names do
    const halo =
      c.guard && !it.box && it.anchor === 'map'
        ? `stroke="${bgHex}" stroke-opacity=".85" stroke-width="${r1(Math.max(2.5, size * 0.14))}" paint-order="stroke" stroke-linejoin="round"`
        : '';
    lines.forEach((text, i) => {
      if (!text) return;
      const o = {
        fx: it.fx,
        text,
        x: px,
        y: py + i * lh,
        anchor,
        size,
        font,
        weight,
        ls: 0,
        fill,
        halo,
        bg: c.bg,
        dark: c.dark,
        ds: c.ds,
        pick,
        Lt: c.Lt,
        guard: c.guard,
        heading: c.ds.head,
        uid: '_' + it.id + '_' + i,
      };
      inner += TX_SUB_FX.includes(it.fx) ? subSvg(o) : titleSvg(o);
    });
    out += c.dragG(txKey(it), inner);
  }
  return out;
}

// ---- panel: the list of items ----
function addText(o) {
  const it = txClean(Object.assign({ text: t('tx_new'), align: 'c', x: 0.5, y: 0.5 }, o || {}));
  S.texts.push(it);
  TX_OPEN = txKey(it);
  textsUI();
  render();
  return it;
}
function delText(key) {
  S.texts = S.texts.filter((x) => txKey(x) !== key);
  textsUI();
  render();
}
// rebuild: the card changes with the value (anchor, auto colour …); quiet: the caller draws
function txSet(key, prop, val, rebuild, quiet) {
  const it = txOf(key);
  if (!it) return;
  if (prop === 'size' || prop === 'weight') val = Math.max(0, +val || 0);
  if (prop === 'anchor') {
    if (val !== it.anchor) {
      const [px, py] = txPagePos(it);
      txPlace(it, px, py, val);
    }
  } else it[prop] = val;
  if (prop === 'text') {
    const n = document.querySelector(`#txList details[data-key="${key}"] .txn`);
    if (n) n.textContent = txName(key);
  }
  if (rebuild) textsUI();
  if (!quiet) render();
}
// a text's size on the map: the wheel over it, or its corner handle (71-page-items.js); the card's field follows
pageItem({
  has: (key) => (txBuilt(key) || key.startsWith('tx:')) && !!txOf(key),
  get: (key) => +txOf(key).size || (key === 'title' ? Math.round(W * 0.038) : key === 'sub' ? 14 : 28),
  set: (key, v) => txSet(key, 'size', v, false, true),
  lo: 6,
  hi: 400,
  step: 1,
  sync: (key) => {
    const f = document.querySelector(`#txList details[data-key="${key}"] .txsz`);
    if (f && f !== document.activeElement) f.value = txOf(key).size || '';
  },
});
function txName(key) {
  if (txBuilt(key)) return t(key === 'title' ? 'ph_title' : 'ph_sub');
  return (txOf(key).text || '').split('\n')[0].slice(0, 30) || t('tx_new');
}
function txCard(key, open) {
  const it = txOf(key),
    built = txBuilt(key);
  const set = (prop, expr, rebuild) => `txSet('${key}','${prop}',${expr}${rebuild ? ',1' : ''})`;
  const sel = (prop, opts, cur, rebuild) =>
    `<select onchange="${set(prop, 'this.value', rebuild)}">${opts
      .map(([v, l]) => `<option value="${esc(v)}"${String(cur) === String(v) ? ' selected' : ''}>${esc(l)}</option>`)
      .join('')}</select>`;
  const lab = (key18, inner) => `<label><span>${esc(t(key18))}</span>${inner}</label>`;
  const fonts = [
    ['', t('tx_font_std')],
    ['head', t('tx_font_head')],
    ['body', t('tx_font_body')],
    ...txFonts().map((f) => [f, f]),
  ];
  if (it.font && !fonts.some(([v]) => v === it.font)) fonts.push([it.font, it.font]);
  const weights = [...(built ? [[0, t('tx_font_std')]] : []), ...TX_WEIGHTS.map((w) => [w, t(TX_W_KEYS[w])])];
  let h = `<details class="txc" data-key="${key}" id="txc_${key.replace(':', '_')}"${open ? ' open' : ''}><summary><span class="txn">${esc(txName(key))}</span>${built ? ` <span class="txmore">${esc(t('tx_more'))}</span>` : ''}</summary>`;
  if (!built)
    h +=
      `<textarea rows="2" oninput="${set('text', 'this.value')}" placeholder="${esc(t('tx_new'))}">${esc(it.text)}</textarea>` +
      `<div class="row2">${lab(
        'tx_anchor',
        sel(
          'anchor',
          [
            ['page', t('tx_anchor_page')],
            ['map', t('tx_anchor_map')],
          ],
          it.anchor,
          true,
        ),
      )}${lab(
        'tx_align',
        sel(
          'align',
          [
            ['l', t('al_left')],
            ['c', t('al_center')],
            ['r', t('al_right')],
          ],
          it.align,
        ),
      )}</div>`;
  h += `<div class="row2">${lab('tx_font', sel('font', fonts, it.font))}${lab('tx_weight', sel('weight', weights, it.weight || (built ? 0 : 700)))}</div>`;
  h += `<div class="row2">${lab(
    'tx_size',
    `<input type="number" class="txsz" min="6" max="400" step="1" value="${it.size || ''}" placeholder="${esc(t('tx_auto'))}" oninput="${set('size', 'this.value')}"/>`,
  )}${lab(
    'tx_colour',
    `<span class="row txcol"><input type="color" value="${it.color || '#222222'}" oninput="${set('color', 'this.value')};this.nextElementSibling.classList.remove('on')"/><button class="chip sm${it.color ? '' : ' on'}" onclick="${set('color', "''", true)}">${esc(t('tx_auto'))}</button></span>`,
  )}</div>`;
  if (!built)
    h += `<div class="row2">${lab(
      'tx_fx',
      sel(
        'fx',
        TX_FX.map((f) => [f, t((TX_SUB_FX.includes(f) ? 'sfx_' : 'tfx_') + f)]),
        it.fx,
      ),
    )}<label class="ck txbox"><input type="checkbox"${it.box ? ' checked' : ''} onchange="${set('box', 'this.checked')}"/> <span>${esc(t('tx_box'))}</span></label></div>`;
  if (typeof ruleCard === 'function')
    h +=
      `<input type="url" value="${esc(it.link)}" placeholder="${esc(t('ph_link'))}" oninput="${set('link', 'this.value')}"/>` +
      ruleCard(key, it);
  h += `<div class="row"><label class="ck"><input type="checkbox"${it.hide ? ' checked' : ''} onchange="${set('hide', 'this.checked')}"/> <span>${esc(t('tx_hide'))}</span></label>${built ? '' : `<button class="chip sm txdel" onclick="delText('${key}')">${esc(t('delete'))}</button>`}</div>`;
  return h + '</details>';
}
// open an item's card in the panel
function txEdit(key) {
  TX_OPEN = key;
  textsUI();
  jumpTo('#txc_' + key.replace(':', '_'));
}
function textsUI() {
  const box = document.getElementById('txList');
  if (!box) return;
  const open = new Set([...box.querySelectorAll('details[open]')].map((d) => d.dataset.key));
  box.innerHTML = ['title', 'sub', ...S.texts.map(txKey)].map((k) => txCard(k, open.has(k) || k === TX_OPEN)).join('');
  TX_OPEN = '';
}

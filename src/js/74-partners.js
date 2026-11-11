// Partner footer: order (array order), visibility (p.hidden), row (p.row) and layout options (S.footer).
// Order and rows can be changed in the list (drag, ▲▼) and on the map: drag a logo – near the footer it snaps
// into the nearest row and slot (with Ctrl, or snapping off, it keeps its slot and stays where it is dropped);
// dropped anywhere else it becomes a free logo (p.at) that leaves its slot to the others.
const FOOTER_DEFAULT = { rows: 1, autoScale: true, margin: 5, align: 'left' };
S.footer = Object.assign({}, FOOTER_DEFAULT);
function footerOpts() {
  const f = Object.assign({}, FOOTER_DEFAULT, S.footer || {});
  f.rows = Math.max(1, Math.min(4, Math.round(+f.rows) || 1));
  f.margin = Math.max(0, Math.min(20, +f.margin));
  if (!Number.isFinite(f.margin)) f.margin = FOOTER_DEFAULT.margin;
  if (!['left', 'center', 'right'].includes(f.align)) f.align = 'left';
  // each row can have its own alignment; '' = the common one
  f.rowAlign = [...Array(f.rows)].map((_, r) => {
    const a = (Array.isArray(f.rowAlign) ? f.rowAlign : [])[r];
    // a single row simply follows the common setting (it has no field of its own)
    return f.rows > 1 && ['left', 'center', 'right'].includes(a) ? a : '';
  });
  return f;
}
// link form: common alignment + one letter per row ('-' = the common one), e.g. "lc-r"
const AL_CH = { left: 'l', center: 'c', right: 'r' };
const AL_OF = { l: 'left', c: 'center', r: 'right' };
function footerAlignCode(f) {
  return (
    (AL_CH[f.align] || 'l') +
    (f.rowAlign || [])
      .map((a) => AL_CH[a] || '-')
      .join('')
      .replace(/-+$/, '')
  );
}
function setRowAlign(r, v) {
  const f = footerOpts();
  f.rowAlign[r] = v;
  S.footer = f;
  ui();
  render();
}
// a partner's own size on top of the common scale (0.3–3, 1 = normal)
const pScale = (p) => Math.max(0.3, Math.min(3, +p.scale || 1));
const partnerShown = (p) => !p.hidden && ((p.logo && p.logo.src) || p.name);
const partnerRow = (p) => Math.max(0, Math.min(footerOpts().rows - 1, Math.round(+p.row) || 0));
// stable ids (drag offsets are stored per partner, not per position)
function partnerIds() {
  const seen = new Set();
  S.partners.forEach((p, i) => {
    let id =
      p.id ||
      String(p.name || 'p' + i)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 24) ||
      'p' + i;
    while (seen.has(id)) id += '-' + i;
    seen.add(id);
    p.id = id;
  });
}
// a free logo: p.at = [x, y], its centre as fractions of the page. (S.drag['pt:<id>'] is something else: the
// offset of a logo that keeps its slot, as links and projects have stored it all along.)
const partnerFree = (p) => Array.isArray(p.at) && p.at.length === 2 && p.at.every(Number.isFinite);
const partnersOn = () => document.getElementById('showFooter').checked;
// the height the rows need (and, while the footer is empty, the band at the bottom that takes a logo back)
const footerBand = () => Math.round(H * 0.11) + 20 + (footerOpts().rows - 1) * Math.round(H * 0.075);
function footerHeight() {
  if (!partnersOn() || !S.partners.some((p) => partnerShown(p) && !partnerFree(p))) return 0;
  return footerBand();
}
// only free logos are shown: they are drawn without a footer
const partnersLoose = () => !FOOT && partnersOn() && S.partners.some((p) => partnerShown(p) && partnerFree(p));
// the footer's partner logos and the free ones: returns SVG; records slots for drag-and-drop
// c: { fy, ink, dark, bg, lf, head, label, tOp, dragOf, links }
function partnersSvg(c) {
  partnerIds();
  const f = footerOpts();
  const rowH = (FOOT || footerBand()) / f.rows;
  const m = (W * f.margin) / 100;
  const avail = W - 2 * m;
  const lh0 = Math.min(rowH * 0.5, Math.round(H * 0.11) + 20) * (f.rows > 1 ? 1.1 : 1);
  const gap0 = Math.round(W * 0.03);
  const rows = [...Array(f.rows)].map(() => []);
  S.partners.forEach((p) => partnerShown(p) && !partnerFree(p) && rows[partnerRow(p)].push(p));
  const natW = (p, lh) =>
    pScale(p) * (p.logo && p.logo.src ? Math.min(lh * (p.logo.aspect || 2), W * 0.2) : textW(p.name, c.head, 700, 13));
  const labelW = c.label ? textW(c.label.toUpperCase(), c.lf, 400, 11, 1) : 0;
  // one scale for all rows, so the logos keep the same size relative to each other
  let s = 1;
  if (f.autoScale)
    rows.forEach((r, ri) => {
      const tot =
        r.reduce((a, p) => a + natW(p, lh0), 0) +
        gap0 * Math.max(0, r.length - 1) +
        (ri === 0 && labelW ? labelW + gap0 : 0);
      if (tot > avail) s = Math.min(s, avail / tot);
      // and the tallest logo (with its own size) stays inside its row, frame included
      const tall = Math.max(0, ...r.filter((p) => p.logo && p.logo.src).map(pScale));
      if (tall && lh0 * tall + 12 > rowH * 0.92) s = Math.min(s, (rowH * 0.92 - 12) / (lh0 * tall));
    });
  const lh = lh0 * s,
    gap = gap0 * s;
  let out = '';
  const slots = [];
  const ys = rows.map((_, ri) => c.fy + rowH * (ri + 0.5));
  // one logo (or name), its left edge at x and its middle at ty; w: its width
  const draw = (p, x, ty, w) => {
    const key = 'pt:' + p.id;
    const [dx, dy] = c.dragOf(key);
    let inner;
    if (p.logo && p.logo.src) {
      const ph = lh * pScale(p);
      const by = ty - ph / 2;
      inner = `<rect x="${(x - 6 * s).toFixed(1)}" y="${(by - 6 * s).toFixed(1)}" width="${(w + 12 * s).toFixed(1)}" height="${(ph + 12 * s).toFixed(1)}" rx="4" fill="#ffffff" fill-opacity="${c.dark || !nearWhite(c.bg) ? 0.92 : 0}"/><image href="${p.logo.src}" x="${x.toFixed(1)}" y="${by.toFixed(1)}" width="${w.toFixed(1)}" height="${ph.toFixed(1)}" preserveAspectRatio="xMidYMid meet"/>`;
      if (p.link) c.links.push({ x: x + dx, y: by + dy, w, h: ph, url: p.link });
    } else {
      inner = `<text x="${x.toFixed(1)}" y="${(ty + 4 * s).toFixed(1)}" font-family="'${c.head}'" font-weight="700" font-size="${(13 * s * pScale(p)).toFixed(1)}" fill="${c.ink}">${esc(p.name)}</text>`;
      if (p.link) c.links.push({ x: x + dx, y: ty - 10 * s * pScale(p) + dy, w, h: 20 * s * pScale(p), url: p.link });
    }
    return `<g class="drg ptn" data-drag="${esc(key)}" pointer-events="all"${dx || dy ? ` transform="translate(${dx.toFixed(1)},${dy.toFixed(1)})"` : ''}>${inner}</g>`;
  };
  rows.forEach((r, ri) => {
    const ty = ys[ri];
    // row width at this scale, for centre / right alignment
    const rowW =
      r.reduce((a, p) => a + natW(p, lh0) * s, 0) +
      gap * Math.max(0, r.length - 1) +
      (ri === 0 && c.label ? labelW * s + (r.length ? gap : 0) : 0);
    const al = f.rowAlign[ri] || f.align;
    let x = al === 'center' ? (W - rowW) / 2 : al === 'right' ? W - m - rowW : m;
    if (ri === 0 && c.label) {
      out += `<text x="${x.toFixed(1)}" y="${(ty + 4 * s).toFixed(1)}" font-family="'${c.lf}'" font-size="${(11 * s).toFixed(1)}" letter-spacing="${s}" fill="${c.ink}" opacity="${c.tOp(0.75)}">${esc(c.label.toUpperCase())}</text>`;
      x += labelW * s + gap;
    }
    for (const p of r) {
      const w = natW(p, lh0) * s;
      out += draw(p, x, ty, w);
      slots.push({ id: p.id, row: ri, cx: x + w / 2 });
      x += w + gap;
    }
  });
  // the free logos, on top: centred on their own place, at the footer's common scale
  for (const p of S.partners)
    if (partnerShown(p) && partnerFree(p)) {
      const w = natW(p, lh0) * s;
      out += draw(p, p.at[0] * W - w / 2, p.at[1] * H, w);
    }
  if (!c.target) PT_LAYOUT = { slots, ys };
  return out;
}
let PT_LAYOUT = { slots: [], ys: [] };
// drop a dragged partner. Near the footer: it snaps into the nearest row / slot (keep – Ctrl, or snapping off –
// leaves a logo of the footer in its slot with its offset, as before). Anywhere else: it stays where it was
// dropped, as a free logo. True when the partners changed.
function partnerDrop(key, box, keep) {
  const id = key.slice(3);
  const i = S.partners.findIndex((p) => p.id === id);
  if (i < 0 || !box) return false;
  const [ox, oy] = (S.drag || {})[key] || [0, 0];
  const cx = (box[0] + box[2]) / 2 + ox,
    cy = (box[1] + box[3]) / 2 + oy;
  const d = Object.assign({}, S.drag);
  delete d[key];
  const near = cy > H - (FOOT || footerBand()) - 12;
  const p0 = S.partners[i];
  if (!near || (keep && partnerFree(p0))) {
    // (a logo that is free already moves by its offset: its box is not exactly centred on its place)
    const [ax, ay] = partnerFree(p0) ? [p0.at[0] * W + ox, p0.at[1] * H + oy] : [cx, cy];
    p0.at = [+(ax / W).toFixed(4), +(ay / H).toFixed(4)];
    S.drag = d;
    ui();
    return true;
  }
  if (keep) return false;
  const ys = PT_LAYOUT.ys;
  let row = 0;
  ys.forEach((y, r) => Math.abs(y - cy) < Math.abs(ys[row] - cy) && (row = r));
  const p = S.partners.splice(i, 1)[0];
  delete p.at;
  p.row = row;
  // before the first partner in that row whose centre lies right of the drop point
  const before = PT_LAYOUT.slots.find((sl) => sl.id !== id && sl.row === row && sl.cx > cx);
  let at = before ? S.partners.findIndex((q) => q.id === before.id) : -1;
  if (at < 0) {
    // after the last one in that row (or at the end)
    let last = -1;
    S.partners.forEach((q, k) => partnerShown(q) && partnerRow(q) === row && (last = k));
    at = last + 1 || S.partners.length;
  }
  S.partners.splice(at, 0, p);
  S.drag = d;
  ui();
  return true;
}
// a free logo goes back to its place in the footer
function partnerBack(i) {
  const p = S.partners[i];
  if (!p) return;
  delete p.at;
  const d = Object.assign({}, S.drag);
  delete d['pt:' + p.id];
  S.drag = d;
  ui();
  render();
}
// ---- list: drag to sort, ▲▼, row, visibility ----
function partnerMove(i, d) {
  const j = i + d;
  if (j < 0 || j >= S.partners.length) return;
  const [p] = S.partners.splice(i, 1);
  S.partners.splice(j, 0, p);
  ui();
  render();
}
function partnerSet(i, k, v) {
  S.partners[i][k] = v;
  ui();
  render();
}
let PT_DRAG = -1;
function partnerListDrop(e, j) {
  e.preventDefault();
  const i = PT_DRAG;
  PT_DRAG = -1;
  if (i < 0 || i === j) return;
  const [p] = S.partners.splice(i, 1);
  S.partners.splice(i < j ? j - 1 : j, 0, p);
  ui();
  render();
}
function setFooterOpt(k, v) {
  S.footer = Object.assign({}, footerOpts(), { [k]: v });
  ui();
  render();
}
function partnersUI() {
  partnerIds();
  const f = footerOpts();
  const n = S.partners.length;
  document.getElementById('partners').innerHTML =
    S.partners
      .map(
        (p, i) =>
          `<div class="partner${p.hidden ? ' off' : ''}" data-pid="${esc(p.id)}" draggable="true" ondragstart="PT_DRAG=${i};event.dataTransfer.effectAllowed='move'" ondragover="event.preventDefault()" ondrop="partnerListDrop(event, ${i})"><span class="grip" title="${esc(t('pt_drag_t'))}">⋮⋮</span><input type="checkbox" ${p.hidden ? '' : 'checked'} title="${esc(t('pt_show_t'))}" onchange="partnerSet(${i}, 'hidden', !this.checked)"/>${p.logo && p.logo.src ? `<img src="${p.logo.src}" alt="">` : '<span style="flex:0;width:70px;text-align:center;color:var(--mute)">(' + esc(t('text_only')) + ')</span>'}<span>${esc(p.name)}${p.link ? ` · <a href="${esc(p.link)}" target="_blank" rel="noopener" style="color:var(--accent2)">link</a>` : ''}</span>${f.rows > 1 ? `<select class="prow" title="${esc(t('pt_row'))}" onchange="partnerSet(${i}, 'row', +this.value)">${[...Array(f.rows)].map((_, r) => `<option value="${r}" ${partnerRow(p) === r ? 'selected' : ''}>${r + 1}</option>`).join('')}</select>` : ''}<input class="psize" type="number" min="30" max="300" step="10" value="${Math.round(pScale(p) * 100)}" title="${esc(t('pt_size_t'))}" onchange="partnerSet(${i}, 'scale', Math.max(30, Math.min(300, +this.value || 100)) / 100)"/>${partnerFree(p) ? `<button class="chip sm on" onclick="partnerBack(${i})" title="${esc(t('pt_back'))}">⤓</button>` : ''}<button class="chip sm" ${i ? '' : 'disabled'} onclick="partnerMove(${i}, -1)" title="${esc(t('pt_up'))}">▲</button><button class="chip sm" ${i < n - 1 ? '' : 'disabled'} onclick="partnerMove(${i}, 1)" title="${esc(t('pt_down'))}">▼</button><button class="x chip sm" onclick="removePartner(${i})">×</button></div>`,
      )
      .join('') || '<p class="note" style="margin:0">' + esc(t('no_partners')) + '</p>';
  // drop on the empty space after the last one = move to the end
  const end = document.getElementById('partners');
  end.ondragover = (e) => e.preventDefault();
  end.ondrop = (e) => e.target === end && partnerListDrop(e, S.partners.length);
  const shown = S.partners.filter(partnerShown).length;
  document.getElementById('partnerCount').textContent = (shown < n ? shown + '/' : '') + n + ' ' + t('partners');
  document.getElementById('ptRows').value = String(f.rows);
  document.getElementById('ptAuto').checked = !!f.autoScale;
  document.getElementById('ptAlign').value = f.align;
  // one alignment per row (only with several rows)
  document.getElementById('ptRowAlign').innerHTML =
    f.rows > 1
      ? f.rowAlign
          .map(
            (a, r) =>
              `<label><span>${esc(t('pt_row'))} ${r + 1}</span><select onchange="setRowAlign(${r}, this.value)">${['', 'left', 'center', 'right'].map((v) => `<option value="${v}" ${a === v ? 'selected' : ''}>${esc(t(v ? 'al_' + v : 'al_common'))}</option>`).join('')}</select></label>`,
          )
          .join('')
      : '';
  document.getElementById('ptMargin').value = f.margin;
  document.getElementById('ptMarginV').textContent = f.margin + ' %';
}
// share links: order / rows / size / visibility / free place of the profile's partners, e.g. "2.0r1.1s150h.3f812x4400"
// (r row, s size in %, h hidden, f<x>x<y> a free logo's centre in 1/10000 of the page)
function partnerOrderParam() {
  const prof = (DS[S.ds] && DS[S.ds].partners) || [];
  const idx = (p) => prof.findIndex((q) => q.name === p.name && (q.link || '') === (p.link || ''));
  const toks = S.partners
    .map((p) => [idx(p), p])
    .filter(([k]) => k >= 0)
    .map(
      ([k, p]) =>
        k +
        (partnerRow(p) ? 'r' + partnerRow(p) : '') +
        (pScale(p) !== 1 ? 's' + Math.round(pScale(p) * 100) : '') +
        (p.hidden ? 'h' : '') +
        (partnerFree(p) ? 'f' + Math.round(p.at[0] * 1e4) + 'x' + Math.round(p.at[1] * 1e4) : ''),
    );
  const plain = prof.map((_, k) => String(k)).join('.');
  const s = toks.join('.');
  return s === plain ? '' : s;
}
function applyPartnerOrder(s) {
  const prof = S.partners.slice();
  const out = [];
  for (const tok of String(s).split('.')) {
    const m = /^(\d+)(?:r(\d))?(?:s(\d+))?(h)?(?:f(-?\d+)x(-?\d+))?$/.exec(tok);
    if (!m || !prof[+m[1]] || out.includes(prof[+m[1]])) continue;
    const p = prof[+m[1]];
    p.row = m[2] ? +m[2] : 0;
    p.scale = m[3] ? +m[3] / 100 : 1;
    p.hidden = !!m[4];
    if (m[5]) p.at = [+m[5] / 1e4, +m[6] / 1e4];
    else delete p.at;
    out.push(p);
  }
  S.partners = out.concat(prof.filter((p) => !out.includes(p)));
}

// a partner logo is a page item (71-page-items.js): the wheel over it, or its corner handle, changes its size
pageItem({
  has: (key) => key.startsWith('pt:') && S.partners.some((p) => 'pt:' + p.id === key),
  get: (key) => pScale(S.partners.find((p) => 'pt:' + p.id === key)),
  set: (key, v) => (S.partners.find((p) => 'pt:' + p.id === key).scale = v),
  lo: 0.3,
  hi: 3,
  step: 0.01,
  sync: partnersUI,
});

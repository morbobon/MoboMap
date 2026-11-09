// Partner footer: order (array order), visibility (p.hidden), row (p.row) and layout options (S.footer).
// Order and rows can be changed in the list (drag, ▲▼) and on the map: drag a logo – it snaps into the
// nearest row and slot; with Ctrl (or snapping off) it stays exactly where it is dropped.
const FOOTER_DEFAULT = { rows: 1, autoScale: true, margin: 5, align: 'left' };
S.footer = Object.assign({}, FOOTER_DEFAULT);
function footerOpts() {
  const f = Object.assign({}, FOOTER_DEFAULT, S.footer || {});
  f.rows = Math.max(1, Math.min(4, Math.round(+f.rows) || 1));
  f.margin = Math.max(0, Math.min(20, +f.margin));
  if (!Number.isFinite(f.margin)) f.margin = FOOTER_DEFAULT.margin;
  if (!['left', 'center', 'right'].includes(f.align)) f.align = 'left';
  return f;
}
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
function footerHeight() {
  if (!document.getElementById('showFooter').checked || !S.partners.some(partnerShown)) return 0;
  return Math.round(H * 0.11) + 20 + (footerOpts().rows - 1) * Math.round(H * 0.075);
}
// the footer's partner logos: returns SVG; records slots for drag-and-drop
// c: { fy, ink, dark, bg, lf, head, label, tOp, dragOf, links }
function partnersSvg(c) {
  partnerIds();
  const f = footerOpts();
  const rowH = FOOT / f.rows;
  const m = (W * f.margin) / 100;
  const avail = W - 2 * m;
  const lh0 = Math.min(rowH * 0.5, Math.round(H * 0.11) + 20) * (f.rows > 1 ? 1.1 : 1);
  const gap0 = Math.round(W * 0.03);
  const rows = [...Array(f.rows)].map(() => []);
  S.partners.forEach((p) => partnerShown(p) && rows[partnerRow(p)].push(p));
  const natW = (p, lh) =>
    p.logo && p.logo.src ? Math.min(lh * (p.logo.aspect || 2), W * 0.2) : textW(p.name, c.head, 700, 13);
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
    });
  const lh = lh0 * s,
    gap = gap0 * s;
  let out = '';
  const slots = [];
  const ys = rows.map((_, ri) => c.fy + rowH * (ri + 0.5));
  rows.forEach((r, ri) => {
    const ty = ys[ri];
    // row width at this scale, for centre / right alignment
    const rowW =
      r.reduce((a, p) => a + natW(p, lh0) * s, 0) +
      gap * Math.max(0, r.length - 1) +
      (ri === 0 && c.label ? labelW * s + (r.length ? gap : 0) : 0);
    let x = f.align === 'center' ? (W - rowW) / 2 : f.align === 'right' ? W - m - rowW : m;
    if (ri === 0 && c.label) {
      out += `<text x="${x.toFixed(1)}" y="${(ty + 4 * s).toFixed(1)}" font-family="'${c.lf}'" font-size="${(11 * s).toFixed(1)}" letter-spacing="${s}" fill="${c.ink}" opacity="${c.tOp(0.75)}">${esc(c.label.toUpperCase())}</text>`;
      x += labelW * s + gap;
    }
    for (const p of r) {
      const key = 'pt:' + p.id;
      const [dx, dy] = c.dragOf(key);
      const w = natW(p, lh0) * s;
      let inner;
      if (p.logo && p.logo.src) {
        const by = ty - lh / 2;
        inner = `<rect x="${(x - 6 * s).toFixed(1)}" y="${(by - 6 * s).toFixed(1)}" width="${(w + 12 * s).toFixed(1)}" height="${(lh + 12 * s).toFixed(1)}" rx="4" fill="#ffffff" fill-opacity="${c.dark || !nearWhite(c.bg) ? 0.92 : 0}"/><image href="${p.logo.src}" x="${x.toFixed(1)}" y="${by.toFixed(1)}" width="${w.toFixed(1)}" height="${lh.toFixed(1)}" preserveAspectRatio="xMidYMid meet"/>`;
        if (p.link) c.links.push({ x: x + dx, y: by + dy, w, h: lh, url: p.link });
      } else {
        inner = `<text x="${x.toFixed(1)}" y="${(ty + 4 * s).toFixed(1)}" font-family="'${c.head}'" font-weight="700" font-size="${(13 * s).toFixed(1)}" fill="${c.ink}">${esc(p.name)}</text>`;
        if (p.link) c.links.push({ x: x + dx, y: ty - 10 * s + dy, w, h: 20 * s, url: p.link });
      }
      out += `<g class="drg ptn" data-drag="${esc(key)}" pointer-events="all"${dx || dy ? ` transform="translate(${dx.toFixed(1)},${dy.toFixed(1)})"` : ''}>${inner}</g>`;
      slots.push({ id: p.id, row: ri, cx: x + w / 2 });
      x += w + gap;
    }
  });
  if (!c.target) PT_LAYOUT = { slots, ys };
  return out;
}
let PT_LAYOUT = { slots: [], ys: [] };
// drop a dragged partner: snap into the nearest row / slot (or keep the free offset with Ctrl)
function partnerDrop(key, box, free) {
  const id = key.slice(3);
  const i = S.partners.findIndex((p) => p.id === id);
  if (i < 0 || free || !box) return false;
  const [ox, oy] = (S.drag || {})[key] || [0, 0];
  const cx = (box[0] + box[2]) / 2 + ox,
    cy = (box[1] + box[3]) / 2 + oy;
  const ys = PT_LAYOUT.ys;
  let row = 0;
  ys.forEach((y, r) => Math.abs(y - cy) < Math.abs(ys[row] - cy) && (row = r));
  const p = S.partners.splice(i, 1)[0];
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
  const d = Object.assign({}, S.drag);
  delete d[key];
  S.drag = d;
  ui();
  return true;
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
          `<div class="partner${p.hidden ? ' off' : ''}" draggable="true" ondragstart="PT_DRAG=${i};event.dataTransfer.effectAllowed='move'" ondragover="event.preventDefault()" ondrop="partnerListDrop(event, ${i})"><span class="grip" title="${esc(t('pt_drag_t'))}">⋮⋮</span><input type="checkbox" ${p.hidden ? '' : 'checked'} title="${esc(t('pt_show_t'))}" onchange="partnerSet(${i}, 'hidden', !this.checked)"/>${p.logo && p.logo.src ? `<img src="${p.logo.src}" alt="">` : '<span style="flex:0;width:70px;text-align:center;color:var(--mute)">(' + esc(t('text_only')) + ')</span>'}<span>${esc(p.name)}${p.link ? ` · <a href="${esc(p.link)}" target="_blank" rel="noopener" style="color:var(--accent2)">link</a>` : ''}</span>${f.rows > 1 ? `<select class="prow" title="${esc(t('pt_row'))}" onchange="partnerSet(${i}, 'row', +this.value)">${[...Array(f.rows)].map((_, r) => `<option value="${r}" ${partnerRow(p) === r ? 'selected' : ''}>${r + 1}</option>`).join('')}</select>` : ''}<button class="chip sm" ${i ? '' : 'disabled'} onclick="partnerMove(${i}, -1)" title="${esc(t('pt_up'))}">▲</button><button class="chip sm" ${i < n - 1 ? '' : 'disabled'} onclick="partnerMove(${i}, 1)" title="${esc(t('pt_down'))}">▼</button><button class="x chip sm" onclick="removePartner(${i})">×</button></div>`,
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
  document.getElementById('ptMargin').value = f.margin;
  document.getElementById('ptMarginV').textContent = f.margin + ' %';
}
// share links: order / rows / visibility of the profile's partners, e.g. "2.0r1.1h"
function partnerOrderParam() {
  const prof = (DS[S.ds] && DS[S.ds].partners) || [];
  const idx = (p) => prof.findIndex((q) => q.name === p.name && (q.link || '') === (p.link || ''));
  const toks = S.partners
    .map((p) => [idx(p), p])
    .filter(([k]) => k >= 0)
    .map(([k, p]) => k + (partnerRow(p) ? 'r' + partnerRow(p) : '') + (p.hidden ? 'h' : ''));
  const plain = prof.map((_, k) => String(k)).join('.');
  const s = toks.join('.');
  return s === plain ? '' : s;
}
function applyPartnerOrder(s) {
  const prof = S.partners.slice();
  const out = [];
  for (const tok of String(s).split('.')) {
    const m = /^(\d+)(?:r(\d))?(h)?$/.exec(tok);
    if (!m || !prof[+m[1]] || out.includes(prof[+m[1]])) continue;
    const p = prof[+m[1]];
    p.row = m[2] ? +m[2] : 0;
    p.hidden = !!m[3];
    out.push(p);
  }
  S.partners = out.concat(prof.filter((p) => !out.includes(p)));
}

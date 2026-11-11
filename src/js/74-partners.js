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
  if (!pageOpts().footer || !partnersInRows() || pbFree()) return 0;
  return footerBand();
}
// partners that sit in the bottom rows
const partnersInRows = () => partnersOn() && S.partners.some((p) => partnerShown(p) && !partnerFree(p));
// partners are shown but no footer holds them (only free logos, or the footer is switched off): drawn without one
const partnersLoose = () => !FOOT && partnersOn() && S.partners.some((p) => partnerShown(p));
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
  const pb = pbOpts(),
    k = pb.scale,
    z = s * k; // what the block is drawn at: the common scale times its own
  const slots = [];
  const ys = rows.map((_, ri) => c.fy + rowH * (ri + 0.5));
  // one logo (or name), its left edge at x and its middle at ty; w: its width; q: the scale it is drawn at;
  // off: the drag offset of the block it sits in
  const draw = (p, x, ty, w, q, off) => {
    const key = 'pt:' + p.id;
    const [dx, dy] = c.dragOf(key);
    let inner;
    if (p.logo && p.logo.src) {
      const ph = lh0 * q * pScale(p);
      const by = ty - ph / 2;
      inner = `<rect x="${(x - 6 * q).toFixed(1)}" y="${(by - 6 * q).toFixed(1)}" width="${(w + 12 * q).toFixed(1)}" height="${(ph + 12 * q).toFixed(1)}" rx="4" fill="#ffffff" fill-opacity="${c.dark || !nearWhite(c.bg) ? 0.92 : 0}"/><image href="${p.logo.src}" x="${x.toFixed(1)}" y="${by.toFixed(1)}" width="${w.toFixed(1)}" height="${ph.toFixed(1)}" preserveAspectRatio="xMidYMid meet"/>`;
      if (p.link) c.links.push({ x: x + dx + off[0], y: by + dy + off[1], w, h: ph, url: p.link });
    } else {
      inner = `<text x="${x.toFixed(1)}" y="${(ty + 4 * q).toFixed(1)}" font-family="'${c.head}'" font-weight="700" font-size="${(13 * q * pScale(p)).toFixed(1)}" fill="${c.ink}">${esc(p.name)}</text>`;
      if (p.link)
        c.links.push({
          x: x + dx + off[0],
          y: ty - 10 * q * pScale(p) + dy + off[1],
          w,
          h: 20 * q * pScale(p),
          url: p.link,
        });
    }
    return `<g class="drg ptn" data-drag="${esc(key)}" pointer-events="all"${dx || dy ? ` transform="translate(${dx.toFixed(1)},${dy.toFixed(1)})"` : ''}>${inner}</g>`;
  };
  // where everything in the rows sits before the block is moved or resized: [partner (null: the label), x, ty, w, h]
  const items = [];
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
      items.push([null, x, ty, labelW * s, 16 * s]);
      x += labelW * s + gap;
    }
    for (const p of r) {
      const w = natW(p, lh0) * s;
      items.push([p, x, ty, w, p.logo && p.logo.src ? lh * pScale(p) + 12 * s : 20 * s * pScale(p)]);
      x += w + gap;
    }
  });
  // the block: the rows as one item with its own place (pb.at: its centre) and size. In the footer it grows from
  // the side it is aligned to.
  let X = (x) => x,
    Y = (y) => y,
    frame = null;
  if (items.length) {
    const bx0 = Math.min(...items.map((i) => i[1])),
      bx1 = Math.max(...items.map((i) => i[1] + i[3])),
      by0 = Math.min(...items.map((i) => i[2] - i[4] / 2)),
      by1 = Math.max(...items.map((i) => i[2] + i[4] / 2));
    const cx = (bx0 + bx1) / 2,
      cy = (by0 + by1) / 2;
    if (pb.at || k !== 1) {
      const ox = pb.at || f.align === 'center' ? cx : f.align === 'right' ? bx1 : bx0,
        tx = pb.at ? pb.at[0] * W : ox,
        ty = pb.at ? pb.at[1] * H : cy;
      X = (x) => tx + (x - ox) * k;
      Y = (y) => ty + (y - cy) * k;
    }
    const pad = 10 * s;
    frame = [X(bx0 - pad), Y(by0 - pad), X(bx1 + pad), Y(by1 + pad)];
  }
  const off = frame ? c.dragOf('ptblock') : [0, 0];
  let out = '';
  for (const [p, x, ty, w] of items) {
    if (p) {
      out += draw(p, X(x), Y(ty), w * k, z, off);
      slots.push({ id: p.id, row: partnerRow(p), cx: X(x + w / 2) });
    } else
      out += `<text x="${X(x).toFixed(1)}" y="${(Y(ty) + 4 * z).toFixed(1)}" font-family="'${c.lf}'" font-size="${(11 * z).toFixed(1)}" letter-spacing="${z}" fill="${c.ink}" opacity="${c.tOp(0.75)}">${esc(c.label.toUpperCase())}</text>`;
  }
  if (frame) {
    if (pb.bd) out = pbBorder(pb, frame, k, c.ink) + out;
    // on screen, while the items can be moved: the block is one item (drag, wheel, corner handle), with an area
    // that lights up under the pointer (app.css). Never in an export, a locked page or viewer mode.
    if (!c.target && !lockOn('items') && !lockOn('edit'))
      out = `<g class="drg ptb" data-drag="ptblock" pointer-events="all"${off[0] || off[1] ? ` transform="translate(${off[0].toFixed(1)},${off[1].toFixed(1)})"` : ''}><rect class="ptb-hl" x="${(frame[0] - 5).toFixed(1)}" y="${(frame[1] - 5).toFixed(1)}" width="${(frame[2] - frame[0] + 10).toFixed(1)}" height="${(frame[3] - frame[1] + 10).toFixed(1)}" rx="8" fill="none"/>${out}</g>`;
  }
  // the free logos, on top: centred on their own place, at the footer's common scale
  for (const p of S.partners)
    if (partnerShown(p) && partnerFree(p)) {
      const w = natW(p, lh0) * s;
      out += draw(p, p.at[0] * W - w / 2, p.at[1] * H, w, s, [0, 0]);
    }
  if (!c.target) PT_LAYOUT = { slots, ys: ys.map(Y), band: [Y(c.fy), Y(c.fy + rowH * f.rows)] };
  return out;
}
let PT_LAYOUT = { slots: [], ys: [], band: null };
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
  const band = pbFree() && PT_LAYOUT.band;
  const near = band ? cy > band[0] - 12 && cy < band[1] + 12 : cy > H - (FOOT || footerBand()) - 12;
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
  pbUI();
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

// ---- the partner block: the label and the logos in their rows as one item, with an optional border ----
// S.pblock (null = as it comes), stored in projects (pblock) and links (pb=) only where it differs:
//   bd, bw, br, bc, bs   border: on, thickness, corner rounding, colour ('' = the text colour), line style
//   at                   null: in the footer rows; [x, y]: the block's centre as fractions of the page
//   scale                the block's own size on top of the logos' (0.3–3)
const PB_LINES = ['solid', 'dashed', 'dotted', 'double'];
const PB_LINE_NAME = { solid: 'pb_ls_solid', dashed: 'pb_ls_dashed', dotted: 'pb_ls_dotted', double: 'pb_ls_double' };
const PB_DEFAULT = { bd: false, bw: 1.5, br: 6, bc: '', bs: 'solid', at: null, scale: 1 };
S.pblock = null;
function pbClean(o) {
  o = o && typeof o === 'object' ? o : {};
  const n = (v, lo, hi, d) => (v != null && v !== '' && Number.isFinite(+v) ? Math.max(lo, Math.min(hi, +v)) : d);
  const at = Array.isArray(o.at) && o.at.length === 2 && o.at.every(Number.isFinite) ? o.at : null;
  return {
    bd: !!o.bd,
    bw: n(o.bw, 0.5, 12, PB_DEFAULT.bw),
    br: n(o.br, 0, 60, PB_DEFAULT.br),
    bc: /^#[0-9a-f]{6}$/i.test(o.bc || '') ? o.bc.toLowerCase() : '',
    bs: PB_LINES.includes(o.bs) ? o.bs : 'solid',
    at: at && at.map((v) => +Math.max(0, Math.min(1, v)).toFixed(4)),
    scale: n(o.scale, 0.3, 3, 1),
  };
}
const pbOpts = () => pbClean(S.pblock);
// the block has its own place on the page: the footer keeps no room for it
const pbFree = () => !!pbOpts().at;
// what a project stores: only what differs
function pbOut() {
  const o = pbOpts(),
    d = {};
  for (const k of Object.keys(PB_DEFAULT)) if (JSON.stringify(o[k]) !== JSON.stringify(PB_DEFAULT[k])) d[k] = o[k];
  return Object.keys(d).length ? { pblock: d } : {};
}
// link form: tokens joined by dots – b (border), w15 (thickness in tenths), r6 (rounding), c<hex> (colour),
// s1–3 (dashed, dotted, double), a<x>x<y> (its place, 1/10000 of the page), z120 (size in %)
function pbCode(o) {
  o = pbClean(o);
  const a = [];
  if (o.bd) a.push('b');
  if (o.bw !== PB_DEFAULT.bw) a.push('w' + Math.round(o.bw * 10));
  if (o.br !== PB_DEFAULT.br) a.push('r' + Math.round(o.br));
  if (o.bc) a.push('c' + o.bc.slice(1));
  if (o.bs !== 'solid') a.push('s' + PB_LINES.indexOf(o.bs));
  if (o.at) a.push('a' + Math.round(o.at[0] * 1e4) + 'x' + Math.round(o.at[1] * 1e4));
  if (o.scale !== 1) a.push('z' + Math.round(o.scale * 100));
  return a.join('.');
}
function pbFromCode(s) {
  const o = {};
  for (const tok of String(s || '').split('.')) {
    const v = tok.slice(1);
    if (tok === 'b') o.bd = true;
    else if (/^w\d+$/.test(tok)) o.bw = +v / 10;
    else if (/^r\d+$/.test(tok)) o.br = +v;
    else if (/^c[0-9a-f]{6}$/i.test(tok)) o.bc = '#' + v;
    else if (/^s[1-3]$/.test(tok)) o.bs = PB_LINES[+v];
    else if (/^z\d+$/.test(tok)) o.scale = +v / 100;
    else {
      const m = /^a(\d+)x(\d+)$/.exec(tok);
      if (m) o.at = [+m[1] / 1e4, +m[2] / 1e4];
    }
  }
  return pbClean(o);
}
function pbSet(k, v) {
  S.pblock = pbClean(Object.assign({}, pbOpts(), { [k]: v }));
  pbUI();
  render();
}
// the border: a rounded rectangle around the block; [x0, y0, x1, y1], k: the block's own scale
function pbBorder(pb, [x0, y0, x1, y1], k, ink) {
  const w = pb.bw * k,
    col = pb.bc || ink;
  const rect = (i, sw, extra) =>
    `<rect x="${(x0 + i).toFixed(1)}" y="${(y0 + i).toFixed(1)}" width="${Math.max(0, x1 - x0 - 2 * i).toFixed(1)}" height="${Math.max(0, y1 - y0 - 2 * i).toFixed(1)}" rx="${Math.max(0, Math.min(pb.br * k, (x1 - x0) / 2, (y1 - y0) / 2) - i).toFixed(1)}" fill="none" stroke="${col}" stroke-width="${sw.toFixed(2)}"${extra}/>`;
  if (pb.bs === 'double') return rect(0, w * 0.5, '') + rect(w * 1.5, w * 0.5, '');
  if (pb.bs === 'dashed') return rect(0, w, ` stroke-dasharray="${(w * 4).toFixed(1)} ${(w * 2.5).toFixed(1)}"`);
  if (pb.bs === 'dotted') return rect(0, w, ` stroke-dasharray="0 ${(w * 2.2).toFixed(1)}" stroke-linecap="round"`);
  return rect(0, w, '');
}
// the dragged block is dropped: over the bottom rows it goes back to the footer (keep – Ctrl, or snapping off –
// leaves it where it is), anywhere else it stays as a block with its own place
function pbDrop(box, keep) {
  const [ox, oy] = (S.drag || {}).ptblock || [0, 0];
  const d = Object.assign({}, S.drag);
  delete d.ptblock;
  S.drag = d;
  if (!box) return true;
  const cx = (box[0] + box[2]) / 2 + ox,
    cy = (box[1] + box[3]) / 2 + oy;
  const home = !keep && cy > H - (FOOT || footerBand()) - 12;
  S.pblock = pbClean(Object.assign({}, pbOpts(), { at: home ? null : [cx / W, cy / H] }));
  pbUI();
  return true;
}
// the colour the border gets when it leaves the text colour: the last one picked
const pbOwnColour = () => pbOpts().bc || document.getElementById('pbCol').value || '#000000';
// the block goes back into the footer rows
function pbBack() {
  pbSet('at', null);
}
function pbUI() {
  const o = pbOpts(),
    el = (id) => document.getElementById(id),
    pct = Math.round(o.scale * 100);
  el('pbBd').checked = o.bd;
  el('pbBorder').hidden = !o.bd;
  el('pbW').value = o.bw;
  el('pbWV').textContent = o.bw;
  el('pbR').value = o.br;
  el('pbRV').textContent = o.br;
  el('pbLine').innerHTML = PB_LINES.map(
    (id) => `<option value="${id}"${o.bs === id ? ' selected' : ''}>${esc(t(PB_LINE_NAME[id]))}</option>`,
  ).join('');
  el('pbColMode').value = o.bc ? 'own' : 'ink';
  el('pbCol').hidden = !o.bc;
  if (o.bc) el('pbCol').value = o.bc;
  el('pbSize').value = pct;
  el('pbSizeV').textContent = pct + ' %';
  el('pbBack').hidden = !o.at;
}
pageItem({
  has: (key) => key === 'ptblock',
  get: () => pbOpts().scale,
  set: (key, v) => (S.pblock = pbClean(Object.assign({}, pbOpts(), { scale: v }))),
  lo: 0.3,
  hi: 3,
  step: 0.01,
  sync: pbUI,
});
// the hint at the block (not at a single logo in it): mouse only, and only while it can be moved
document.getElementById('svg').addEventListener('mousemove', (e) => {
  const g = e.target.closest && e.target.closest('.ptb');
  if (!g || e.target.closest('.ptn') || textDrag || PI.drag) return;
  tip.textContent = t(pbFree() ? 'pb_hint_free' : 'pb_hint');
  tip.style.display = 'block';
  tip.style.left = Math.max(4, Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 4)) + 'px';
  tip.style.top = Math.max(4, e.clientY - 34) + 'px';
});

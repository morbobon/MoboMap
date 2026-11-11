// the page as an SVG to rasterize: no pulsing pins or hover outline, fonts embedded
function exportSvg() {
  const el = document.getElementById('svg').cloneNode(true);
  el.querySelectorAll('.pulse').forEach((c) => c.removeAttribute('class'));
  el.querySelector('#hoverwrap')?.remove();
  // texts left out of exports; the others are drawn whatever their rule (the page's styles do not reach the image)
  el.querySelectorAll('[data-exp="0"]').forEach((e) => e.remove());
  el.insertAdjacentHTML('afterbegin', `<style>${allFontCSS()}</style>`);
  return el;
}
async function renderCanvas(scale) {
  return renderPart(exportSvg(), [0, 0, W, H], W * scale, H * scale);
}
// one rectangle of the page (SVG units) drawn from the vector page at w x h pixels: sharp at any resolution
async function renderPart(el, box, w, h) {
  el.setAttribute('viewBox', box.join(' '));
  el.setAttribute('width', w);
  el.setAttribute('height', h);
  const src = new XMLSerializer().serializeToString(el);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const img = new Image();
  const url = URL.createObjectURL(new Blob([src], { type: 'image/svg+xml;charset=utf-8' }));
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
    img.src = url;
  });
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  return c;
}
function exportName() {
  const slug = (v) =>
    String(v)
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  return [
    'mobomap',
    slug(S.country ? countryName(S.country) : 'world'),
    S.focus ? slug(GEO.groups[S.focus] || S.focus) : '',
    S.style,
    S.layout,
  ]
    .filter(Boolean)
    .join('-');
}
// clickable areas in a PDF: links in the footer and the profile's logo; x0/y0 the page's place, r mm per unit
function pdfLinks(pdf, x0, y0, r) {
  const lk = (x, y, w, h, url) => {
    const [ax, ay] = fxToArt(x, y);
    pdf.link(x0 + ax * r, y0 + ay * r, w * FXL.s * r, h * FXL.s * r, { url });
  };
  for (const l of window._links || []) lk(l.x, l.y, l.w, l.h, l.url);
  const D = DS[S.ds];
  const lo = (S.drag && S.drag.logo) || [0, 0];
  if (D.company.link) lk(W - PAD.l - 240 + lo[0], 30 + lo[1], 260, 70, D.company.link);
}
async function exportMap(fmt) {
  toast(t('ts_generating') + ' ' + fmt.toUpperCase() + ' …');
  const c = await renderCanvas(3);
  const name = exportName();
  if (fmt === 'png') dl(c.toDataURL('image/png'), name + '.png');
  else if (fmt === 'jpg') dl(c.toDataURL('image/jpeg', 0.93), name + '.jpg');
  else {
    const { jsPDF } = loadJsPDF();
    const pdf = new jsPDF({ orientation: W >= H ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
    const pw = pdf.internal.pageSize.getWidth(),
      ph = pdf.internal.pageSize.getHeight();
    const r = Math.min(pw / W, ph / H);
    const x0 = (pw - W * r) / 2,
      y0 = (ph - H * r) / 2;
    pdf.addImage(c.toDataURL('image/jpeg', 0.95), 'JPEG', x0, y0, W * r, H * r);
    pdfLinks(pdf, x0, y0, r);
    pdf.save(name + '.pdf');
  }
  toast(fmt.toUpperCase() + ' ' + t('ts_downloaded'));
}

// ---------- Export → Print…: the real paper size at a chosen resolution ----------
// Paper sizes in mm (portrait). Each is offered for every layout; the map is fitted on the page, filling it when the
// layout has the paper's shape (A4 · A3 layouts: A5–A0; Letter, Legal, Tabloid).
const PAPER = [
  ['A5', 148, 210],
  ['A4', 210, 297],
  ['A3', 297, 420],
  ['A2', 420, 594],
  ['A1', 594, 841],
  ['A0', 841, 1189],
  ['Letter', 215.9, 279.4],
  ['Legal', 215.9, 355.6],
  ['Tabloid', 279.4, 431.8],
];
const PRINT_KEY = 'mobomap.print';
// what one canvas may hold: iPhone and iPad stop at 16.7 megapixels, others are kept to 100 (memory). PDFs are
// built from tiles below that, so only PNG and JPG are limited.
const IOS =
  /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const CANVAS_MAX = { area: IOS ? 16.7e6 : 100e6, side: 16384 },
  TILE = 4000;
function printOpts() {
  try {
    return JSON.parse(localStorage.getItem(PRINT_KEY) || '{}');
  } catch {
    return {};
  }
}
// a paper size [name, w, h] in the layout's orientation
const paperOf = (p) => (W > H ? [p[2], p[1]] : [p[1], p[2]]);
const paperFits = (p) => {
  const [pw, ph] = paperOf(p);
  return Math.abs(pw / ph - W / H) < 0.01;
};
function openPrint() {
  document.getElementById('expMenu').classList.remove('open');
  const o = printOpts(),
    sel = document.getElementById('prSize');
  sel.innerHTML =
    PAPER.map((p) => {
      const [pw, ph] = paperOf(p);
      const fit = paperFits(p) ? '' : ' · ' + esc(t('print_fitted'));
      return `<option value="${p[0]}">${p[0]} · ${+pw.toFixed(1)} × ${+ph.toFixed(1)} mm${fit}</option>`;
    }).join('') + `<option value="custom">${esc(t('print_custom'))}</option>`;
  // the last choice, else the common paper this layout is shaped for (A4, Letter …), else A4
  const common = ['A4', 'Letter', 'Legal', 'Tabloid'].map((n) => PAPER.find((p) => p[0] === n));
  sel.value =
    o.size === 'custom' || PAPER.some((p) => p[0] === o.size) ? o.size : (common.find(paperFits) || PAPER[1])[0];
  document.getElementById('prWidth').value = o.width || 300;
  document.getElementById('prDpi').value = [150, 300, 600].includes(+o.dpi) ? o.dpi : 300;
  document.getElementById('prFmt').value = ['pdf', 'png', 'jpg'].includes(o.fmt) ? o.fmt : 'pdf';
  printUpdate();
  document.getElementById('printDlg').showModal();
}
// the page (pw x ph mm), the map on it (iw x ih mm, r mm per SVG unit) and its pixels at the resolution
function printPlan() {
  const size = document.getElementById('prSize').value,
    dpi = +document.getElementById('prDpi').value,
    fmt = document.getElementById('prFmt').value;
  let pw, ph;
  if (size === 'custom') {
    pw = Math.min(5000, Math.max(20, +document.getElementById('prWidth').value || 300));
    ph = (pw * H) / W;
  } else [pw, ph] = paperOf(PAPER.find((p) => p[0] === size));
  const r = Math.min(pw / W, ph / H),
    iw = W * r,
    ih = H * r;
  return { size, dpi, fmt, pw, ph, r, iw, ih, px: Math.round((iw / 25.4) * dpi), py: Math.round((ih / 25.4) * dpi) };
}
function printUpdate() {
  const p = printPlan();
  document.getElementById('prCustomL').style.display = p.size === 'custom' ? '' : 'none';
  const mp = (p.px * p.py) / 1e6;
  document.getElementById('prSum').textContent = t('print_sum')
    .replace('{w}', p.px.toLocaleString())
    .replace('{h}', p.py.toLocaleString())
    .replace('{mp}', mp.toFixed(1))
    .replace('{mm}', `${+p.iw.toFixed(1)} × ${+p.ih.toFixed(1)} mm`);
  const tooBig = p.fmt !== 'pdf' && (p.px * p.py > CANVAS_MAX.area || Math.max(p.px, p.py) > CANVAS_MAX.side);
  document.getElementById('prWarn').textContent = tooBig ? t('print_too_big') : mp > 150 ? t('print_slow') : '';
  document.getElementById('prGo').disabled = tooBig;
}
async function printGo() {
  const p = printPlan();
  localStorage.setItem(
    PRINT_KEY,
    JSON.stringify({ size: p.size, width: +document.getElementById('prWidth').value || 300, dpi: p.dpi, fmt: p.fmt }),
  );
  document.getElementById('printDlg').close();
  const paper = p.size === 'custom' ? Math.round(p.pw) + 'mm' : p.size.toLowerCase();
  const name = exportName() + '-' + paper + '-' + p.dpi + 'dpi';
  const el = exportSvg();
  toast(t('ts_generating') + ' ' + p.fmt.toUpperCase() + ' …');
  if (p.fmt !== 'pdf') {
    const c = await renderPart(el, [0, 0, W, H], p.px, p.py);
    const blob = await new Promise((res) => c.toBlob(res, p.fmt === 'png' ? 'image/png' : 'image/jpeg', 0.93));
    const url = URL.createObjectURL(await withDpi(blob, p.dpi, p.fmt));
    dl(url, name + '.' + p.fmt);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } else {
    const { jsPDF } = loadJsPDF();
    const pdf = new jsPDF({ orientation: p.pw > p.ph ? 'landscape' : 'portrait', unit: 'mm', format: [p.pw, p.ph] });
    const x0 = (p.pw - p.iw) / 2,
      y0 = (p.ph - p.ih) / 2,
      u = W / p.px, // SVG units per pixel
      mm = p.iw / p.px; // mm per pixel
    const nx = Math.ceil(p.px / TILE),
      ny = Math.ceil(p.py / TILE);
    for (let j = 0, k = 1; j < ny; j++)
      for (let i = 0; i < nx; i++, k++) {
        if (nx * ny > 1)
          toast(
            t('print_tile')
              .replace('{i}', k)
              .replace('{n}', nx * ny),
          );
        // a pixel of overlap to the right and below, so no hairline shows between tiles
        const tx = i * TILE,
          ty = j * TILE,
          tw = Math.min(TILE + 1, p.px - tx),
          th = Math.min(TILE + 1, p.py - ty);
        const c = await renderPart(el, [tx * u, ty * u, tw * u, th * u], tw, th);
        pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', x0 + tx * mm, y0 + ty * mm, tw * mm, th * mm);
        await new Promise((r) => setTimeout(r, 0));
      }
    pdfLinks(pdf, x0, y0, p.r);
    pdf.save(name + '.pdf');
  }
  toast(p.fmt.toUpperCase() + ' ' + t('ts_downloaded'));
}
// the resolution in the file, so print software shows the real size: PNG pHYs chunk, JPEG JFIF density
function crc32(d) {
  let c = ~0;
  for (const x of d) {
    c ^= x;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}
async function withDpi(blob, dpi, fmt) {
  const b = new Uint8Array(await blob.arrayBuffer());
  if (fmt === 'png') {
    const ppm = Math.round(dpi / 0.0254),
      ch = new Uint8Array(21),
      v = new DataView(ch.buffer);
    v.setUint32(0, 9);
    ch.set([112, 72, 89, 115], 4); // pHYs
    v.setUint32(8, ppm);
    v.setUint32(12, ppm);
    ch[16] = 1; // per metre
    v.setUint32(17, crc32(ch.subarray(4, 17)));
    // right after the signature (8 bytes) and the IHDR chunk (25)
    return new Blob([b.subarray(0, 33), ch, b.subarray(33)], { type: 'image/png' });
  }
  // JFIF APP0 right after the start marker: units 1 = dots per inch, then x and y density
  if (String.fromCharCode(...b.subarray(6, 10)) === 'JFIF') {
    b[13] = 1;
    b[14] = b[16] = dpi >> 8;
    b[15] = b[17] = dpi & 255;
  }
  return new Blob([b], { type: 'image/jpeg' });
}
window._testExport = async () => (await renderCanvas(1)).toDataURL('image/png');
function dl(u, n) {
  const a = document.createElement('a');
  a.href = u;
  a.download = n;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
window.exportSVG = () => new XMLSerializer().serializeToString(document.getElementById('svg'));

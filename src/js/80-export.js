async function renderCanvas(scale) {
  const el = document.getElementById('svg').cloneNode(true);
  el.querySelectorAll('.pulse').forEach((c) => c.removeAttribute('class'));
  el.insertAdjacentHTML('afterbegin', `<style>${allFontCSS()}</style>`);
  el.setAttribute('width', W);
  el.setAttribute('height', H);
  const src = new XMLSerializer().serializeToString(el);
  const c = document.createElement('canvas');
  c.width = W * scale;
  c.height = H * scale;
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
async function exportMap(fmt) {
  toast(t('ts_generating') + ' ' + fmt.toUpperCase() + ' …');
  const c = await renderCanvas(3);
  const slug = (v) =>
    String(v)
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  const name = [
    'mobomap',
    slug(S.country ? countryName(S.country) : 'world'),
    S.focus ? slug(GEO.groups[S.focus] || S.focus) : '',
    S.style,
    S.layout,
  ]
    .filter(Boolean)
    .join('-');
  if (fmt === 'png') dl(c.toDataURL('image/png'), name + '.png');
  else if (fmt === 'jpg') dl(c.toDataURL('image/jpeg', 0.93), name + '.jpg');
  else {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: W >= H ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
    const pw = pdf.internal.pageSize.getWidth(),
      ph = pdf.internal.pageSize.getHeight();
    const r = Math.min(pw / W, ph / H);
    const x0 = (pw - W * r) / 2,
      y0 = (ph - H * r) / 2;
    pdf.addImage(c.toDataURL('image/jpeg', 0.95), 'JPEG', x0, y0, W * r, H * r);
    for (const l of window._links || []) pdf.link(x0 + l.x * r, y0 + l.y * r, l.w * r, l.h * r, { url: l.url });
    const D = DS[S.ds];
    if (D.company.link) pdf.link(x0 + (W - PAD.l - 240) * r, y0 + 30 * r, 260 * r, 70 * r, { url: D.company.link });
    pdf.save(name + '.pdf');
  }
  toast(fmt.toUpperCase() + ' ' + t('ts_downloaded'));
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

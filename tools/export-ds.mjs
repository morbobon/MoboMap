// Packs design-system JSON files (a folder or single files) into ONE importable JSON with logos and fonts
// embedded as data URIs – for sharing a profile without rebuilding the app.
// Usage: node tools/export-ds.mjs <folder|file.json …> --out=path.json
// The result can be imported in the app ("Manage profiles" -> "Import", or drag the file onto the page).
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const out = (args.find((a) => a.startsWith('--out=')) || '').slice(6);
const inputs = args.filter((a) => !a.startsWith('--'));
if (!out || !inputs.length) {
  console.error('Usage: node tools/export-ds.mjs <folder|file.json …> --out=path.json');
  process.exit(1);
}
const MIME = {
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};
const dataURI = (p) =>
  `data:${MIME[path.extname(p).toLowerCase()] || 'application/octet-stream'};base64,${fs.readFileSync(p).toString('base64')}`;
const pngAspect = (p) => {
  const b = fs.readFileSync(p);
  return b.slice(1, 4).toString() === 'PNG' ? b.readUInt32BE(16) / b.readUInt32BE(20) : null;
};

const files = inputs.flatMap((p) =>
  fs.statSync(p).isDirectory()
    ? fs
        .readdirSync(p)
        .filter((f) => f.endsWith('.json'))
        .sort()
        .map((f) => path.join(p, f))
    : [p],
);
const list = files.map((f) => {
  const dir = path.dirname(f);
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  const inline = (L) => {
    if (!L || !L.src || /^data:/.test(L.src)) return;
    const p = path.join(dir, L.src);
    if (!fs.existsSync(p)) throw new Error(`${f}: missing ${L.src}`);
    L.aspect = L.aspect || pngAspect(p) || 4;
    L.src = dataURI(p);
  };
  if (d.logo) {
    d.company = d.company || {};
    d.company.logo = d.company.logo || d.logo;
    delete d.logo;
  }
  inline(d.company && d.company.logo);
  for (const p of d.partners || []) {
    if (typeof p.logo === 'string') p.logo = { src: p.logo };
    inline(p.logo);
  }
  for (const face of (d.fonts && d.fonts.faces) || [])
    if (face.src && !/^data:/.test(face.src)) face.src = dataURI(path.join(dir, face.src));
  return d;
});
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(out, JSON.stringify(list, null, 1));
console.log(
  `${out}: ${list.length} design system(s) – ${list.map((d) => d.id).join(', ')} – ${(fs.statSync(out).size / 1024).toFixed(0)} KB`,
);

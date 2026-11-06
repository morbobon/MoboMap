// Release build: builds index.html (all profiles) and packs two zips in release/:
//   MoboMap-<version>-<date>.zip         – all profiles in designsystems/ (incl. private/)
//   MoboMap-<version>-<date>-public.zip  – without designsystems/private/
// Each zip contains index.html, README.txt and designsystems.example.js.
// Also re-renders the README example images (tools/examples.mjs) unless --no-examples is given.
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const d = new Date().toISOString().slice(0, 10);
const v = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
fs.mkdirSync('release', { recursive: true });

const readme = `MoboMap – Map Design Studio (v${v}, ${d})

Open index.html in a browser (Chrome/Edge/Firefox). The file is self-contained and works offline.

Own design systems / company profiles:
- Import a .json in the app (section 1), or
- place designsystems.js next to index.html (see designsystems.example.js) – it loads automatically.

Projects are saved/opened as .mobomap.json with the buttons at the top.
Export: PNG, JPG, PDF (A4) with clickable partner/company links in the PDF.

https://github.com/morbobon/MoboMap
`;

const example = `// Rename to designsystems.js and place it next to index.html.
// Logos must be data URIs (use "Choose logo" in the app's editor and "Export JSON" to get them).
window.DESIGN_SYSTEMS = [
  {
    "id": "mitfirma",
    "name": "Mit Firma",
    "fonts": { "heading": "Roboto Slab", "body": "Work Sans" },
    "colors": { "bg": "#FFFFFF", "land": "#2F3E4E", "stroke": "#FFFFFF", "ink": "#2F3E4E", "primary": "#2F3E4E", "accent": "#FF6B35", "accent2": "#3A86FF" },
    "highlight": ["#FF6B35", "#3A86FF", "#FFD166", "#FFFFFF"],
    "company": { "name": "Mit Firma", "link": "https://mitfirma.dk", "logo": { "text": "MIT FIRMA" } },
    "partners": [],
    "footer": { "label": "I samarbejde med", "divider": { "style": "line" } }
  }
];
`;

function pack(name, publicOnly) {
  const dir = path.join('release', name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const args = ['tools/build.mjs', `--out=${path.join(dir, 'index.html')}`];
  if (publicOnly) args.push('--public');
  execFileSync('node', args, { stdio: 'inherit' });
  fs.writeFileSync(path.join(dir, 'README.txt'), readme);
  fs.writeFileSync(path.join(dir, 'designsystems.example.js'), example);
  const zip = path.resolve('release', name + '.zip');
  fs.rmSync(zip, { force: true });
  // zip(1) if available, otherwise PowerShell Compress-Archive (present on every Windows machine)
  try {
    execFileSync('zip', ['-qrj', zip, dir]);
  } catch {
    execFileSync(
      'powershell',
      ['-NoProfile', '-Command', `Compress-Archive -Path '${path.resolve(dir)}\\*' -DestinationPath '${zip}' -Force`],
      { stdio: 'inherit' },
    );
  }
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(path.relative('.', zip), (fs.statSync(zip).size / 1024).toFixed(0) + ' KB');
}

execFileSync('node', ['tools/build.mjs'], { stdio: 'inherit' }); // index.html in the repo root (dev)
// README example images + gallery (needs Chrome or Edge); skip with --no-examples
if (!process.argv.includes('--no-examples')) {
  try {
    execFileSync('node', ['tools/examples.mjs'], { stdio: 'inherit' });
  } catch {
    console.warn('examples: not rendered (see the error above) – release continues');
  }
}
pack(`MoboMap-${v}-${d}`, false);
pack(`MoboMap-${v}-${d}-public`, true);

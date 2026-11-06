// Release-build: bygger index.html (alle profiler) og pakker to zips i release/:
//   MoboMap-<version>-<dato>.zip         – med alle profiler i designsystems/ (inkl. private/)
//   MoboMap-<version>-<dato>-public.zip  – uden designsystems/private/
// Hver zip indeholder index.html, README.txt og designsystems.example.js.
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const d = new Date().toISOString().slice(0, 10);
const v = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
fs.mkdirSync('release', { recursive: true });

const readme = `MoboMap – Danmarkskort Design Studio (v${v}, ${d})

Åbn index.html i en browser (Chrome/Edge/Firefox). Filen er selvstændig og virker offline.

Egne designsystemer/virksomhedsprofiler:
- Importér en .json i appen (afsnit 1), eller
- læg designsystems.js ved siden af index.html (se designsystems.example.js) – den indlæses automatisk.

Projekter gemmes/åbnes som .mobomap.json via knapperne øverst.
Eksport: PNG, JPG, PDF (A4) med klikbare partner-/firmalinks i PDF.
`;

const example = `// Omdøb til designsystems.js og læg filen ved siden af index.html.
// Logoer skal være data-URI'er (brug "Vælg logo" i appens editor og "Eksportér JSON" for at få dem).
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
  // PowerShell Compress-Archive findes på alle Windows-maskiner; zip(1) bruges hvis tilgængelig
  try { execFileSync('zip', ['-qrj', zip, dir]); }
  catch { execFileSync('powershell', ['-NoProfile', '-Command', `Compress-Archive -Path '${path.resolve(dir)}\\*' -DestinationPath '${zip}' -Force`], { stdio: 'inherit' }); }
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(path.relative('.', zip), (fs.statSync(zip).size / 1024).toFixed(0) + ' KB');
}

execFileSync('node', ['tools/build.mjs'], { stdio: 'inherit' }); // index.html i roden (dev)
pack(`MoboMap-${v}-${d}`, false);
pack(`MoboMap-${v}-${d}-public`, true);

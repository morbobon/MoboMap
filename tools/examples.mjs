// Renders the README example images from docs/examples/*.mobomap.json (saved projects with an extra
// "example": { "caption": "…" }) and rewrites the gallery between the markers in README.md.
// Uses an installed Chrome or Edge through playwright-core (no browser download).
// Run: npm run examples   (also part of npm run release)
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(root, 'docs/examples');
const README = path.join(root, 'README.md');
const SCALE = 1; // 1200 px wide for the "wide" layout
const QUALITY = 0.86;

// Public build (no private profiles) in a temp folder
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mobomap-ex-'));
const html = path.join(tmp, 'index.html');
execFileSync('node', [path.join(root, 'tools/build.mjs'), '--public', `--out=${html}`], { stdio: 'ignore' });

async function launch() {
  for (const channel of ['chrome', 'msedge', 'chromium']) {
    try {
      return await chromium.launch({ channel });
    } catch {
      /* try the next one */
    }
  }
  throw new Error('No Chrome or Edge found – install one to render the examples.');
}

const files = fs
  .readdirSync(DIR)
  .filter((f) => f.endsWith('.mobomap.json'))
  .sort();
const browser = await launch();
const rows = [];
try {
  for (const f of files) {
    const project = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
    const name = f.replace(/\.mobomap\.json$/, '');
    // a fresh page per example, so nothing (auto text, visited maps) leaks between them
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    await page.goto(pathToFileURL(html).href);
    await page.waitForFunction(() => typeof loadProject === 'function' && document.fonts.status === 'loaded');
    const { dataUrl, live } = await page.evaluate(
      async ([p, scale, q]) => {
        loadProject(p, true);
        render();
        await document.fonts.ready;
        const c = await renderCanvas(scale);
        // the same map as a link to the online demo (only what differs from the start project)
        const qs = shareParams().toString();
        return { dataUrl: c.toDataURL('image/jpeg', q), live: SHARE_DEMO + (qs ? '?' + qs : '') };
      },
      [project, SCALE, QUALITY],
    );
    await page.close();
    const jpg = name + '.jpg';
    fs.writeFileSync(path.join(DIR, jpg), Buffer.from(dataUrl.split(',')[1], 'base64'));
    const caption = (project.example && project.example.caption) || name;
    rows.push({ jpg, f, caption, live, alt: caption.replace(/\*\*/g, '') });
    console.log('example', jpg);
  }
} finally {
  await browser.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
// Remove images whose project file is gone
for (const f of fs.readdirSync(DIR))
  if (f.endsWith('.jpg') && !rows.some((r) => r.jpg === f)) fs.rmSync(path.join(DIR, f));

// README gallery: two columns, image row + caption row (caption links to the project file)
let md = '| | |\n|---|---|\n';
for (let i = 0; i < rows.length; i += 2) {
  const pair = rows.slice(i, i + 2);
  const cell = (fn) =>
    pair
      .map(fn)
      .concat(pair.length < 2 ? [''] : [])
      .join(' | ');
  md += `| ${cell((r) => `![${r.alt}](docs/examples/${r.jpg})`)} |\n`;
  md += `| ${cell((r) => `${r.caption}<br>[▶ open live](${r.live}) · [project](docs/examples/${r.f})`)} |\n`;
}
const START = '<!-- examples:start -->',
  END = '<!-- examples:end -->';
const readme = fs.readFileSync(README, 'utf8');
const a = readme.indexOf(START),
  b = readme.indexOf(END);
if (a < 0 || b < a) throw new Error('README.md lacks the ' + START + ' / ' + END + ' markers');
fs.writeFileSync(README, readme.slice(0, a + START.length) + '\n' + md + readme.slice(b));
console.log(`${rows.length} examples rendered, README gallery updated`);

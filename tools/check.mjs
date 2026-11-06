// Static checks for the app source. Run: npm run check
//  1. the built index.html parses (node --check on the app script)
//  2. i18n: every key used in code exists in English, every language has every English key, no unused keys
//  3. unused top-level declarations in src/js
// Exit code 1 on errors (1–2); unused declarations are reported as warnings.
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const SRC = path.join(root, 'src');
let errors = 0;
const err = (m) => {
  errors++;
  console.log('ERROR  ' + m);
};
const warn = (m) => console.log('warn   ' + m);
const ok = (m) => console.log('ok     ' + m);

// ---------- 1. build + syntax ----------
execFileSync('node', [path.join(root, 'tools', 'build.mjs')], { stdio: 'ignore' });
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const left = html.match(/\/\*__[A-Z0-9]+__\*\//g);
if (left) err('unreplaced placeholders in index.html: ' + [...new Set(left)].join(', '));
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const tmp = path.join(os.tmpdir(), 'mobomap-check.js');
fs.writeFileSync(tmp, scripts[scripts.length - 1]);
try {
  execFileSync('node', ['--check', tmp], { stdio: 'pipe' });
  ok('app script parses');
} catch (e) {
  err('syntax: ' + e.stderr.toString().split('\n').slice(0, 5).join(' | '));
}

// ---------- 2. i18n ----------
const jsFiles = fs
  .readdirSync(path.join(SRC, 'js'))
  .filter((f) => f.endsWith('.js'))
  .sort();
const code = jsFiles.map((f) => fs.readFileSync(path.join(SRC, 'js', f), 'utf8')).join('\n');
const markup = fs.readFileSync(path.join(SRC, 'app.html'), 'utf8');
const T = JSON.parse(fs.readFileSync(path.join(SRC, 'i18n.json'), 'utf8'));
const X = JSON.parse(fs.readFileSync(path.join(SRC, 'i18n-extra.json'), 'utf8'));
for (const l of Object.keys(X)) T[l] = Object.assign(T[l] || {}, X[l]);
const langs = Object.keys(T);
const en = new Set(Object.keys(T.en));
// (a) keys that must exist: t('key') calls and data-i18n / data-i18n-ph attributes
const required = new Set();
for (const m of code.matchAll(/\bt\('([a-z0-9_]+)'\)/g)) required.add(m[1]);
for (const m of markup.matchAll(/data-i18n(?:-ph)?="([a-z0-9_]+)"/g)) required.add(m[1]);
// (b) keys built from id lists: st_<style>[_d], hl_<mode>[_t], lay_<layout>, rel_<religion>
const idList = (name) => {
  const m = code.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\]`));
  if (!m) {
    err(`id list ${name} not found`);
    return [];
  }
  return [...m[1].matchAll(/(?:id: )?'([a-z0-9]+)'/g)].map((x) => x[1]);
};
for (const id of idList('STYLES')) required.add('st_' + id).add('st_' + id + '_d');
for (const id of idList('HLS')) required.add('hl_' + id).add('hl_' + id + '_t');
for (const id of idList('LAYOUTS')) required.add('lay_' + id);
for (const id of idList('REL')) required.add('rel_' + id);
for (const id of idList('ATTR_CATS')) required.add('cat_' + id);
for (const id of idList('UI_MODES')) required.add('ui_' + id);
for (const id of idList('FX_IDS')) required.add('fx_' + id);
for (const id of idList('FXC_IDS')) required.add('fxc_' + id);
for (const id of idList('FRAME_IDS')) required.add('fr_' + id);
for (const id of idList('FX_PRESET_IDS')) required.add('pre_' + id);
const missingEn = [...required].filter((k) => !en.has(k));
if (missingEn.length) err('keys used but missing in en: ' + missingEn.join(', '));
else ok(`all ${required.size} referenced keys exist in en`);
// (c) a key counts as used if required, or if its literal appears in code or build data (e.g. 'eco_1', sea labels)
const all0 = code + '\n' + markup + '\n' + fs.readFileSync(path.join(root, 'tools', 'build.mjs'), 'utf8');
const used = new Set([...en].filter((k) => required.has(k) || all0.includes(`'${k}'`) || all0.includes(`"${k}"`)));
for (const l of langs) {
  const miss = [...en].filter((k) => !(k in T[l]));
  if (miss.length)
    err(`${l}: ${miss.length} keys missing (${miss.slice(0, 8).join(', ')}${miss.length > 8 ? ' …' : ''})`);
  const extra = Object.keys(T[l]).filter((k) => !en.has(k));
  if (extra.length) warn(`${l}: keys not in en: ${extra.join(', ')}`);
}
if (!errors) ok(`${langs.length} languages complete (${en.size} keys each)`);
const unusedKeys = [...en].filter((k) => !used.has(k));
if (unusedKeys.length) warn('i18n keys never referenced: ' + unusedKeys.join(', '));

// ---------- 3. unused top-level declarations ----------
const decl = [...code.matchAll(/^(?:function|const|let)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
const all = code + '\n' + markup;
const unused = decl.filter((n) => (all.match(new RegExp('\\b' + n.replace('$', '\\$') + '\\b', 'g')) || []).length < 2);
if (unused.length) warn('unused top-level declarations: ' + unused.join(', '));
else ok('no unused top-level declarations');

console.log(errors ? `\n${errors} error(s)` : '\nall checks passed');
process.exit(errors ? 1 : 0);

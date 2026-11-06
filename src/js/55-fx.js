// Effects & frames: the map is drawn as a sheet of paper inside a scene (wall, frame, mat, glass).
//   S.fx = { fx: [effect ids], frame: frame id, surface: wall/table colour, seed: number }
// Labels: fx_<id>, fr_<id>, pre_<id>, fxc_<category>.
const FX_IDS = [
  'paper',
  'grain',
  'speckle',
  'crumple',
  'dried',
  'folds',
  'coffee',
  'water',
  'burnt',
  'torn',
  'curl',
  'roll',
  'spotlight',
  'vignette',
  'gradient',
  'glass',
  'shadow',
  'emboss',
  'deboss',
  'foil',
  'sepia',
  'mono',
  'chroma',
  'glow',
  'scanlines',
  'halftone',
  'compass',
  'rhumb',
  'border',
];
const FX_CATS = [
  [
    'paper',
    ['paper', 'grain', 'speckle', 'crumple', 'dried', 'folds', 'coffee', 'water', 'burnt', 'torn', 'curl', 'roll'],
  ],
  ['light', ['spotlight', 'vignette', 'gradient', 'glass', 'shadow']],
  ['relief', ['emboss', 'deboss', 'foil']],
  ['colour', ['sepia', 'mono', 'chroma', 'glow', 'scanlines', 'halftone']],
  ['decor', ['compass', 'rhumb', 'border']],
];
const FXC_IDS = ['paper', 'light', 'relief', 'colour', 'decor'];
// Frames, sizes as a share of min(W, H): m = wall margin, b = frame band, t = mat (or paper border)
const FRAME_IDS = [
  'none',
  'line',
  'double',
  'oak',
  'ash',
  'walnut',
  'black',
  'blacktaupe',
  'white',
  'gold',
  'floater',
  'snap',
  'card',
  'polaroid',
  'stamp',
  'tape',
  'pins',
  'neon',
  'brutal',
];
const FRAME_SPEC = {
  oak: { kind: 'wood', m: 0.05, b: 0.04, t: 0.075, wood: '#c9a272', mat: '#f7f4ee' },
  ash: { kind: 'wood', m: 0.06, b: 0.025, t: 0.07, wood: '#8c7b68', mat: '#f8f7f4' },
  walnut: { kind: 'wood', m: 0.05, b: 0.05, t: 0.07, wood: '#563821', mat: '#ece4d2' },
  black: { kind: 'wood', m: 0.05, b: 0.045, t: 0.075, wood: '#1e1e1e', mat: '#f5f3ef' },
  blacktaupe: { kind: 'wood', m: 0.045, b: 0.055, t: 0.08, wood: '#161616', mat: '#6e5f4f', fillet: '#c9a24a' },
  white: { kind: 'wood', m: 0.05, b: 0.04, t: 0.075, wood: '#f1efea', mat: '#fbfaf7' },
  gold: { kind: 'gold', m: 0.05, b: 0.06, t: 0.06, wood: '#b8892f', mat: '#efe6d2' },
  floater: { kind: 'gold', m: 0.07, b: 0.02, t: 0.014, wood: '#c4a058', mat: '#1b1b1b', thin: true },
  snap: { kind: 'metal', m: 0.05, b: 0.035, t: 0.02, wood: '#2b2b2b', mat: '#ffffff' },
  card: { kind: 'card', m: 0.06 },
  polaroid: { kind: 'polaroid', m: 0.06, t: 0.03, bottom: 0.11 },
  stamp: { kind: 'stamp', m: 0.07, t: 0.03 },
  tape: { kind: 'tape', m: 0.07 },
  pins: { kind: 'pins', m: 0.07 },
  neon: { kind: 'neon', m: 0.06 },
  brutal: { kind: 'brutal', m: 0.06 },
};
// Presets: effects + frame (+ map style and surface colour where the look depends on it)
const FX_PRESET_IDS = [
  'none',
  'goldfoil',
  'pirate',
  'treasure',
  'papyrus',
  'portolan',
  'antique',
  'wallmap',
  'gallery',
  'museum',
  'canvas',
  'technoir',
  'synthwave',
  'crumpled',
  'rainy',
  'letterpress',
  'embossed',
  'polaroid',
  'blueprint',
  'poster',
  'stamp',
  'riso',
  'noir',
  'coffeetable',
];
const FX_PRESETS = {
  none: { fx: [], frame: 'none' },
  goldfoil: { fx: ['foil', 'speckle', 'grain'], frame: 'ash', style: 'blackgold', surface: '#f1f0ed' },
  pirate: {
    fx: ['paper', 'grain', 'crumple', 'coffee', 'burnt', 'vignette', 'compass', 'rhumb', 'sepia'],
    frame: 'none',
    style: 'vintage',
    surface: '#2c1f14',
  },
  treasure: {
    fx: ['paper', 'grain', 'dried', 'water', 'torn', 'compass', 'sepia'],
    frame: 'none',
    style: 'vintage',
    surface: '#3b2a1c',
  },
  papyrus: {
    fx: ['paper', 'grain', 'dried', 'roll', 'sepia', 'vignette'],
    frame: 'none',
    style: 'vintage',
    surface: '#d9d6d0',
  },
  portolan: {
    fx: ['paper', 'grain', 'rhumb', 'compass', 'folds', 'sepia', 'border'],
    frame: 'none',
    style: 'atlas',
    surface: '#ddd8cf',
  },
  antique: {
    fx: ['paper', 'grain', 'border', 'compass', 'glass'],
    frame: 'walnut',
    style: 'atlas',
    surface: '#2e3134',
  },
  wallmap: {
    fx: ['paper', 'border', 'compass', 'glass', 'spotlight'],
    frame: 'blacktaupe',
    style: 'atlas',
    surface: '#e6e3de',
  },
  gallery: { fx: ['spotlight', 'glass', 'shadow'], frame: 'oak', surface: '#ece9e3' },
  museum: { fx: ['paper', 'grain', 'spotlight', 'glass'], frame: 'gold', surface: '#3a3f44' },
  canvas: { fx: ['paper', 'grain', 'gradient', 'vignette'], frame: 'floater', surface: '#e9e6e0' },
  technoir: {
    fx: ['scanlines', 'chroma', 'glow', 'vignette', 'grain'],
    frame: 'none',
    style: 'midnight',
    surface: '#05070c',
  },
  synthwave: { fx: ['glow', 'scanlines', 'gradient'], frame: 'neon', style: 'neon', surface: '#0a0614' },
  crumpled: { fx: ['crumple', 'grain', 'coffee', 'shadow', 'torn'], frame: 'none', surface: '#4a4440' },
  rainy: { fx: ['water', 'dried', 'grain', 'paper'], frame: 'tape', surface: '#cfd3d6' },
  letterpress: { fx: ['deboss', 'paper', 'grain'], frame: 'none', style: 'silhouette', surface: '#e8e4dc' },
  embossed: { fx: ['emboss', 'shadow', 'gradient'], frame: 'card', style: 'silhouette', surface: '#d9dde1' },
  polaroid: { fx: ['grain', 'vignette', 'sepia', 'gradient'], frame: 'polaroid', surface: '#b9a993' },
  blueprint: { fx: ['folds', 'grain', 'curl', 'crumple'], frame: 'pins', style: 'blueprint', surface: '#c8c2b8' },
  poster: { fx: ['glass', 'gradient'], frame: 'snap', surface: '#e4e2df' },
  stamp: { fx: ['halftone', 'sepia', 'grain'], frame: 'stamp', surface: '#d8cbb0' },
  riso: { fx: ['halftone', 'chroma', 'grain', 'speckle'], frame: 'none', style: 'poster', surface: '#efe9dc' },
  noir: { fx: ['mono', 'vignette', 'grain', 'spotlight'], frame: 'black', surface: '#1a1a1a' },
  coffeetable: { fx: ['paper', 'coffee', 'folds', 'curl', 'grain', 'shadow'], frame: 'none', surface: '#6b4b33' },
};
const fxOn = (id) => S.fx.fx.includes(id);
function fxRng(seed) {
  let a = (seed * 2654435761) >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Geometry of the scene. Content (W x H) is scaled by s into the paper rect P, translated by (tx, ty).
let FXL = { s: 1, tx: 0, ty: 0, P: null, active: false };
function fxLayout() {
  const f = FRAME_SPEC[S.fx.frame] || {},
    S0 = Math.min(W, H);
  const m = (f.m || 0) * S0,
    b = (f.b || 0) * S0,
    t = (f.t || 0) * S0;
  const Ro = [m, m, W - m, H - m]; // outer edge of the frame (or of the card/print)
  const O = [Ro[0] + b, Ro[1] + b, Ro[2] - b, Ro[3] - b]; // opening (mat area)
  let P = [O[0] + t, O[1] + t, O[2] - t, O[3] - t - (f.bottom || 0) * S0]; // the sheet
  const edge = fxOn('torn') || fxOn('burnt') ? 0.035 * S0 : 0;
  const roll = fxOn('roll') ? 0.05 * S0 : 0;
  if (!m && (edge || roll)) {
    // no frame: leave room for the surface around a torn/burnt/rolled sheet
    const e = 0.04 * S0;
    P = [e, e, W - e, H - e];
  }
  P = [P[0] + edge, P[1] + edge + roll, P[2] - edge, P[3] - edge - roll];
  const pw = P[2] - P[0],
    ph = P[3] - P[1];
  const s = Math.min(pw / W, ph / H);
  const active = !!(m || edge || roll);
  return (FXL = {
    f,
    S0,
    Ro,
    O,
    P,
    s: active ? s : 1,
    tx: active ? P[0] + (pw - W * s) / 2 : 0,
    ty: active ? P[1] + (ph - H * s) / 2 : 0,
    active,
    roll,
  });
}
// artboard <-> content coordinates
const fxToContent = ([x, y]) => [(x - FXL.tx) / FXL.s, (y - FXL.ty) / FXL.s];
const fxToArt = (x, y) => [x * FXL.s + FXL.tx, y * FXL.s + FXL.ty];

// ---------- hooks called from render() (content coordinates) ----------
// under the map: drop shadow, rhumb lines
function fxUnder(allPath, ink) {
  let o = '';
  if (fxOn('rhumb')) {
    const r = fxRng(S.fx.seed + 7);
    const centres = [compassPos(), [W * (0.25 + r() * 0.2), H * (0.3 + r() * 0.3)]];
    o += `<g stroke="${ink}" stroke-opacity=".22" stroke-width=".6" pointer-events="none">`;
    for (const [cx, cy] of centres)
      for (let i = 0; i < 32; i++) {
        const a = (i * Math.PI) / 16,
          L = W + H;
        o += `<line x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${(cx + Math.cos(a) * L).toFixed(1)}" y2="${(cy + Math.sin(a) * L).toFixed(1)}" ${i % 4 ? 'stroke-dasharray="4 3"' : ''}/>`;
      }
    o += '</g>';
  }
  if (fxOn('shadow')) {
    const d = Math.min(W, H) * 0.008;
    o += `<path d="${allPath}" fill="#000" opacity=".35" filter="url(#fxblur4)" transform="translate(${d.toFixed(1)},${(d * 1.4).toFixed(1)})" pointer-events="none"/>`;
  }
  return o;
}
// on the land, under the highlight groups: gold foil
function fxLand(allPath) {
  if (!fxOn('foil')) return '';
  return `<clipPath id="fxlandclip"><path d="${allPath}"/></clipPath><g clip-path="url(#fxlandclip)" pointer-events="none"><rect width="${W}" height="${H}" filter="url(#fxfoil)"/></g>`;
}
// over the map (after the highlight groups): emboss / deboss
function fxMap(allPath) {
  let o = '';
  if (fxOn('emboss')) o += `<path d="${allPath}" fill="#000" filter="url(#fxemboss)" pointer-events="none"/>`;
  if (fxOn('deboss')) o += `<path d="${allPath}" fill="#000" filter="url(#fxdeboss)" pointer-events="none"/>`;
  return o;
}
// over everything in content space (compass rose)
function fxContentTop(ink, accent) {
  if (!fxOn('compass')) return '';
  const [cx, cy] = compassPos();
  return compassSVG(cx, cy, Math.min(W, H) * 0.075, ink, accent);
}
function compassPos() {
  return [W - PAD.r - Math.min(W, H) * 0.05, H - FOOT - PAD.b - Math.min(W, H) * 0.09];
}
function compassSVG(cx, cy, r, ink, acc) {
  const pt = (a, len) => [cx + Math.sin(a) * len, cy - Math.cos(a) * len];
  const f = (p) => p.map((v) => v.toFixed(1)).join(',');
  let o = `<g pointer-events="none"><circle cx="${cx}" cy="${cy}" r="${(r * 0.78).toFixed(1)}" fill="none" stroke="${ink}" stroke-width="1" opacity=".7"/><circle cx="${cx}" cy="${cy}" r="${(r * 0.7).toFixed(1)}" fill="none" stroke="${ink}" stroke-width=".6" opacity=".6"/>`;
  for (let i = 0; i < 64; i++) {
    const a = (i * Math.PI) / 32,
      [x1, y1] = pt(a, r * 0.7),
      [x2, y2] = pt(a, r * (i % 4 ? 0.74 : 0.78));
    o += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${ink}" stroke-width=".6" opacity=".7"/>`;
  }
  // 16 points: 4 long, 4 medium, 8 short; each split into a light and a dark half
  const pts = [];
  for (let i = 0; i < 16; i++) pts.push([(i * Math.PI) / 8, i % 4 === 0 ? 1 : i % 2 === 0 ? 0.62 : 0.4]);
  pts.sort((a, b) => a[1] - b[1]);
  for (const [a, k] of pts) {
    const tip = pt(a, r * k),
      w = r * (k === 1 ? 0.12 : 0.09);
    const l = pt(a - Math.PI / 2, w),
      rr = pt(a + Math.PI / 2, w);
    const c = [cx, cy];
    o += `<polygon points="${f(c)} ${f(l)} ${f(tip)}" fill="${k === 1 ? acc : ink}" stroke="${ink}" stroke-width=".5"/><polygon points="${f(c)} ${f(rr)} ${f(tip)}" fill="#f6efe0" stroke="${ink}" stroke-width=".5"/>`;
  }
  const [nx, ny] = pt(0, r * 1.12);
  o += `<circle cx="${cx}" cy="${cy}" r="${(r * 0.06).toFixed(1)}" fill="${ink}"/><text x="${nx.toFixed(1)}" y="${(ny + 4).toFixed(1)}" text-anchor="middle" font-family="Georgia,serif" font-size="${(r * 0.26).toFixed(1)}" font-weight="700" fill="${ink}">N</text></g>`;
  return o;
}

// ---------- defs ----------
function fxDefs() {
  const sd = S.fx.seed;
  const U = `filterUnits="userSpaceOnUse" x="-60" y="-60" width="${W + 120}" height="${H + 120}"`;
  let d = `<filter id="fxblur4" ${U}><feGaussianBlur stdDeviation="4"/></filter>
<filter id="fxgrain" ${U}><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="${sd}"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.7 0 0 0 -0.22"/><feComposite in2="SourceAlpha" operator="in"/></filter>
<filter id="fxspeckle" ${U}><feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="1" seed="${sd + 3}"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 0.97  0 0 0 0 0.9  9 0 0 0 -6.4"/><feComposite in2="SourceAlpha" operator="in"/></filter>
<filter id="fxpaper" ${U}><feTurbulence type="fractalNoise" baseFrequency=".008" numOctaves="4" seed="${sd + 1}"/><feColorMatrix type="matrix" values="0 0 0 0 .42  0 0 0 0 .27  0 0 0 0 .1  -1.1 0 0 0 .62"/><feComposite in2="SourceAlpha" operator="in"/></filter>
<filter id="fxcrumple" ${U}><feTurbulence type="turbulence" baseFrequency=".011" numOctaves="4" seed="${sd + 2}" result="n"/><feDiffuseLighting in="n" surfaceScale="2.6" lighting-color="#fff"><feDistantLight azimuth="235" elevation="52"/></feDiffuseLighting><feComponentTransfer><feFuncR type="linear" slope="1.25"/><feFuncG type="linear" slope="1.25"/><feFuncB type="linear" slope="1.25"/></feComponentTransfer><feComposite in2="SourceAlpha" operator="in"/></filter>
<filter id="fxdried" ${U}><feTurbulence type="fractalNoise" baseFrequency=".0045" numOctaves="2" seed="${sd + 4}" result="n"/><feDiffuseLighting in="n" surfaceScale="9" lighting-color="#fff"><feDistantLight azimuth="225" elevation="58"/></feDiffuseLighting><feComponentTransfer><feFuncR type="linear" slope="1.18"/><feFuncG type="linear" slope="1.18"/><feFuncB type="linear" slope="1.18"/></feComponentTransfer><feComposite in2="SourceAlpha" operator="in"/></filter>
<filter id="fxrough" ${U}><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="${sd + 5}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="14"/></filter>
<filter id="fxblob" ${U}><feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="3" seed="${sd + 6}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="70"/></filter>
<filter id="fxedge" ${U}><feTurbulence type="fractalNoise" baseFrequency=".022" numOctaves="4" seed="${sd + 8}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="34"/></filter>
<filter id="fxtorn" ${U}><feTurbulence type="fractalNoise" baseFrequency=".09" numOctaves="3" seed="${sd + 9}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="12"/></filter>
<filter id="fxburn" ${U}><feTurbulence type="fractalNoise" baseFrequency=".022" numOctaves="4" seed="${sd + 8}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="34" result="d"/><feGaussianBlur in="d" stdDeviation="5"/></filter>
<filter id="fxfoil" ${U}><feTurbulence type="fractalNoise" baseFrequency=".018" numOctaves="5" seed="${sd + 10}" result="n"/><feColorMatrix in="n" type="saturate" values="0" result="g"/><feComponentTransfer in="g" result="c"><feFuncR type="table" tableValues=".28 .52 .78 .93 .98 1"/><feFuncG type="table" tableValues=".17 .34 .58 .76 .86 .95"/><feFuncB type="table" tableValues=".07 .13 .26 .4 .55 .78"/><feFuncA type="discrete" tableValues="1"/></feComponentTransfer><feTurbulence type="fractalNoise" baseFrequency=".6" numOctaves="1" seed="${sd + 11}" result="s"/><feColorMatrix in="s" type="matrix" values="0 0 0 0 1  0 0 0 0 .95  0 0 0 0 .8  7 0 0 0 -5.2" result="sp"/><feMerge><feMergeNode in="c"/><feMergeNode in="sp"/></feMerge></filter>`;
  const relief = (id, hi, lo) =>
    `<filter id="${id}" ${U}><feGaussianBlur in="SourceAlpha" stdDeviation="2.2" result="b"/><feOffset in="b" dx="2.2" dy="2.2" result="o1"/><feComposite in="SourceAlpha" in2="o1" operator="out" result="e1"/><feFlood flood-color="${hi}" flood-opacity=".75"/><feComposite in2="e1" operator="in" result="H"/><feOffset in="b" dx="-2.2" dy="-2.2" result="o2"/><feComposite in="SourceAlpha" in2="o2" operator="out" result="e2"/><feFlood flood-color="${lo}" flood-opacity=".5"/><feComposite in2="e2" operator="in" result="L"/><feMerge><feMergeNode in="H"/><feMergeNode in="L"/></feMerge></filter>`;
  d += relief('fxemboss', '#ffffff', '#000000') + relief('fxdeboss', '#000000', '#ffffff');
  // content filter chain (mono, sepia, chroma, glow)
  let ch = '',
    last = 'SourceGraphic',
    n = 0;
  const step = (s) => {
    ch += s.replace(/\$in/g, last).replace(/\$out/g, 'c' + ++n);
    last = 'c' + n;
  };
  if (fxOn('mono'))
    step(
      `<feColorMatrix in="$in" type="saturate" values="0" result="m$out"/><feComponentTransfer in="m$out" result="$out"><feFuncR type="linear" slope="1.15" intercept="-.06"/><feFuncG type="linear" slope="1.15" intercept="-.06"/><feFuncB type="linear" slope="1.15" intercept="-.06"/></feComponentTransfer>`,
    );
  if (fxOn('sepia'))
    step(
      `<feColorMatrix in="$in" type="matrix" values=".393 .769 .189 0 0  .349 .686 .168 0 0  .272 .534 .131 0 0  0 0 0 1 0" result="$out"/>`,
    );
  if (fxOn('chroma'))
    step(
      `<feColorMatrix in="$in" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r$out"/><feOffset in="r$out" dx="-2" result="ro$out"/><feColorMatrix in="$in" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="g$out"/><feOffset in="g$out" dx="2" result="go$out"/><feBlend in="ro$out" in2="go$out" mode="screen" result="$out"/>`,
    );
  if (fxOn('glow'))
    step(
      `<feGaussianBlur in="$in" stdDeviation="5" result="b$out"/><feBlend in="$in" in2="b$out" mode="screen" result="$out"/>`,
    );
  if (ch) d += `<filter id="fxcontent" ${U}>${ch}</filter>`;
  d += `<pattern id="fxscan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1.6" fill="#000" opacity=".38"/></pattern>
<pattern id="fxdots" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="3" cy="3" r="1.25" fill="#000" opacity=".3"/></pattern>
<radialGradient id="fxvig" cx=".5" cy=".5" r=".72"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></radialGradient>
<radialGradient id="fxspot" gradientUnits="userSpaceOnUse" cx="${W / 2}" cy="${-H * 0.18}" r="${H * 1.25}"><stop offset="0" stop-color="#fff8e6" stop-opacity=".28"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></radialGradient>
<linearGradient id="fxgrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient>
<linearGradient id="fxglass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".3" stop-color="#fff" stop-opacity=".03"/><stop offset=".38" stop-color="#fff" stop-opacity=".2"/><stop offset=".46" stop-color="#fff" stop-opacity=".04"/><stop offset=".53" stop-color="#fff" stop-opacity=".12"/><stop offset=".58" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".05"/></linearGradient>`;
  return d;
}

// ---------- the scene around the content ----------
function fxWrap(content, bg, ink, accent) {
  const L = FXL,
    f = L.f,
    S0 = L.S0,
    [px0, py0, px1, py1] = L.P || [0, 0, W, H];
  const surface = S.fx.surface || '#e8e4dc';
  const r1 = (v) => v.toFixed(1);
  const rect = (q, a = '') =>
    `<rect x="${r1(q[0])}" y="${r1(q[1])}" width="${r1(q[2] - q[0])}" height="${r1(q[3] - q[1])}" ${a}/>`;
  let o = '';
  // wall / table
  if (L.active) o += `<rect width="${W}" height="${H}" fill="${surface}"/>`;
  const kind = f.kind;
  const Ro = L.Ro,
    O = L.O;
  // frame shadow on the wall and frame body
  if (['wood', 'gold', 'metal'].includes(kind)) {
    o += rect(Ro, `fill="#000" opacity=".45" filter="url(#fxblur4)" transform="translate(0,${r1(S0 * 0.01)})"`);
    o += rect(
      Ro,
      `fill="#000" opacity=".25" filter="url(#fxblur4)" transform="translate(${r1(S0 * 0.012)},${r1(S0 * 0.02)}) scale(1)"`,
    );
    o += framePieces(Ro, O, f, S0);
    o += rect(O, `fill="${f.mat}"`);
    // shadow of the frame on the mat (light from top left)
    o += `<g opacity=".35">${rect([O[0], O[1], O[2], O[1] + S0 * 0.012], 'fill="url(#fxshadeT)"')}${rect([O[0], O[1], O[0] + S0 * 0.01, O[3]], 'fill="url(#fxshadeL)"')}</g>`;
  } else if (kind === 'card' || kind === 'tape' || kind === 'pins' || kind === 'brutal') {
    if (kind === 'brutal')
      o += rect([px0 + S0 * 0.018, py0 + S0 * 0.018, px1 + S0 * 0.018, py1 + S0 * 0.018], 'fill="#111"');
    else
      o += rect(
        [px0, py0, px1, py1],
        `fill="#000" opacity=".4" filter="url(#fxblur4)" transform="translate(${r1(S0 * 0.006)},${r1(S0 * 0.012)})"`,
      );
  } else if (kind === 'polaroid' || kind === 'stamp') {
    o += rect(
      O,
      `fill="#000" opacity=".35" filter="url(#fxblur4)" transform="translate(${r1(S0 * 0.006)},${r1(S0 * 0.012)})"`,
    );
    o += rect(O, `fill="${kind === 'polaroid' ? '#fbfaf6' : '#fffdf8'}"`);
  } else if (!f.kind && L.active) {
    // free sheet on the table (torn/burnt/rolled): soft shadow under the paper
    o += rect(
      [px0, py0, px1, py1],
      `fill="#000" opacity=".45" filter="url(#fxblur4)" transform="translate(${r1(S0 * 0.006)},${r1(S0 * 0.012)})"`,
    );
  }
  // the sheet: paper colour, content, paper effects; torn/burnt edges cut it through a mask
  const edgeMask = fxOn('torn') || fxOn('burnt');
  const P = [px0, py0, px1, py1];
  let sheet = rect(P, `fill="${bg}"`);
  const cf = /<filter id="fxcontent"/.test(fxDefs()) ? ' filter="url(#fxcontent)"' : '';
  sheet += `<g${cf}>${L.active ? `<g transform="translate(${r1(L.tx)},${r1(L.ty)}) scale(${L.s.toFixed(4)})">${content}</g>` : content}</g>`;
  const R = fxRng(S.fx.seed);
  const pw = px1 - px0,
    ph = py1 - py0;
  const ov = (fill, a = '') => rect(P, `fill="${fill}" pointer-events="none" ${a}`);
  if (fxOn('paper'))
    sheet +=
      ov('#d8b57c', 'style="mix-blend-mode:multiply" opacity=".32"') +
      ov('#000', 'filter="url(#fxpaper)" opacity=".5"');
  if (fxOn('dried')) sheet += ov('#fff', 'filter="url(#fxdried)" style="mix-blend-mode:multiply" opacity=".55"');
  if (fxOn('crumple')) sheet += ov('#fff', 'filter="url(#fxcrumple)" style="mix-blend-mode:multiply" opacity=".6"');
  if (fxOn('water'))
    for (let i = 0; i < 3; i++) {
      const cx = px0 + pw * (0.15 + R() * 0.7),
        cy = py0 + ph * (0.15 + R() * 0.7),
        rr = S0 * (0.07 + R() * 0.09);
      sheet += `<ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(rr * 1.3)}" ry="${r1(rr)}" fill="#7d6a48" fill-opacity=".07" stroke="#6b5534" stroke-opacity=".28" stroke-width="2.5" filter="url(#fxblob)" pointer-events="none"/>`;
    }
  if (fxOn('coffee'))
    for (let i = 0; i < 2; i++) {
      const corner = R() < 0.5;
      const cx = corner ? px0 + pw * (R() < 0.5 ? 0.12 : 0.88) : px0 + pw * (0.3 + R() * 0.4),
        cy = py0 + ph * (corner ? 0.2 + R() * 0.6 : R() < 0.5 ? 0.15 : 0.85),
        rr = S0 * (0.06 + R() * 0.04);
      sheet += `<g filter="url(#fxrough)" pointer-events="none"><circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(rr)}" fill="#6f4520" fill-opacity=".07" stroke="#6f4520" stroke-opacity=".38" stroke-width="${r1(rr * 0.07)}"/><circle cx="${r1(cx + rr * 0.1)}" cy="${r1(cy - rr * 0.06)}" r="${r1(rr * 0.93)}" fill="none" stroke="#6f4520" stroke-opacity=".18" stroke-width="${r1(rr * 0.03)}" stroke-dasharray="${r1(rr * 2.2)} ${r1(rr * 1.4)}"/></g>`;
    }
  if (fxOn('folds')) {
    const xs = [0.25, 0.5, 0.75].map((k) => px0 + pw * k),
      ym = py0 + ph / 2;
    sheet += `<g pointer-events="none">${rect([px0, py0, px0 + pw / 4, py1], 'fill="#000" opacity=".035"')}${rect([px0 + pw / 2, py0, px0 + (pw * 3) / 4, py1], 'fill="#000" opacity=".035"')}${rect([px0, ym, px1, py1], 'fill="#fff" opacity=".035"')}`;
    for (const x of xs)
      sheet += `<line x1="${r1(x)}" y1="${r1(py0)}" x2="${r1(x)}" y2="${r1(py1)}" stroke="#fff" stroke-opacity=".5" stroke-width="1"/><line x1="${r1(x + 1)}" y1="${r1(py0)}" x2="${r1(x + 1)}" y2="${r1(py1)}" stroke="#000" stroke-opacity=".16" stroke-width="1"/>`;
    sheet += `<line x1="${r1(px0)}" y1="${r1(ym)}" x2="${r1(px1)}" y2="${r1(ym)}" stroke="#fff" stroke-opacity=".5"/><line x1="${r1(px0)}" y1="${r1(ym + 1)}" x2="${r1(px1)}" y2="${r1(ym + 1)}" stroke="#000" stroke-opacity=".16"/></g>`;
  }
  if (fxOn('border')) {
    const e = S0 * 0.03,
      bw = S0 * 0.012;
    const q = [px0 + e, py0 + e, px1 - e, py1 - e],
      qi = [q[0] + bw, q[1] + bw, q[2] - bw, q[3] - bw];
    let ticks = '';
    const seg = S0 * 0.03;
    for (let x = q[0], i = 0; x < q[2] - seg / 2; x += seg, i++)
      if (i % 2)
        ticks += `M${r1(x)} ${r1(q[1])}h${r1(seg)}v${r1(bw)}h${r1(-seg)}ZM${r1(x)} ${r1(qi[3])}h${r1(seg)}v${r1(bw)}h${r1(-seg)}Z`;
    for (let y = q[1], i = 0; y < q[3] - seg / 2; y += seg, i++)
      if (i % 2)
        ticks += `M${r1(q[0])} ${r1(y)}h${r1(bw)}v${r1(seg)}h${r1(-bw)}ZM${r1(qi[2])} ${r1(y)}h${r1(bw)}v${r1(seg)}h${r1(-bw)}Z`;
    sheet += `<g pointer-events="none"><path d="${ticks}" fill="${ink}" opacity=".55"/>${rect(q, `fill="none" stroke="${ink}" stroke-width="1.4"`)}${rect(qi, `fill="none" stroke="${ink}" stroke-width=".8"`)}${rect([q[0] - 4, q[1] - 4, q[2] + 4, q[3] + 4], `fill="none" stroke="${ink}" stroke-width=".6" opacity=".7"`)}</g>`;
  }
  if (fxOn('grain')) sheet += ov('#000', 'filter="url(#fxgrain)" opacity=".55"');
  if (fxOn('speckle')) sheet += ov('#000', 'filter="url(#fxspeckle)" opacity=".8"');
  if (fxOn('halftone')) sheet += ov('url(#fxdots)', 'style="mix-blend-mode:multiply"');
  if (fxOn('scanlines')) sheet += ov('url(#fxscan)');
  if (fxOn('gradient')) sheet += ov('url(#fxgrad)');
  if (fxOn('vignette')) sheet += ov('url(#fxvig)');
  if (fxOn('burnt')) {
    const qi = [px0 + 4, py0 + 4, px1 - 4, py1 - 4];
    sheet += `<g pointer-events="none">${rect(qi, `fill="none" stroke="#7a4a1c" stroke-width="${r1(S0 * 0.09)}" opacity=".55" filter="url(#fxburn)"`)}${rect(qi, `fill="none" stroke="#2a1406" stroke-width="${r1(S0 * 0.03)}" opacity=".9" filter="url(#fxburn)"`)}</g>`;
  }
  if (edgeMask) {
    const flt = fxOn('burnt') ? 'fxedge' : 'fxtorn';
    o += `<mask id="fxsheet" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">${rect(P, `fill="#fff" filter="url(#${flt})"`)}</mask><g mask="url(#fxsheet)">${sheet}</g>`;
    if (fxOn('torn') && !fxOn('burnt'))
      o += rect(
        P,
        `fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2.5" filter="url(#fxtorn)" pointer-events="none"`,
      );
  } else if (kind === 'card') {
    o += `<clipPath id="fxcard">${rect(P, `rx="${r1(S0 * 0.02)}"`)}</clipPath><g clip-path="url(#fxcard)">${sheet}</g>`;
  } else o += sheet;
  // papyrus rollers
  if (fxOn('roll')) {
    const h = L.roll * 0.9,
      x0 = px0 - S0 * 0.02,
      x1 = px1 + S0 * 0.02;
    const rc = mix(bg, '#8a6a3a', 0.55);
    o += `<linearGradient id="fxrollg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(rc, '#000', 0.45)}"/><stop offset=".35" stop-color="${mix(rc, '#fff', 0.35)}"/><stop offset=".6" stop-color="${rc}"/><stop offset="1" stop-color="${mix(rc, '#000', 0.55)}"/></linearGradient>`;
    for (const y of [py0, py1])
      o += `<rect x="${r1(x0)}" y="${r1(y - h / 2 + S0 * 0.008)}" width="${r1(x1 - x0)}" height="${r1(h)}" rx="${r1(h / 2)}" fill="#000" opacity=".35" filter="url(#fxblur4)"/><rect x="${r1(x0)}" y="${r1(y - h / 2)}" width="${r1(x1 - x0)}" height="${r1(h)}" rx="${r1(h / 2)}" fill="url(#fxrollg)"/>`;
  }
  // curled corner (bottom right)
  if (fxOn('curl')) {
    const c = Math.min(pw, ph) * 0.13;
    const a = [px1 - c, py1],
      b = [px1, py1 - c],
      fl = [px1 - c * 1.02, py1 - c * 1.02];
    const P2 = (p) => p.map(r1).join(' ');
    o += `<path d="M${P2(a)} L${P2([px1 + 1, py1 + 1])} L${P2(b)} Z" fill="${L.active ? f.mat || surface : surface}"/>`;
    o += `<path d="M${P2(a)} Q${P2([px1 - c * 0.55, py1 - c * 0.3])} ${P2(fl)} Q${P2([px1 - c * 0.3, py1 - c * 0.55])} ${P2(b)} Z" fill="#000" opacity=".35" filter="url(#fxblur4)" transform="translate(${r1(c * 0.05)},${r1(c * 0.06)})"/>`;
    o += `<linearGradient id="fxcurlg" gradientUnits="userSpaceOnUse" x1="${r1(px1 - c / 2)}" y1="${r1(py1 - c / 2)}" x2="${r1(fl[0])}" y2="${r1(fl[1])}"><stop offset="0" stop-color="${mix(bg, '#000', 0.25)}"/><stop offset=".55" stop-color="${mix(bg, '#fff', 0.35)}"/><stop offset="1" stop-color="${mix(bg, '#000', 0.08)}"/></linearGradient>`;
    o += `<path d="M${P2(a)} Q${P2([px1 - c * 0.55, py1 - c * 0.3])} ${P2(fl)} Q${P2([px1 - c * 0.3, py1 - c * 0.55])} ${P2(b)} Z" fill="url(#fxcurlg)" stroke="#000" stroke-opacity=".12" stroke-width=".6"/>`;
  }
  // frame decorations on top of the sheet
  if (['wood', 'gold', 'metal'].includes(kind)) {
    // the window of the mat: bevel (white core) and the shadow it casts on the paper
    if (f.t) {
      o += rect(
        [px0 - 1.5, py0 - 1.5, px1 + 1.5, py1 + 1.5],
        `fill="none" stroke="${kind === 'gold' && f.thin ? '#000' : '#fffefa'}" stroke-width="3"`,
      );
      o += `<g opacity=".28" pointer-events="none">${rect([px0, py0, px1, py0 + S0 * 0.008], 'fill="url(#fxshadeT)"')}${rect([px0, py0, px0 + S0 * 0.007, py1], 'fill="url(#fxshadeL)"')}</g>`;
      if (f.fillet)
        o += rect(
          [px0 - S0 * 0.008, py0 - S0 * 0.008, px1 + S0 * 0.008, py1 + S0 * 0.008],
          `fill="none" stroke="${f.fillet}" stroke-width="${r1(S0 * 0.006)}"`,
        );
    }
  }
  if (kind === 'tape') {
    const tw = S0 * 0.13,
      th = S0 * 0.038;
    const tp = (x, y, a) =>
      `<g transform="translate(${r1(x)},${r1(y)}) rotate(${a})"><rect x="${r1(-tw / 2)}" y="${r1(-th / 2)}" width="${r1(tw)}" height="${r1(th)}" fill="#efe3b4" fill-opacity=".78"/><rect x="${r1(-tw / 2)}" y="${r1(-th / 2)}" width="${r1(tw)}" height="${r1(th)}" fill="url(#fxscan)" opacity=".25"/></g>`;
    o += tp(px0, py0, -38) + tp(px1, py0, 38) + tp(px0, py1, 38) + tp(px1, py1, -38);
  }
  if (kind === 'pins') {
    const pin = (x, y, c) =>
      `<circle cx="${r1(x + 3)}" cy="${r1(y + 5)}" r="${r1(S0 * 0.014)}" fill="#000" opacity=".35" filter="url(#fxblur4)"/><circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(S0 * 0.014)}" fill="${c}"/><circle cx="${r1(x - S0 * 0.004)}" cy="${r1(y - S0 * 0.004)}" r="${r1(S0 * 0.005)}" fill="#fff" opacity=".6"/>`;
    o += pin(px0 + S0 * 0.03, py0 + S0 * 0.03, '#c0392b') + pin(px1 - S0 * 0.03, py0 + S0 * 0.03, '#c0392b');
  }
  if (kind === 'stamp') {
    const rr = S0 * 0.011,
      st = rr * 2.6;
    let holes = '';
    for (let x = O[0]; x <= O[2] + 0.1; x += st)
      holes += `<circle cx="${r1(x)}" cy="${r1(O[1])}" r="${r1(rr)}"/><circle cx="${r1(x)}" cy="${r1(O[3])}" r="${r1(rr)}"/>`;
    for (let y = O[1]; y <= O[3] + 0.1; y += st)
      holes += `<circle cx="${r1(O[0])}" cy="${r1(y)}" r="${r1(rr)}"/><circle cx="${r1(O[2])}" cy="${r1(y)}" r="${r1(rr)}"/>`;
    o += `<g fill="${surface}">${holes}</g>`;
  }
  if (kind === 'neon')
    o += `<rect x="${r1(px0 - S0 * 0.015)}" y="${r1(py0 - S0 * 0.015)}" width="${r1(pw + S0 * 0.03)}" height="${r1(ph + S0 * 0.03)}" rx="${r1(S0 * 0.025)}" fill="none" stroke="${accent}" stroke-width="6" filter="url(#fxblur4)"/><rect x="${r1(px0 - S0 * 0.015)}" y="${r1(py0 - S0 * 0.015)}" width="${r1(pw + S0 * 0.03)}" height="${r1(ph + S0 * 0.03)}" rx="${r1(S0 * 0.025)}" fill="none" stroke="#fff" stroke-width="1.6" opacity=".9"/>`;
  if (kind === 'brutal') o += rect(P, `fill="none" stroke="#111" stroke-width="${r1(S0 * 0.008)}"`);
  if (S.fx.frame === 'line')
    o += rect(
      [S0 * 0.025, S0 * 0.025, W - S0 * 0.025, H - S0 * 0.025],
      `fill="none" stroke="${ink}" stroke-width="1.2" opacity=".75"`,
    );
  if (S.fx.frame === 'double') {
    const e1 = S0 * 0.022,
      e2 = S0 * 0.032,
      cs = S0 * 0.022;
    o += `<g fill="none" stroke="${ink}" opacity=".8">${rect([e1, e1, W - e1, H - e1], 'stroke-width="2.2"')}${rect([e2, e2, W - e2, H - e2], 'stroke-width=".8"')}</g>`;
    for (const [x, y] of [
      [e1, e1],
      [W - e1, e1],
      [e1, H - e1],
      [W - e1, H - e1],
    ])
      o += `<rect x="${r1(x - cs / 2)}" y="${r1(y - cs / 2)}" width="${r1(cs)}" height="${r1(cs)}" fill="${bg}" stroke="${ink}" stroke-width="1.2"/><rect x="${r1(x - cs / 4)}" y="${r1(y - cs / 4)}" width="${r1(cs / 2)}" height="${r1(cs / 2)}" fill="${ink}" opacity=".8"/>`;
  }
  // glass and gallery light over the whole scene
  if (fxOn('glass'))
    o += rect(
      ['wood', 'gold', 'metal'].includes(kind) ? O : [0, 0, W, H],
      'fill="url(#fxglass)" pointer-events="none"',
    );
  if (fxOn('spotlight')) o += `<rect width="${W}" height="${H}" fill="url(#fxspot)" pointer-events="none"/>`;
  o += `<linearGradient id="fxshadeT" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient><linearGradient id="fxshadeL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>`;
  return o;
}
// Mitred frame sides with grain and light from the top left
function framePieces(Ro, Ri, f, S0) {
  const pts = (a) => a.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ');
  const [a0, b0, a1, b1] = Ro,
    [c0, d0, c1, d1] = Ri;
  const sides = {
    t: [
      [a0, b0],
      [a1, b0],
      [c1, d0],
      [c0, d0],
    ],
    r: [
      [a1, b0],
      [a1, b1],
      [c1, d1],
      [c1, d0],
    ],
    b: [
      [a1, b1],
      [a0, b1],
      [c0, d1],
      [c1, d1],
    ],
    l: [
      [a0, b1],
      [a0, b0],
      [c0, d0],
      [c0, d1],
    ],
  };
  const shade = { t: ['#fff', 0.16], l: ['#fff', 0.07], r: ['#000', 0.18], b: ['#000', 0.3] };
  const base = f.wood;
  let o = `<filter id="fxwoodH" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency=".004 .2" numOctaves="3" seed="${S.fx.seed + 12}"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 -.3"/><feComposite in2="SourceAlpha" operator="in"/></filter><filter id="fxwoodV" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency=".2 .004" numOctaves="3" seed="${S.fx.seed + 13}"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 -.3"/><feComposite in2="SourceAlpha" operator="in"/></filter>`;
  for (const k of ['t', 'r', 'b', 'l']) {
    const p = pts(sides[k]);
    o += `<polygon points="${p}" fill="${base}"/>`;
    if (f.kind === 'wood')
      o += `<polygon points="${p}" fill="#000" filter="url(#${k === 't' || k === 'b' ? 'fxwoodH' : 'fxwoodV'})" opacity="${light(base) ? 0.25 : 0.55}"/>`;
    o += `<polygon points="${p}" fill="${shade[k][0]}" opacity="${shade[k][1]}"/>`;
  }
  const band = Ri[0] - Ro[0] || 1;
  const mid = (k) => [Ro[0] + band * k, Ro[1] + band * k, Ro[2] - band * k, Ro[3] - band * k];
  const rr = (q, a) =>
    `<rect x="${q[0].toFixed(1)}" y="${q[1].toFixed(1)}" width="${(q[2] - q[0]).toFixed(1)}" height="${(q[3] - q[1]).toFixed(1)}" fill="none" ${a}/>`;
  // profile: outer edge, a ridge, the inner lip
  o += rr(Ro, `stroke="#000" stroke-opacity=".5" stroke-width="1"`);
  if (f.kind === 'metal') o += rr(mid(0.45), `stroke="#fff" stroke-opacity=".28" stroke-width="1.6"`);
  if (f.kind === 'gold') {
    o += rr(
      mid(0.3),
      `stroke="${mix(base, '#fff', 0.45)}" stroke-width="${(band * 0.12).toFixed(1)}" stroke-dasharray="0 ${(band * 0.22).toFixed(1)}" stroke-linecap="round"`,
    );
    o += rr(mid(0.62), `stroke="${mix(base, '#000', 0.35)}" stroke-width="1.2"`);
  } else o += rr(mid(0.7), `stroke="#fff" stroke-opacity=".12" stroke-width="1"`);
  o += rr(Ri, `stroke="#000" stroke-opacity=".55" stroke-width="1.4"`);
  return o;
}
function setFx(id) {
  const i = S.fx.fx.indexOf(id);
  if (i >= 0) S.fx.fx.splice(i, 1);
  else S.fx.fx.push(id);
  S.fx.preset = '';
  ui();
  render();
}
function applyFxPreset(id) {
  const p = FX_PRESETS[id];
  if (!p) return;
  S.fx = Object.assign({}, S.fx, { fx: p.fx.slice(), frame: p.frame, preset: id });
  if (p.surface) S.fx.surface = p.surface;
  if (p.style) S.style = p.style;
  ui();
  render();
}
function fxShuffle() {
  S.fx.seed = 1 + Math.floor(Math.random() * 9999);
  render();
}
function fxUI() {
  document.getElementById('fxPreset').innerHTML =
    `<option value="">${esc(t('fx_custom'))}</option>` +
    FX_PRESET_IDS.map((id) => `<option value="${id}">${esc(t('pre_' + id))}</option>`).join('');
  document.getElementById('fxPreset').value = S.fx.preset || '';
  document.getElementById('fxFrame').innerHTML = FRAME_IDS.map(
    (id) => `<option value="${id}">${esc(t('frame'))}: ${esc(t('fr_' + id))}</option>`,
  ).join('');
  document.getElementById('fxFrame').value = S.fx.frame;
  document.getElementById('fxSurface').value = S.fx.surface;
  document.getElementById('fxList').innerHTML = FXC_IDS.map((c) => FX_CATS.find((x) => x[0] === c))
    .map(
      ([c, ids]) =>
        `<div class="fxcat">${esc(t('fxc_' + c))}</div><div class="row">${ids.map((id) => `<button class="chip sm ${fxOn(id) ? 'on' : ''}" onclick="setFx('${id}')">${esc(t('fx_' + id))}</button>`).join('')}</div>`,
    )
    .join('');
  document.getElementById('fxInfo').textContent =
    (S.fx.preset ? t('pre_' + S.fx.preset) : S.fx.fx.length ? S.fx.fx.length + ' fx' : t('off')) +
    (S.fx.frame !== 'none' ? ' · ' + t('fr_' + S.fx.frame) : '');
}

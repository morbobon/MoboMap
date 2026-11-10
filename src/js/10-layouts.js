// Page layouts (artboard size in SVG units). Labels: i18n keys lay_<id>.
const LAYOUTS = [
  { id: 'land', d: '1000×800', w: 1000, h: 800 },
  { id: 'port', d: '800×1100 (A4)', w: 800, h: 1130 },
  { id: 'square', d: '1000×1000 (SoMe)', w: 1000, h: 1000 },
  { id: 'wide', d: '1200×675 (16:9)', w: 1200, h: 675 },
  { id: 'phone', d: '720×1280 (9:16)', w: 720, h: 1280 },
];
let W = 1000,
  H = 800,
  PAD = { l: 60, r: 60, t: 120, b: 60 },
  FOOT = 0,
  sc = 1,
  ox = 0,
  oy = 0;
const cache = {};

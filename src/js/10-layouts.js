// Page layouts: the artboard's shape in SVG units (long side about 1000-1300, so text sizes stay put).
// g: group in the Page tab; n: the format's name (not translated); o: its i18n key lay_<o> (orientation or use).
// Sizes of one shape (A5, A4, A3 …) are the same layout: the physical size only matters when printing.
// The first five ids are older than the groups and stay as they are (projects and links use them).
const LAYOUTS = [
  { id: 'port', g: 'paper', n: 'A4 · A3', o: 'port', w: 800, h: 1130 },
  { id: 'aland', g: 'paper', n: 'A4 · A3', o: 'land', w: 1131, h: 800 },
  { id: 'letter', g: 'paper', n: 'Letter', o: 'port', w: 850, h: 1100 },
  { id: 'letterland', g: 'paper', n: 'Letter', o: 'land', w: 1100, h: 850 },
  { id: 'legal', g: 'paper', n: 'Legal', o: 'port', w: 800, h: 1318 },
  { id: 'tabloid', g: 'paper', n: 'Tabloid', o: 'port', w: 800, h: 1236 },
  { id: 'tabloidland', g: 'paper', n: 'Tabloid', o: 'land', w: 1236, h: 800 },
  { id: 'wide', g: 'screen', n: '16:9', o: 'wide', w: 1200, h: 675 },
  { id: 'wide1610', g: 'screen', n: '16:10', o: 'wide', w: 1200, h: 750 },
  { id: 'screen43', g: 'screen', n: '4:3', o: 'land', w: 1064, h: 798 },
  { id: 'phone', g: 'screen', n: '9:16', o: 'phone', w: 720, h: 1280 },
  { id: 'og', g: 'screen', n: '1.91:1', o: 'og', w: 1200, h: 630 },
  { id: 'square', g: 'social', n: '1:1', o: 'square', w: 1000, h: 1000 },
  { id: 'social45', g: 'social', n: '4:5', o: 'port', w: 880, h: 1100 },
  { id: 'land', g: 'social', n: '5:4', o: 'land', w: 1000, h: 800 },
  { id: 'photo32', g: 'social', n: '3:2', o: 'land', w: 1200, h: 800 },
  { id: 'photo23', g: 'social', n: '2:3', o: 'port', w: 800, h: 1200 },
];
const layoutOf = (id) => LAYOUTS.find((l) => l.id === id) || LAYOUTS.find((l) => l.id === 'land');
const layoutName = (l) => l.n + ' · ' + t('lay_' + l.o);
let W = 1000,
  H = 800,
  PAD = { l: 60, r: 60, t: 120, b: 60 },
  FOOT = 0,
  sc = 1,
  ox = 0,
  oy = 0;
const cache = {};

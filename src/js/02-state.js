// Default world projection (Miller: familiar shape, less polar inflation than Mercator)
const DEFAULT_PROJ = 'miller';
// Application state. Everything the UI edits lives here (plus the DOM checkboxes listed in CK).
const S = {
  ds: null,
  map: 'world', // dataset kind: 'world' | 'dk' (Danish municipalities) | 'adm1' (regions of any country)
  country: '', // ISO3 code of the country in view, '' = world
  attr: 'none',
  proj: DEFAULT_PROJ,
  focus: '', // zoom target inside the dataset: a group code or a unit code
  zoom: { k: 1, x: 0, y: 0 }, // wheel zoom / drag pan on top of the framing (screen units)
  fx: {
    fx: [],
    frame: 'none',
    surface: '#e8e4dc',
    seed: 7,
    preset: '',
    amt: {},
    strength: 1,
    light: { dir: 250, warm: 0 },
  }, // effects & picture frame (55-fx.js)
  dsColours: false, // map styles use the design system's colours (keeping their effects)
  guard: true, // contrast guard: readable text and visible highlights
  drag: {}, // texts moved by hand: { title | sub | legend | logo | co:<unit> | lb:<unit>: [dx, dy] }
  far: 'inset', // far-away parts (Alaska, Bornholm …): 'inset' | 'show' | 'hide'
  focusHide: false, // hide units outside the focus
  detailLevel: 0, // 0 auto (by zoom), else always 1 simple, 2 detailed, 3 fine (Display → Detail)
  cityMin: 0, // Display → Cities: 0 the major cities, else the smallest population shown (45-cities.js)
  worldProj: DEFAULT_PROJ, // remembered world projection while viewing a country
  lang: 'en',
  layout: 'land',
  style: 'flat',
  groups: [],
  active: 0,
  partners: [],
  texts: [], // custom text items (76-texts.js)
  lock: { on: false, pos: true, zoom: 1, zr: [1, 4], hl: true, edit: false }, // map locks (77-locks.js)
  tb: { title: {}, sub: {} }, // the title's and subtitle's own font, size, colour … (76-texts.js)
  visited: new Set(), // maps opened this session (example selection only on first visit)
};
// off: hidden from the map (kept in the panel, projects and links)
// id: stable within the session; parent: the supergroup's id for a subgroup (33-group-tree.js);
// legend: shown in the legend; nameLabel: Label/Callout show the group's name once; sepLegend: own legend box
let GROUP_SEQ = 0;
const newGroup = (name, hl, color, op = 1, off = false) => ({
  id: ++GROUP_SEQ,
  parent: null,
  name,
  sel: new Set(),
  hl: new Set(hl),
  color,
  op,
  off,
  legend: true,
  nameLabel: false,
  sepLegend: false,
  bad: [],
});

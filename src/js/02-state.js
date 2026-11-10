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
  worldProj: DEFAULT_PROJ, // remembered world projection while viewing a country
  lang: 'en',
  layout: 'land',
  style: 'flat',
  groups: [],
  active: 0,
  partners: [],
  visited: new Set(), // maps opened this session (example selection only on first visit)
};
const newGroup = (name, hl, color, op = 1) => ({ name, sel: new Set(), hl: new Set(hl), color, op, bad: [] });

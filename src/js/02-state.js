// Application state. Everything the UI edits lives here (plus the DOM checkboxes listed in CK).
const S = {
  ds: null,
  map: 'world', // dataset kind: 'world' | 'dk' (Danish municipalities) | 'adm1' (regions of any country)
  country: '', // ISO3 code of the country in view, '' = world
  attr: 'none',
  proj: 'robinson',
  focus: '', // zoom target inside the dataset: a group code or a unit code
  focusHide: false, // hide units outside the focus
  worldProj: 'robinson', // remembered world projection while viewing a country
  lang: 'en',
  layout: 'land',
  style: 'flat',
  groups: [],
  active: 0,
  partners: [],
  visited: new Set(), // maps opened this session (example selection only on first visit)
};
const newGroup = (name, hl, color) => ({ name, sel: new Set(), hl: new Set(hl), color, bad: [] });

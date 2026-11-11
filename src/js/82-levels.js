// Simple and Advanced mode, and the Settings window (app preferences).
//
// Simple shows the short way to a finished map, Advanced shows every control. The map is the same in both: a hidden
// control keeps its value and keeps working. The mode is a preference of this browser (localStorage), never part of
// a link or a project; a first visit starts in Simple.
//
// HOW TO SET A CONTROL'S LEVEL: one attribute on its element, in src/app.html or in the template string that
// draws it:
//     (no attribute)   basic: shown in Simple and in Advanced
//     data-lv="adv"    Advanced only
//     data-lv="pro"    Advanced only, with a small "Pro" badge (a tag for now: nothing is locked)
// Put it on the control's own row (its <label>, .row, <details> …), on a container to hide all it holds (#decoUI),
// or on a <section class="sec"> to hide a whole section. Not on an <option>. That is all: the body has the class
// "lv-simple" in Simple mode and one rule in app.css hides [data-lv], so controls redrawn by ui() need nothing more.
//
// A section that hides a setting which is not at its default says so in Simple mode ("Customised", with Reset and
// a shortcut to Advanced): add the section to LV_CUST below. jumpTo() (context menu, Shift+click, chips) switches
// to Advanced by itself when its target is hidden.
const LV_KEY = 'mobomap.level';
const lvMode = () => (localStorage.getItem(LV_KEY) === 'adv' ? 'adv' : 'simple');
// is this element (or what holds it) hidden by Simple mode?
const lvHidden = (el) => lvMode() === 'simple' && !!el.closest('[data-lv]');
function applyLevel() {
  const m = lvMode();
  document.body.classList.toggle('lv-simple', m === 'simple');
  document.querySelectorAll('[data-lvset]').forEach((b) => {
    b.classList.toggle('on', b.dataset.lvset === m);
    b.setAttribute('aria-pressed', b.dataset.lvset === m);
  });
}
function setLevel(m) {
  if ((m === 'adv' ? 'adv' : 'simple') === lvMode()) return;
  localStorage.setItem(LV_KEY, m === 'adv' ? 'adv' : 'simple');
  applyLevel();
  document.getElementById('lockPop').hidden = true;
  // the panel has another height now: the group cards fold to fit it
  if (window.MOBOMAP_READY) ui();
}
applyLevel();

// ---- "Customised": a section whose hidden settings are not at their defaults ----
// The default of a checkbox, a position … is what the start map has (src/default-project.json), as for links.
const lvStart = () => DEFAULT_PROJECT || {};
const lvCkStart = (k) => {
  const c = lvStart().checks || {};
  return k in c ? !!c[k] : DEFAULT_CHECKS[k];
};
const lvCk = (k) => document.getElementById(k).checked !== lvCkStart(k);
const lvCkReset = (...ks) => ks.forEach((k) => (document.getElementById(k).checked = lvCkStart(k)));
const lvProj = () => (S.country ? 'local' : lvStart().proj || DEFAULT_PROJ);
const lvDecor = (fx) => (fx || []).filter((id) => FX_DECOR.includes(id)).sort();
const lvPlain = (fx) => (fx || []).filter((id) => !FX_DECOR.includes(id)).sort();
// what the Effects section hides: the effects (not the decorations), their amounts and the light.
// The overall strength is shown in Simple; the frame has its own section.
const lvFxState = (f) =>
  JSON.stringify([
    lvPlain(f.fx),
    Object.entries(f.amt || {})
      .filter(([id]) => !FX_DECOR.includes(id) && (f.fx || []).includes(id))
      .sort(),
    f.light || { dir: 250, warm: 0 },
  ]);
const LV_FX_NONE = { fx: [], amt: {}, light: { dir: 250, warm: 0 } };
const lvTitlePos = () => lvStart().titlePos || 'auto';
const LV_PAGE_AREAS = ['fill', 'margin', 'wall', 'band', 'mat', 'border'],
  LV_PAGE_HEAD = ['header', 'headerH', 'footer'],
  LV_PB = ['bd', 'bw', 'br', 'bc', 'bs', 'scale'];
const lvPageDiff = (keys) => keys.some((k) => pageOpts()[k] !== PAGE_DEFAULT[k]);
const lvPageReset = (keys) =>
  (S.page = pageClean(Object.assign({}, pageOpts(), Object.fromEntries(keys.map((k) => [k, PAGE_DEFAULT[k]])))));
// the look that is on (56-workspace.js), or nothing
const lvLook = () => (S.fx.preset && lookOf(S.fx.preset)) || {};
// section id: { is: a hidden setting differs from its default, reset: put those back (ui and render follow) }
const LV_CUST = {
  map: {
    is: () => !!GEO.geo && (S.proj !== lvProj() || S.repeat === false || S.far !== 'inset'),
    reset: () => {
      S.proj = lvProj();
      S.repeat = true;
      if (S.far !== 'inset') setFar('inset');
    },
  },
  display: {
    is: () =>
      lvCk('showNeighbours') || lvCk('relief') || lvCk('detail') || !!S.focusHide || !!S.detailLevel || !!S.cityMin,
    reset: () => {
      lvCkReset('showNeighbours', 'relief', 'detail');
      S.focusHide = false;
      document.getElementById('focusHide').checked = false;
      S.detailLevel = 0;
      S.cityMin = 0;
      syncDetailLevel();
    },
  },
  data: {
    is: () => S.attr !== 'none',
    reset: () => (S.attr = 'none'),
  },
  style: {
    is: () =>
      S.guard === false ||
      document.getElementById('frameSel').value !== 'auto' ||
      // (the user's changes to the style are not hidden: "Custom (from …)" with its own Reset shows in Simple too)
      // (the decorations a chosen look brings are the look, not a change to it)
      (!!decoOut().deco && decoCode(S.deco) !== decoCode(lvLook().deco)) ||
      (lvDecor(S.fx.fx).length > 0 &&
        lvDecor(S.fx.fx).join() !== lvDecor((lvStart().fx || {}).fx).join() &&
        lvDecor(S.fx.fx).join() !== lvDecor(lvLook().fx).join()),
    reset: () => {
      S.guard = true;
      document.getElementById('frameSel').value = 'auto';
      S.deco = null;
      S.fx = Object.assign({}, S.fx, { fx: S.fx.fx.filter((id) => !FX_DECOR.includes(id)) });
    },
  },
  fx: {
    // a chosen preset names what is on; without one the effects are compared with none and with the start map's
    is: () =>
      (!S.fx.preset &&
        lvFxState(S.fx) !== lvFxState(LV_FX_NONE) &&
        lvFxState(S.fx) !== lvFxState(lvStart().fx || {})) ||
      // the stains' own settings (73-stains.js) count where a stain is drawn
      (!!S.stains &&
        STAIN_KINDS.some((k) => S.fx.fx.includes(k)) &&
        stainCode(S.stains) !== stainCode(stainClean(lvStart().stains))),
    reset: () => {
      S.fx = Object.assign({}, S.fx, JSON.parse(JSON.stringify(LV_FX_NONE)), {
        fx: S.fx.fx.filter((id) => FX_DECOR.includes(id)),
        preset: '',
      });
      S.stains = null;
    },
  },
  // the widths of wall, frame and mat (also in the Areas & spacing diagram)
  frame: { is: () => lvPageDiff(FRAME_RINGS), reset: () => lvPageReset(FRAME_RINGS) },
  areas: { is: () => lvPageDiff(LV_PAGE_AREAS), reset: () => lvPageReset(LV_PAGE_AREAS) },
  headfoot: {
    is: () => {
      const f = footerOpts();
      return (
        lvPageDiff(LV_PAGE_HEAD) ||
        Object.keys(FOOTER_DEFAULT).some((k) => f[k] !== FOOTER_DEFAULT[k]) ||
        f.rowAlign.some((a) => a)
      );
    },
    reset: () => {
      lvPageReset(LV_PAGE_HEAD);
      S.footer = Object.assign({}, FOOTER_DEFAULT);
    },
  },
  text: {
    is: () =>
      document.getElementById('titlePos').value !== lvTitlePos() ||
      document.getElementById('subPos').value !== 'under' ||
      // (the title a chosen look brings is the look, not a change to it)
      !['auto', 'none', lvLook().title].includes(S.fx.title) ||
      !['auto', 'none', lvLook().sub].includes(S.fx.sub),
    reset: () => {
      document.getElementById('titlePos').value = lvTitlePos();
      document.getElementById('subPos').value = 'under';
      S.fx = Object.assign({}, S.fx, { title: 'auto', sub: 'auto' });
    },
  },
  ds: {
    is: () => !!S.dsColours,
    reset: () => (S.dsColours = false),
  },
  logo: {
    is: () => logoClean(S.logo).scale !== 1 || !!logoClean(S.logo).link,
    reset: () => (S.logo = null),
  },
  partners: {
    is: () => LV_PB.some((k) => pbOpts()[k] !== PB_DEFAULT[k]),
    reset: () => (S.pblock = pbOpts().at ? { at: pbOpts().at } : null),
  },
};
// show or hide each section's marker (called by ui() and after every render; the DOM is touched only on a change)
function lvMarks() {
  const simple = lvMode() === 'simple';
  // Display's summary counts the switches that this mode shows
  const shown = ['labels', 'showCities', 'showNeighbours', 'relief', 'detail', 'focusHide']
    .map((k) => document.getElementById(k))
    .filter((el) => !lvHidden(el));
  document.getElementById('displayInfo').textContent = shown.filter((el) => el.checked).length + '/' + shown.length;
  for (const id in LV_CUST) {
    const sec = document.querySelector(secOf(id));
    let on = false;
    try {
      on = simple && !!LV_CUST[id].is();
    } catch (e) {
      on = false; // before the first map is loaded
    }
    if (on === sec.classList.contains('lv-cust')) continue;
    sec.classList.toggle('lv-cust', on);
    // the marker row, made once (data-i18n: setLang keeps it in the language)
    if (on && !sec.querySelector(':scope > .lvc'))
      sec
        .querySelector('h2')
        .insertAdjacentHTML(
          'afterend',
          `<div class="lvc"><span data-i18n="lv_cust" data-i18n-title="lv_cust_t" title="${esc(t('lv_cust_t'))}">${esc(t('lv_cust'))}</span>` +
            `<button class="chip sm" onclick="lvReset('${id}')" data-i18n="lv_reset">${esc(t('lv_reset'))}</button>` +
            `<button class="chip sm" onclick="lvShow('${id}')" data-i18n="lv_show">${esc(t('lv_show'))}</button></div>`,
        );
  }
}
function lvReset(id) {
  LV_CUST[id].reset();
  ui();
  render();
  toast(t('lv_reset_done'));
}
function lvShow(id) {
  setLevel('adv');
  // what the Map style section hides is behind its Customise foldout
  if (id === 'style') return styleCustomise();
  jumpTo(secOf(id));
}

// ---- Settings window: preferences of the app in this browser (nothing of the map's design) ----
function openSettings() {
  document.body.classList.remove('more-open');
  const d = document.getElementById('setDlg');
  if (!d.open) d.showModal();
}
function closeSettings() {
  document.getElementById('setDlg').close();
}
function settingsReset() {
  closeSettings();
  goHome();
}
// a click beside the window closes it
document.getElementById('setDlg').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeSettings();
});

// ---- Logo → "Use your own logo…": the picture becomes the logo of your own copy of the profile ----
function ownLogo(file) {
  if (!file) return;
  const editing = !!DSE.draft;
  dsEditOpen();
  dsEditLogo(file, () => {
    document.getElementById('showLogo').checked = true;
    // a profile that is being edited keeps its other changes open: show the editor instead of saving for the user
    if (editing) {
      render();
      jumpTo('#dsEdit');
    } else dsEditSave();
  });
}

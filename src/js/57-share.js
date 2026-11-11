// Share links: the current map as readable URL parameters, only where it differs from the start project.
//   c=DNK  f=city:Aarhus  st=topo  ds=nordic  lay=wide  proj=robinson  attr=pop  l=da  fx=grain.glass  fr=oak
//   sf=e8e4dc  tfx=ribbon  sfx=rules  t=Title  sub=Subtitle  tp=tl  sp=under  far=hide  dsc=1  gd=0  z=1.6,-250,-60  fh=1
//   ck=+labels.-showCities  g=e4573d*fill.glow*DNK.SWE*Nordics_3a86ff*hatch*NOR   (groups: colour*modes*codes*name[*opacity %[*off[*p<supergroup index>hns]]])
// The address bar follows the map (history.replaceState), and "Share link" copies it.
const SHARE_DEMO = 'https://morbobon.github.io/MoboMap/';
function shareBase() {
  // a page opened from disk cannot be shared as such: point at the public demo instead
  return location.protocol === 'file:' ? SHARE_DEMO : location.origin + location.pathname;
}
// Links are read against a neutral base: the start project without its effects and zoom. Only the bare
// address (no parameters) gets the start view's effects, so links made before those defaults existed
// still open as they were made.
function linkBase() {
  const b = JSON.parse(JSON.stringify(DEFAULT_PROJECT || { format: 'mobomap-project', version: 1 }));
  b.fx = Object.assign({}, b.fx || {}, { fx: [], amt: {}, frame: 'none', preset: '' });
  b.zoom = { k: 1, x: 0, y: 0 };
  return b;
}
// a link waiting for its design system: { ds, search }
let PENDING_LINK = null;
// called after design systems were added: true when a waiting link was applied
function applyPendingLink(ids) {
  if (!PENDING_LINK || !ids.includes(PENDING_LINK.ds)) return false;
  const pl = PENDING_LINK;
  PENDING_LINK = null;
  const p = projectFromUrl(pl.search);
  if (!p) return false;
  loadProject(p, true);
  toast(t('ts_ds_applied').replace('{id}', loc(DS[pl.ds].name)));
  return true;
}
function shareParams() {
  const p = projectState(),
    d = linkBase();
  const q = new URLSearchParams();
  const put = (k, v, def) => {
    if (v == null) return;
    if (String(v) !== String(def == null ? '' : def)) q.set(k, v);
  };
  put('c', p.country || 'world', d.country || 'world');
  put('f', p.focus, d.focus || '');
  put('st', p.style, d.style || 'flat');
  put('ds', PENDING_LINK ? PENDING_LINK.ds : p.designSystem, d.designSystem || '');
  put('lay', p.layout, d.layout || 'land');
  if (GEO.geo) put('proj', p.proj, p.country ? 'local' : d.proj || DEFAULT_PROJ);
  put('attr', p.attr, d.attr || 'none');
  put('as', p.attrScope, 'all');
  put('l', p.lang, 'en');
  const dfx = d.fx || {};
  put('fx', p.fx.fx.join('.'), (dfx.fx || []).join('.'));
  put('fr', p.fx.frame, dfx.frame || 'none');
  // links without tfx/sfx (old ones) mean no flair, so 'auto' is written out
  put('tfx', p.fx.title || 'auto', 'none');
  put('sfx', p.fx.sub || 'auto', 'none');
  put('sf', String(p.fx.surface || '').replace('#', ''), String(dfx.surface || '#e8e4dc').replace('#', ''));
  if (p.fx.seed !== (dfx.seed || 7)) q.set('seed', p.fx.seed);
  // intensities, compared with the start project's
  const faOf = (fx) =>
    Object.entries((fx && fx.amt) || {})
      .filter(([k, v]) => (fx.fx || []).includes(k) && Math.abs(v - 1) > 0.001)
      .map(([k, v]) => k + ':' + Math.round(v * 100))
      .sort()
      .join('.');
  const fa = faOf(p.fx);
  if (fa !== faOf(dfx)) q.set('fa', fa);
  if (p.fx.strength != null && Math.abs(p.fx.strength - 1) > 0.001) q.set('fs', Math.round(p.fx.strength * 100));
  const lt = p.fx.light || {};
  if (lt.dir != null && lt.dir !== 250) q.set('ld', lt.dir);
  if (lt.warm) q.set('lw', Math.round(lt.warm * 100));
  // partner footer: rows.autoScale.margin, and the profile partners' order / rows / visibility
  const fo = p.footer,
    fd = Object.assign({}, FOOTER_DEFAULT, d.footer || {});
  const ac = footerAlignCode(fo);
  if (fo.rows !== fd.rows || !!fo.autoScale !== !!fd.autoScale || fo.margin !== fd.margin || ac !== footerAlignCode(fd))
    q.set('pf', [fo.rows, fo.autoScale ? 1 : 0, fo.margin, ac].join('_'));
  const po = partnerOrderParam();
  if (po) q.set('po', po);
  put('tp', p.titlePos, d.titlePos || 'auto');
  put('sp', p.subPos, d.subPos || 'under');
  put('far', p.far, d.far || 'inset');
  if (p.dsColours) q.set('dsc', '1');
  // dragged texts: key~dx~dy, separated by '.'
  const drg = Object.entries(p.drag || {}).filter(([, v]) => v[0] || v[1]);
  if (drg.length) q.set('dg', drg.map(([k, v]) => k + '~' + Math.round(v[0]) + '~' + Math.round(v[1])).join('.'));
  // menu layout of this view
  const b = document.body;
  if (b.classList.contains('no-panel') !== DEFAULT_CHROME.panel)
    q.set('hp', b.classList.contains('no-panel') ? '1' : '0');
  const hs = b.classList.contains('strip-min') ? '2' : b.classList.contains('no-strip') ? '1' : '0';
  if (hs !== { min: '2', true: '1', false: '0' }[DEFAULT_CHROME.strip]) q.set('hs', hs);
  if (b.classList.contains('fs')) q.set('full', '1');
  const dsFooter = DS[p.designSystem] ? loc(DS[p.designSystem].footer.label) : '';
  if (p.footerLabel && p.footerLabel !== dsFooter) q.set('ft', p.footerLabel);
  if (p.fx.preset && (p.fx.preset === 'random' || FX_PRESETS[p.fx.preset])) q.set('pr', p.fx.preset);
  if (!p.guard) q.set('gd', '0');
  if (p.focusHide) q.set('fh', '1');
  if (p.repeat === false) q.set('rw', '0');
  if (p.detailLevel) q.set('dl', p.detailLevel);
  if (p.cityMin) q.set('cm', p.cityMin);
  if (p.frame !== 'auto') q.set('fl', p.frame);
  // zoom: written when it differs from the start project's view (z=1,0,0 = the whole map)
  const zs = (z) => [(z || { k: 1 }).k.toFixed(3), Math.round((z && z.x) || 0), Math.round((z && z.y) || 0)].join(',');
  const sameMap = (p.country || 'world') === (d.country || 'world') && (p.focus || '') === (d.focus || '');
  if (zs(p.zoom) !== (sameMap ? zs(d.zoom) : zs(null))) q.set('z', zs(p.zoom));
  // checkboxes that differ from the start project
  const dck = d.checks || {};
  const ck = CK.filter((k) => k in p.checks && !!p.checks[k] !== !!(k in dck ? dck[k] : DEFAULT_CHECKS[k])).map(
    (k) => (p.checks[k] ? '+' : '-') + k,
  );
  if (ck.length) q.set('ck', ck.join('.'));
  if (!p.checks.autoText) {
    put('t', p.title, d.title || '');
    put('sub', p.sub, d.sub || '');
  }
  const tx = txParam(p);
  if (tx !== txParam(d)) q.set('tx', tx);
  const lk = lockParam(p.lock);
  if (lk) q.set('lk', lk);
  // the brand logo: its size in % and its own link
  const lgo = logoClean(p.logo),
    lgd = logoClean(d.logo);
  if (lgo.scale !== lgd.scale) q.set('lg', Math.round(lgo.scale * 100));
  if (lgo.link !== lgd.link) q.set('ll', lgo.link);
  // page areas (79-page.js): only when they differ from the start map's
  const pgc = pageCode(p.page);
  if (pgc !== pageCode(d.page)) q.set('pg', pgc);
  // decorations (72-decor.js)
  const dcc = decoCode(p.deco);
  if (dcc !== decoCode(d.deco)) q.set('dc', dcc);
  const gs = p.groups.map((g, i) => {
    const f = [
      String(g.color).replace('#', ''),
      g.hl.join('.'),
      g.kommuner.join('.'),
      g.name === t('group') + ' ' + (i + 1)
        ? ''
        : encodeURIComponent(g.name).replace(/\*/g, '%2A').replace(/_/g, '%5F'),
      g.opacity < 1 ? Math.round(g.opacity * 100) : '',
      g.off ? 'off' : '',
      (Number.isInteger(g.parent) ? 'p' + g.parent : '') +
        (g.legend === false ? 'h' : '') +
        (g.nameLabel ? 'n' : '') +
        (g.sepLegend ? 's' : ''),
    ];
    // optional fields only as far as they are used
    while (f.length > 4 && f[f.length - 1] === '') f.pop();
    return f.join('*');
  });
  const dg = (d.groups || []).length;
  if (gs.length || dg) q.set('g', gs.join('_'));
  return q;
}
// a number only from a non-empty numeric string ('' and 'abc' are ignored)
const num = (s) => (/^-?\d+(\.\d+)?$/.test(s || '') ? +s : null);
const safeDecode = (s) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};
// default checkbox states in the markup, for projects that do not list a checkbox
const DEFAULT_CHECKS = {};
function shareUrl() {
  const q = shareParams().toString();
  return shareBase() + (q ? '?' + q : '');
}
// URL -> project object (start project + the parameters), or null without parameters
function projectFromUrl(search) {
  const q = new URLSearchParams(search || '');
  const known = [
    'tx',
    'lk',
    'lg',
    'll',
    'pg',
    'dc',
    'c',
    'f',
    'st',
    'ds',
    'lay',
    'proj',
    'rw',
    'attr',
    'l',
    'fx',
    'fr',
    'sf',
    'seed',
    'tp',
    'sp',
    'far',
    'dsc',
    'gd',
    'fh',
    'dl',
    'cm',
    'fl',
    'z',
    'ck',
    't',
    'sub',
    'g',
    'fa',
    'fs',
    'ld',
    'lw',
    'ft',
    'pr',
    'dg',
    'tfx',
    'sfx',
    'pf',
    'po',
    'as',
  ];
  if (!known.some((k) => q.has(k))) return null;
  const p = linkBase();
  p.format = 'mobomap-project';
  const g = (k) => q.get(k);
  const okCountry = (c) => c === 'world' || c.toUpperCase() === 'DNK' || Object.hasOwn(DATA.adm1i, c.toUpperCase());
  if (q.has('c') && !okCountry(g('c'))) {
    const bad = g('c');
    setTimeout(() => toast(t('ts_link_bad') + ': c=' + bad), 600);
    q.delete('c');
    q.delete('f');
  }
  if (q.has('c')) {
    const c = g('c');
    p.country = c === 'world' ? '' : c.toUpperCase();
    p.map = c === 'world' ? 'world' : c.toUpperCase() === 'DNK' ? 'dk' : 'adm1';
    if (!q.has('proj')) p.proj = c === 'world' ? (DEFAULT_PROJECT || {}).proj || DEFAULT_PROJ : 'local';
  }
  if (q.has('f')) p.focus = g('f');
  if (q.has('st') && STYLES.some((s) => s.id === g('st'))) p.style = g('st');
  if (q.has('ds')) {
    const v = g('ds');
    if (DS[v]) p.designSystem = v;
    else {
      // a private profile the receiver does not have (yet): keep the link as it is and apply it again as
      // soon as a profile with that id is added (import, sidecar file)
      PENDING_LINK = { ds: v, search: search };
      setTimeout(() => toast(t('ts_ds_pending').replace('{id}', v), 8000), 600);
    }
  }
  if (q.has('lay') && LAYOUTS.some((l) => l.id === g('lay'))) p.layout = g('lay');
  if (q.has('proj') && Object.hasOwn(PROJS, g('proj'))) p.proj = g('proj');
  if (q.has('as') && /^(all|focus|sel|r:[\w-]+)$/.test(g('as'))) p.attrScope = g('as');
  if (q.has('attr') && (g('attr') === 'none' || Object.values(ATTRS).some((a) => a.some((x) => x.id === g('attr')))))
    p.attr = g('attr');
  if (q.has('l')) p.lang = g('l');
  p.fx = Object.assign({ fx: [], frame: 'none', surface: '#e8e4dc', seed: 7, preset: '' }, p.fx || {});
  if (q.has('fx'))
    p.fx.fx = g('fx')
      ? g('fx')
          .split('.')
          .filter((x) => FX_IDS.includes(x))
      : [];
  if (q.has('fr') && FRAME_IDS.includes(g('fr'))) p.fx.frame = g('fr');
  p.fx.title = q.has('tfx') && TITLE_FX.includes(g('tfx')) ? g('tfx') : 'none';
  p.fx.sub = q.has('sfx') && SUB_FX.includes(g('sfx')) ? g('sfx') : 'none';
  if (q.has('sf') && /^[0-9a-f]{3,6}$/i.test(g('sf'))) p.fx.surface = '#' + g('sf');
  if (q.has('seed')) p.fx.seed = +g('seed') || 7;
  if (q.has('fa'))
    p.fx.amt = Object.fromEntries(
      g('fa')
        .split('.')
        .map((x) => x.split(':'))
        .filter(([k, v]) => FX_IDS.includes(k) && num(v) != null)
        .map(([k, v]) => [k, Math.max(0, Math.min(2, +v / 100))]),
    );
  if (num(g('fs')) != null && num(g('fs')) >= 0 && num(g('fs')) <= 200) p.fx.strength = num(g('fs')) / 100;
  p.fx.light = Object.assign({ dir: 250, warm: 0 }, p.fx.light || {});
  if (num(g('ld')) != null) p.fx.light.dir = ((num(g('ld')) % 360) + 360) % 360;
  if (num(g('lw')) != null) p.fx.light.warm = Math.max(-1, Math.min(1, num(g('lw')) / 100));
  p.fx.preset = q.has('pr') && (g('pr') === 'random' || Object.hasOwn(FX_PRESETS, g('pr'))) ? g('pr') : '';
  const posOk = (v, extra) => ['tl', 'tc', 'tr', 'bl', 'bc', 'br', extra].includes(v);
  if (q.has('tp') && posOk(g('tp'), 'auto')) p.titlePos = g('tp');
  if (q.has('sp') && posOk(g('sp'), 'under')) p.subPos = g('sp');
  if (q.has('ft')) p.footerLabel = g('ft');
  if (q.has('pf')) {
    // rows_auto_margin_align (l/c/r, then one letter per row, '-' = the common one); the first links used '.' and had no alignment
    const v = g('pf');
    const [r, a, m, al] = v.includes('_')
      ? v.split('_')
      : [...v.split('.').slice(0, 2), v.split('.').slice(2).join('.')];
    p.footer = {
      rows: num(r) ?? 1,
      autoScale: a !== '0',
      margin: num(m) ?? FOOTER_DEFAULT.margin,
      align: AL_OF[(al || '')[0]] || 'left',
      rowAlign: [...(al || '').slice(1)].map((ch) => AL_OF[ch] || ''),
    };
  }
  if (q.has('po')) p.partnerOrder = g('po');
  if (q.has('dg')) {
    p.drag = {};
    for (const part of g('dg').split('.')) {
      const [k, x, y] = part.split('~');
      if (k && num(x) != null && num(y) != null) p.drag[k] = [num(x), num(y)];
    }
  }
  if (q.has('far')) p.far = g('far');
  if (q.has('dsc')) p.dsColours = g('dsc') === '1';
  if (q.has('gd')) p.guard = g('gd') !== '0';
  if (q.has('fh')) p.focusHide = g('fh') === '1';
  if (q.has('rw')) p.repeat = g('rw') !== '0';
  if (q.has('dl')) p.detailLevel = +g('dl');
  if (q.has('cm')) p.cityMin = +g('cm');
  if (q.has('fl')) p.frame = g('fl');
  // another map than the start project's: its zoom does not carry over
  const D0 = DEFAULT_PROJECT || {};
  if ((p.country || 'world') !== (D0.country || 'world') || (p.focus || '') !== (D0.focus || ''))
    p.zoom = { k: 1, x: 0, y: 0 };
  if (q.has('z')) {
    const [k, x, y] = g('z').split(',').map(Number);
    if (Number.isFinite(k) && k > 0)
      p.zoom = { k: Math.min(40, Math.max(0.5, k)), x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0 };
  }
  p.checks = Object.assign({}, DEFAULT_CHECKS, p.checks || {});
  if (q.has('ck'))
    for (const c of g('ck').split('.')) {
      const k = c.slice(1);
      if (CK.includes(k)) p.checks[k] = c[0] === '+';
    }
  if (q.has('t') || q.has('sub')) {
    p.checks.autoText = false;
    p.title = g('t') || '';
    p.sub = g('sub') || '';
  }
  if (q.has('tx')) txFromParam(g('tx'), p);
  if (q.has('lk')) p.lock = lockFromParam(g('lk'));
  if (q.has('pg')) p.page = pageFromCode(g('pg'));
  if (q.has('dc')) p.deco = decoFromCode(g('dc'));
  if (q.has('lg') || q.has('ll'))
    p.logo = logoClean({
      scale: q.has('lg') ? +g('lg') / 100 : (p.logo || {}).scale,
      link: q.has('ll') ? g('ll') : (p.logo || {}).link,
    });
  if (q.has('g'))
    p.groups = g('g')
      ? g('g')
          .split('_')
          .map((s, i) => {
            const [col, hl, codes, name, op, off, fl = ''] = s.split('*');
            const par = fl.match(/p(\d+)/);
            return {
              name: name ? safeDecode(name) : '',
              color: /^[0-9a-f]{3,6}$/i.test(col || '') ? '#' + col : undefined,
              hl: hl ? hl.split('.').filter((h) => HLS.some((x) => x.id === h)) : ['fill'],
              kommuner: codes ? codes.split('.') : [],
              ...(op ? { opacity: +op / 100 } : {}),
              ...(off === 'off' ? { off: true } : {}),
              ...(par ? { parent: +par[1] } : {}),
              ...(fl.includes('h') ? { legend: false } : {}),
              ...(fl.includes('n') ? { nameLabel: true } : {}),
              ...(fl.includes('s') ? { sepLegend: true } : {}),
            };
          })
      : [];
  delete p.partners; // partners come from the profile
  return p;
}
function syncUrl() {
  if (!history.replaceState) return;
  try {
    const q = shareParams().toString();
    const url = location.pathname + (q ? '?' + q : '') + location.hash;
    if (url !== location.pathname + location.search + location.hash) history.replaceState(null, '', url);
  } catch {
    /* file:// pages may refuse URL changes; the Share button still works */
  }
}
async function shareLink() {
  const url = shareUrl();
  try {
    await navigator.clipboard.writeText(url);
    toast(t('ts_link_copied') + (location.protocol === 'file:' ? ' · ' + t('ts_link_demo') : ''));
  } catch {
    prompt(t('share_link'), url);
  }
}

// target: an SVG element to draw into instead of the page (look thumbnails) – no other side effects then
function render(target) {
  const links = window._links;
  setLayout(S.layout);
  fxLayout();
  const D = DS[S.ds],
    st = S.style,
    det = document.getElementById('detail').checked || !!focusCity() || S.zoom.k > 2,
    all = document.getElementById('labels').checked;
  const ds = Object.assign({ head: D.fonts.heading, body: D.fonts.body }, D.colors);
  let sp = SP[st] || {};
  if (S.dsColours) {
    const L = D.colors;
    sp = Object.assign({}, sp, {
      bg: L.bg,
      land: L.land,
      landAlt: L.landAlt,
      // outline draws only borders: they need ink; doodle patterns are white with black lines
      stroke:
        st === 'silhouette'
          ? L.land
          : st === 'outline'
            ? readable([L.dark ? L.ink : L.land, L.ink, L.primary], L.bg, 3)
            : sp.patterns
              ? '#111111'
              : st === 'neon'
                ? readable([L.accent, L.ink], L.bg, 3)
                : L.stroke,
      ink: L.ink,
      dark: !!L.dark,
      heading: L.dark ? L.headingOnDark : L.heading,
      labelColor: undefined,
      textColor: sp.textColor && (light(L.land) ? '#1b1b1b' : '#ffffff'),
      wordColors: sp.wordColors && D.highlight.slice(0, 3),
      bgGradient: sp.bgGradient && [mix(L.bg, '#ffffff', 0.08), mix(L.bg, '#000000', 0.3)],
      extrudeColor: sp.extrudeColor && mix(L.land, '#000000', 0.45),
      landGlow: sp.landGlow && L.accent,
      // real elevation stays, but as neutral shading over the profile's land instead of hypsometric tints
      relief: false,
      reliefShade: !!sp.relief,
    });
  }
  const dsc = !!S.dsColours;
  // style line colours that follow the profile with "design-system colours" (blueprint grid, network lines)
  const bpLine = dsc
    ? readable([D.colors.dark ? D.colors.ink : D.colors.land, D.colors.ink, D.colors.primary], D.colors.bg, 3)
    : '#9fd3ff';
  const net = dsc
    ? {
        glow: D.colors.accent,
        line: mix(D.colors.accent, D.colors.ink, 0.3),
        link: mix(D.colors.accent, D.colors.ink, 0.3),
        node: D.colors.dark ? D.colors.ink : D.colors.accent,
      }
    : { glow: '#7cc4ff', line: '#9fd6ff', link: '#8fd0ff', node: '#cfeeff' };
  const dark = sp.dark != null ? sp.dark : ds.dark || st === 'neon' || st === 'blueprint';
  let bg = ds.bg,
    land = ds.land,
    stroke = ds.stroke,
    ink = ds.ink,
    landAlt = ds.landAlt;
  if (st === 'neon') {
    bg = '#061a2b';
    land = '#0d2a40';
    stroke = '#19c6ff';
    ink = '#e6f7ff';
  }
  if (st === 'blueprint') {
    bg = '#163b5c';
    land = 'none';
    stroke = '#9fd3ff';
    ink = '#dcefff';
  }
  if (st === 'outline') {
    land = ds.dark ? bg : '#ffffff';
    stroke = ds.dark ? ink : ds.land;
    if (ds.dark) land = 'transparent';
  }
  if (st === 'glass') {
    bg = ds.dark ? bg : '#dfe6ec';
    land = ds.dark ? '#2d4454' : '#f3f6f8';
    stroke = ds.dark ? '#5a7a90' : '#b9c6d0';
    landAlt = land;
  }
  if (st === 'silhouette') {
    stroke = land;
  }
  if (st === 'atlas') {
    bg = ds.dark ? bg : '#ffffff';
    land = ds.dark ? land : '#b9d3e6';
    landAlt = land;
    stroke = ds.dark ? stroke : '#ffffff';
  }
  if (st === 'patchwork') {
    stroke = '#ffffff';
  }
  if (st === 'paper') {
    stroke = mix(land, bg, 0.35);
  }
  if (sp.bg) {
    bg = sp.bg;
    land = sp.land;
    stroke = sp.stroke;
    ink = sp.ink;
    landAlt = sp.landAlt || mix(land, bg, 0.25);
  }
  if (sp.pixel) {
    stroke = 'none';
  }
  const guard = S.guard !== false;
  const ink0 = ink;
  // backgrounds behind page text: the gradient stops, the neon vignette, the stone concrete overlay
  const textBgs = [bg];
  if (sp.bgGradient) textBgs.push(sp.bgGradient[0], sp.bgGradient[1]);
  if (st === 'neon' && dark) textBgs.push(mix(bg, '#000000', 0.4));
  if (sp.concrete) textBgs.push(mix(bg, '#ffffff', 0.2), mix(bg, '#000000', 0.15));
  if (guard) ink = readable([ink, ds.ink, ds.primary], textBgs, 4.5, 0.9);
  // opacity for faint secondary text (sources, footer label, sea names): kept unless it costs readability
  const tOp = (o) =>
    guard && Math.min(...textBgs.filter(isHex).map((b) => contrast(mix(ink, b, 1 - o), b))) < 4.5 ? 1 : o;
  const groups = S.groups;
  const selAll = new Set(groups.flatMap((g) => [...g.sel]));
  const AT = attrDef();
  const ATC = AT ? attrCats(AT) : [];
  const unsel = GEO.units.filter((k) => !selAll.has(k.c));
  const onCol = (c) => (light(c) ? '#1b1b1b' : '#ffffff');
  // Blur/shadow filters use a fixed region covering the whole artboard (plus a margin for the emboss
  // translate). A bbox-relative region clips the blur to a visible box around small units.
  const FR = `filterUnits="userSpaceOnUse" x="-50" y="-50" width="${W + 100}" height="${H + 100}"`;
  let defs = `<defs>
  <filter id="glow" ${FR}><feGaussianBlur stdDeviation="6" result="b1"/><feGaussianBlur stdDeviation="14" result="b2"/><feMerge><feMergeNode in="b2"/><feMergeNode in="b1"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="emboss" ${FR}><feDropShadow dx="0" dy="7" stdDeviation="5" flood-color="#000" flood-opacity="${dark ? 0.7 : 0.4}"/><feDropShadow dx="-1" dy="-1" stdDeviation="0.6" flood-color="#fff" flood-opacity="0.5"/></filter>
  <filter id="paper" ${FR}><feDropShadow dx="2" dy="4" stdDeviation="3" flood-color="#000" flood-opacity="0.22"/></filter>
  <filter id="neonf" ${FR}><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="longshadow" ${FR}>${[...Array(14)].map((_, i) => `<feOffset in="SourceAlpha" dx="${(i + 1) * 3}" dy="${(i + 1) * 3}" result="o${i}"/>`).join('')}<feMerge>${[...Array(14)].map((_, i) => `<feMergeNode in="o${i}"/>`).join('')}</feMerge><feColorMatrix type="matrix" values="0 0 0 0 0.1 0 0 0 0 0.2 0 0 0 0 0.3 0 0 0 0.35 0"/><feGaussianBlur stdDeviation="2"/></filter>
  <pattern id="dotsBase" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="${bg}"/><circle cx="3.5" cy="3.5" r="2.3" fill="${land === 'none' ? stroke : land}"/></pattern>
  <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="${bpLine}" stroke-opacity=".25" stroke-width=".7"/><path d="M10 0V50M20 0V50M30 0V50M40 0V50M0 10H50M0 20H50M0 30H50M0 40H50" stroke="${bpLine}" stroke-opacity=".1" stroke-width=".4"/></pattern>
  <linearGradient id="glassg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity=".2"/></linearGradient>
  <linearGradient id="extrSide" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(land, '#000', 0.35)}"/><stop offset="1" stop-color="${mix(land, '#000', 0.6)}"/></linearGradient>
  <filter id="slatef" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9 0.015" numOctaves="2" seed="3" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.35 0" result="w"/><feComposite in="w" in2="SourceGraphic" operator="in" result="t"/><feBlend in="t" in2="SourceGraphic" mode="screen"/></filter>
  <filter id="hillshade" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="4" seed="7" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0.3  0 0 0 0 0.35  0 0 0 0 0.2  0 0 0 0.45 0" result="w"/><feComposite in="w" in2="SourceGraphic" operator="in" result="t"/><feBlend in="t" in2="SourceGraphic" mode="multiply"/></filter>
  <filter id="hand" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" seed="5" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.5" xChannelSelector="R" yChannelSelector="G"/></filter>
  <pattern id="dStripe" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#fff"/><line x1="0" y1="0" x2="0" y2="8" stroke="#111" stroke-width="2.2"/></pattern>
  <pattern id="dDots" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#fff"/><circle cx="4" cy="4" r="1.8" fill="#111"/></pattern>
  <pattern id="dCross" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#fff"/><path d="M0 0L8 8M8 0L0 8" stroke="#111" stroke-width="1"/></pattern>
  <pattern id="dWave" width="14" height="8" patternUnits="userSpaceOnUse"><rect width="14" height="8" fill="#fff"/><path d="M0 4Q3.5 0 7 4T14 4" fill="none" stroke="#111" stroke-width="1.2"/></pattern>
  <pattern id="dScale" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#fff"/><path d="M0 6a6 6 0 0 0 12 0M-6 12a6 6 0 0 0 12 0M6 12a6 6 0 0 0 12 0" fill="none" stroke="#111" stroke-width="1"/></pattern>
  <pattern id="dBrick" width="14" height="8" patternUnits="userSpaceOnUse"><rect width="14" height="8" fill="#fff"/><path d="M0 0H14M0 4H14M7 0V4M0 4V8M14 4V8" fill="none" stroke="#111" stroke-width="1"/></pattern>
  <pattern id="dZig" width="10" height="8" patternUnits="userSpaceOnUse"><rect width="10" height="8" fill="#fff"/><path d="M0 6L2.5 2L5 6L7.5 2L10 6" fill="none" stroke="#111" stroke-width="1.1"/></pattern>
  <pattern id="dCheck" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#fff"/><rect width="4" height="4" fill="#111"/><rect x="4" y="4" width="4" height="4" fill="#111"/></pattern>
  <pattern id="waves" width="40" height="24" patternUnits="userSpaceOnUse"><path d="M0 12Q5 6 10 12T20 12M22 20Q27 14 32 20T42 20" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.2"/></pattern>
  <radialGradient id="midbg" cx=".45" cy=".45" r=".75"><stop offset="0" stop-color="${sp.bgGradient ? sp.bgGradient[0] : bg}"/><stop offset="1" stop-color="${sp.bgGradient ? sp.bgGradient[1] : bg}"/></radialGradient>
  <filter id="landglow" ${FR}><feGaussianBlur stdDeviation="10"/></filter>
  <filter id="stonef" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" seed="11" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0.3  0 0 0 0 0.3  0 0 0 0 0.28  0 0 0 0.35 0" result="w"/><feComposite in="w" in2="SourceGraphic" operator="in" result="t"/><feBlend in="t" in2="SourceGraphic" mode="multiply"/></filter>
  <filter id="concrete" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" seed="4" result="n"/><feColorMatrix in="n" type="saturate" values="0" result="g"/><feComponentTransfer in="g"><feFuncA type="linear" slope="0" intercept="0.22"/></feComponentTransfer></filter>
  <filter id="sticker" ${FR}><feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="#000" flood-opacity="0.25"/></filter>
  <filter id="pxshadow" ${FR}><feDropShadow dx="2" dy="3" stdDeviation="1.5" flood-color="#000" flood-opacity="0.3"/></filter>
  ${
    sp.flag && S.map === 'world'
      ? GEO.units
          .filter((k) => FLAGS[k.c])
          .map(
            (k) =>
              `<pattern id="fl_${k.c}" patternContentUnits="objectBoundingBox" width="1" height="1">${flagSVG(FLAGS[k.c], 0, 0, 1, 1)}</pattern>`,
          )
          .join('')
      : ''
  }
  <radialGradient id="vignette" cx=".5" cy=".5" r=".7"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>`;
  const baseLand = land === 'none' ? '#1d4a73' : land;
  groups.forEach((g, i) => {
    const c = g.color,
      base = g.hl.has('fill') ? c : g.hl.has('tint') ? mix(baseLand, c, 0.5) : baseLand,
      lineCol = g.hl.has('fill') ? onCol(c) : c;
    defs += `<pattern id="hatch${i}" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="9" height="9" fill="${base}"/><line x1="0" y1="0" x2="0" y2="9" stroke="${lineCol}" stroke-width="3" stroke-opacity=".85"/></pattern>
  <pattern id="dots${i}" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="${base}"/><circle cx="4" cy="4" r="2.2" fill="${lineCol}" fill-opacity=".9"/></pattern>`;
  });
  defs += fxDefs() + '</defs>';
  // the area the sheet covers, in content coordinates (larger than W x H inside a frame)
  const BGR =
    FXL.active && FXL.P
      ? [
          (FXL.P[0] - FXL.tx) / FXL.s,
          (FXL.P[1] - FXL.ty) / FXL.s,
          (FXL.P[2] - FXL.P[0]) / FXL.s,
          (FXL.P[3] - FXL.P[1]) / FXL.s,
        ]
      : [0, 0, W, H];
  const bgR = `x="${BGR[0].toFixed(1)}" y="${BGR[1].toFixed(1)}" width="${BGR[2].toFixed(1)}" height="${BGR[3].toFixed(1)}"`;
  let out = `<rect ${bgR} fill="${bg}"/>`;
  if (st === 'blueprint')
    out += `<rect ${bgR} fill="url(#grid)"/><rect x="20" y="20" width="${W - 40}" height="${H - 40}" fill="none" stroke="${bpLine}" stroke-opacity=".5"/><g font-family="'IBM Plex Mono'" font-size="9" fill="${guard ? readable([bpLine, D.colors.ink, D.colors.primary], textBgs, 4.5, 0.85) : bpLine}" fill-opacity="${guard ? 0.85 : 0.7}">${[...Array(9)].map((_, i) => `<text x="${PAD.l + (i * (W - PAD.l - PAD.r)) / 8}" y="${H - FOOT - 26}">${(8 + i * 0.6).toFixed(1)}°E</text>`).join('')}${[...Array(6)].map((_, i) => `<text x="26" y="${150 + (i * (H - 200)) / 5}" transform="rotate(-90 26 ${150 + (i * (H - 200)) / 5})">${(57.8 - i * 0.5).toFixed(1)}°N</text>`).join('')}</g>`;
  if (st === 'neon' && dark) out += `<rect ${bgR} fill="url(#vignette)"/>`;
  if (sp.bgGradient) out += `<rect ${bgR} fill="url(#midbg)"/>`;
  if (sp.stars) {
    let r = 12345;
    const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
    out += '<g pointer-events="none">';
    for (let i = 0; i < 160; i++)
      out += `<circle cx="${(BGR[0] + rnd() * BGR[2]).toFixed(0)}" cy="${(BGR[1] + rnd() * (BGR[3] - FOOT)).toFixed(0)}" r="${(0.4 + rnd() * 1.2).toFixed(1)}" fill="#fff" opacity="${(0.2 + rnd() * 0.6).toFixed(2)}"/>`;
    out += '</g>';
  }
  if (sp.concrete) out += `<rect ${bgR} fill="#fff" filter="url(#concrete)"/>`;
  if (sp.waves) out += `<rect ${bgR} fill="url(#waves)"/>`;
  const fsel = document.getElementById('frameSel').value;
  const frame = fsel === 'on' || (fsel !== 'off' && !!sp.frame);
  if (frame)
    out += `<rect x="18" y="18" width="${W - 36}" height="${H - 36}" fill="none" stroke="${ink0}" stroke-opacity=".6" stroke-width="1.5"/>`;
  const relief = reliefOn(sp);
  if (relief) out += reliefSea(sp, bg, dark);
  // with 'hide outside focus' the land outline (glow, extrusion, shadows) is only the focus
  const allPath =
    S.focusHide && S.focus
      ? GEO.units
          .filter(inFocus)
          .map((k) => kp(k, det))
          .join('')
      : landPath(det) + (GEO.xland || []).map((k) => kp(k, det)).join('');
  // neighbouring countries as grey context (country views)
  if (S.map !== 'world' && document.getElementById('showNeighbours').checked && !S.focusHide) {
    const nb = neighboursPath();
    if (nb)
      out += `<path d="${nb}" fill="${mix(bg, dark ? '#ffffff' : '#000000', dark ? 0.1 : 0.09)}" stroke="${bg}" stroke-width="0.8" pointer-events="none"/>`;
  }
  // inset box (Bornholm), drawn over the neighbours so its frame stays clean
  for (const R of insetRects()) {
    out += `<rect x="${R.x.toFixed(1)}" y="${R.y.toFixed(1)}" width="${R.w.toFixed(1)}" height="${R.h.toFixed(1)}" fill="${bg}" fill-opacity=".92" stroke="${st === 'neon' ? stroke : ink0}" stroke-opacity=".45" stroke-width="1" ${st === 'blueprint' ? 'stroke-dasharray="4 3"' : ''}/>`;
  }
  out += fxUnder(allPath, ink);
  if (sp.flag && S.map !== 'world') {
    const iso = S.country || 'DNK',
      fl = FLAGS[iso];
    const x0 = M[0] * sc + ox,
      y0 = M[1] * sc + oy,
      x1 = M[2] * sc + ox,
      y1 = M[3] * sc + oy;
    out += `<path d="${allPath}" fill="#fff" stroke="#fff" stroke-width="16" stroke-linejoin="round" filter="url(#sticker)" pointer-events="none"/><clipPath id="landclipF"><path d="${allPath}"/></clipPath><g clip-path="url(#landclipF)" pointer-events="none">${fl ? flagSVG(fl, x0, y0, x1 - x0, y1 - y0) : `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="${ds.primary}"/>`}</g>`;
  }
  if (sp.flag && S.map === 'world')
    out += `<path d="${allPath}" fill="#fff" stroke="#fff" stroke-width="3" stroke-linejoin="round" filter="url(#sticker)" pointer-events="none"/>`;
  if (sp.stone) out += '';
  if (sp.landGlow)
    out += `<path d="${allPath}" fill="none" stroke="${sp.landGlow}" stroke-width="14" filter="url(#landglow)" opacity=".5"/>`;
  if (st === 'extrude' || sp.extrude) {
    const ec = sp.extrudeColor || mix(land, '#000', 0.45);
    for (let i = 14; i > 0; i--)
      out += `<path d="${allPath}" transform="translate(${-i * 0.6},${i * 1.1})" fill="${i === 1 ? 'url(#extrSide)' : ec}" stroke="${mix(ec, '#fff', 0.12)}" stroke-width=".6"/>`;
  }
  if (st === 'glass') out += `<path d="${allPath}" fill="#000" filter="url(#longshadow)" opacity=".9"/>`;
  if (st === 'paper')
    out += `<path d="${allPath}" fill="${mix(land, bg, 0.4)}" transform="translate(5,7)" opacity=".5"/>`;
  if (st === 'neon')
    out += `<path d="${allPath}" fill="none" stroke="${stroke}" stroke-width="5" filter="url(#neonf)" opacity=".7"/>`;
  const dim = groups.some((g) => g.hl.has('dim') && g.sel.size);
  const baseFill = (k) => {
    if (sp.flag) return S.map === 'world' ? (FLAGS[k.c] ? `url(#fl_${k.c})` : mix(land, '#888888', 0.3)) : land;
    if (st === 'halftone') return 'url(#dotsBase)';
    if (st === 'blueprint') return dsc ? land : '#1d4a73';
    if (AT && !sp.patterns && !sp.text) return attrColor(AT, AT.f(k), ATC, land);
    if (st === 'shades') {
      const i = (codeNum(k.c) * 7) % 5;
      return [land, landAlt, mix(land, bg, 0.25), mix(land, bg, 0.4), mix(land, '#000', 0.12)][i];
    }
    if (st === 'regions') {
      const n = Math.max(2, Object.keys(GEO.groups).length);
      return mix(land, bg, (0.75 * REGI[k.r]) / (n - 1));
    }
    if (st === 'patchwork') {
      return PATCH[(codeNum(k.c) * 13 + (REGI[k.r] || 0)) % PATCH.length];
    }
    if (sp.patterns) {
      return 'url(' + DOODLE[(codeNum(k.c) * 7 + (REGI[k.r] || 0)) % DOODLE.length] + ')';
    }
    return land;
  };
  const swBase =
    sp.strokeW != null
      ? sp.strokeW
      : st === 'outline'
        ? 1.2
        : st === 'blueprint'
          ? 0.8
          : st === 'neon'
            ? 0.8
            : st === 'silhouette'
              ? 0
              : 0.9;
  const strokeBase = st === 'silhouette' ? 'none' : stroke;
  out += `<g id="unsel"${st === 'paper' ? ' filter="url(#paper)"' : sp.filter ? ' filter="url(#' + sp.filter + ')"' : ''}>`;
  for (const k of unsel) {
    const fo = !inFocus(k);
    if (fo && S.focusHide) continue;
    out += `<path class="k" data-c="${k.c}" d="${kp(k, det)}" fill="${baseFill(k)}" stroke="${strokeBase}" stroke-width="${swBase}" stroke-linejoin="round" ${dim || fo ? 'opacity=".3"' : ''} ${st === 'outline' || sp.pixel || (sp.flag && S.map !== 'world') ? 'fill-opacity="0"' : sp.network ? 'fill-opacity=".55"' : ''} ${sp.flag && S.map !== 'world' ? 'stroke-opacity=".45"' : ''}/>`;
  }
  out += '</g>';
  out += fxLand(allPath);
  if (relief) {
    const borders =
      strokeBase === 'none'
        ? ''
        : unsel
            .filter((k) => !(S.focusHide && !inFocus(k)))
            .map((k) => kp(k, det))
            .join('');
    out += reliefLand(sp, allPath, borders, strokeBase, swBase, land);
  }
  if (sp.network) {
    out += `<path d="${allPath}" fill="none" stroke="${net.glow}" stroke-width="5" filter="url(#landglow)" opacity=".55" pointer-events="none"/><path d="${allPath}" fill="none" stroke="${net.line}" stroke-width="1.2" pointer-events="none"/>`;
    const nodes = GEO.units
      .filter((k) => !(S.focusHide && !inFocus(k)) && !isBH(k))
      .map((k) => {
        const [x, y] = kc(k);
        return { k, x, y };
      });
    const seen = new Set();
    let ls = '';
    for (const a of nodes) {
      const nn = nodes
        .filter((b) => b !== a)
        .map((b) => [b, (a.x - b.x) ** 2 + (a.y - b.y) ** 2])
        .sort((p, q) => p[1] - q[1])
        .slice(0, 3);
      for (const [b] of nn) {
        const key = a.k.c < b.k.c ? a.k.c + '|' + b.k.c : b.k.c + '|' + a.k.c;
        if (seen.has(key)) continue;
        seen.add(key);
        ls += `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
      }
    }
    out +=
      `<path d="${ls}" stroke="${net.link}" stroke-width=".7" opacity=".5" fill="none" pointer-events="none"/><g filter="url(#neonf)" pointer-events="none">` +
      nodes
        .map((n) => {
          const gi = groupOf(n.k.c);
          return `<circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${gi >= 0 ? 4.5 : 2.2}" fill="${gi >= 0 ? S.groups[gi].color : net.node}"/>`;
        })
        .join('') +
      '</g>';
  }
  if (sp.pixel) {
    out +=
      `<g filter="url(#pxshadow)" pointer-events="none">` +
      pixelCells(det, (k) => {
        const gi = groupOf(k.c);
        if (gi >= 0) return S.groups[gi].color;
        const f = baseFill(k);
        return f.startsWith('url') ? land : f;
      }) +
      '</g>';
  }
  if (sp.extrude && st === 'stone')
    out += `<path d="${allPath}" fill="none" stroke="#ffffff" stroke-width="1.4" opacity=".55" transform="translate(-1,-1)" pointer-events="none"/>`;
  if (st === 'glass') {
    out += `<path d="${allPath}" fill="url(#glassg)" pointer-events="none" opacity=".55"/><path d="${allPath}" fill="none" stroke="#fff" stroke-width="1.2" pointer-events="none" opacity=".8"/>`;
  }
  if (st === 'silhouette')
    out += `<path d="${allPath}" fill="none" stroke="${mix(land, '#000', 0.2)}" stroke-width="1" pointer-events="none"/>`;
  // region names cross land, sea and highlights: colour chosen for all of them under the guard
  const regBgs = [
    st === 'regions' ? land : isHex(land) ? land : bg,
    st === 'regions' ? mix(land, bg, 0.75) : bg,
  ].filter(isHex);
  const regOrig = ds.dark ? ink : '#355a78';
  const regWorst = (c, op) => Math.min(...(regBgs.length ? regBgs : [bg]).map((b) => contrast(mix(c, b, 1 - op), b)));
  const regOk = !guard || regWorst(regOrig, 0.65) >= 3;
  const regCol = regOk
    ? regOrig
    : readable([regOrig, ink, '#222222', '#ffffff'], regBgs.length ? regBgs : [bg], 3, 0.9);
  const rlOrig = ds.dark ? ink : '#4a6a85';
  const rlCol =
    !guard || regWorst(rlOrig, 0.8) >= 2 ? rlOrig : readable([rlOrig, ink, '#222222', '#ffffff'], regBgs, 2, 0.8);
  const rlCasing = guard && regWorst(rlCol, 0.8) < 2;
  if (sp.regionLines) {
    const rl = cache['rl' + det] || (cache['rl' + det] = pathLines(det ? GEO.rlines.d : GEO.rlines.s));
    out += `<path d="${rl}" fill="none" stroke="${ink}" stroke-width="1.4" stroke-dasharray="6 3" pointer-events="none" opacity=".7"/>`;
  }
  if (sp.dotted) {
    const rl = cache['rl' + det] || (cache['rl' + det] = pathLines(det ? GEO.rlines.d : GEO.rlines.s));
    out += `<path d="${rl}" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="1 3" pointer-events="none"/>`;
  }
  if (sp.text) {
    out += '<g pointer-events="none">';
    GEO.units.forEach((k, i) => {
      if (selAll.has(k.c)) return;
      const cs = [
        P(k.b[0], k.b[1], insOf(k)),
        P(k.b[2], k.b[3], insOf(k)),
        P(k.b[0], k.b[3], insOf(k)),
        P(k.b[2], k.b[1], insOf(k)),
      ];
      const x0 = Math.min(...cs.map((c) => c[0])),
        x1 = Math.max(...cs.map((c) => c[0])),
        y0 = Math.min(...cs.map((c) => c[1])),
        y1 = Math.max(...cs.map((c) => c[1]));
      const bw = x1 - x0,
        bh = y1 - y0;
      const n = nm(k).toUpperCase();
      out += `<clipPath id="ck${k.c}"><path d="${kp(k, det)}"/></clipPath><g clip-path="url(#ck${k.c})">`;
      if (sp.text === 'typo') {
        const fs = Math.max(6, Math.min(bh * 0.95, (bw * 1.6) / n.length));
        out += `<text x="${(x0 + bw / 2).toFixed(1)}" y="${(y0 + bh / 2 + fs * 0.36).toFixed(1)}" text-anchor="middle" font-family="'${ds.head}'" font-weight="700" font-size="${fs.toFixed(1)}" textLength="${(bw * 0.96).toFixed(1)}" lengthAdjust="spacingAndGlyphs" fill="${sp.textColor}">${esc(n)}</text>`;
      } else {
        const fs = Math.max(5, Math.min((bw * 1.5) / n.length, bh * 0.6, 18));
        const rows = Math.max(1, Math.ceil(bh / (fs * 0.95)));
        for (let r = 0; r < rows; r++) {
          const col = sp.wordColors[(i + r) % sp.wordColors.length];
          out += `<text x="${(x0 + bw / 2).toFixed(1)}" y="${(y0 + fs * 0.85 + r * fs * 0.95).toFixed(1)}" text-anchor="middle" font-family="'${ds.head}'" font-weight="700" font-size="${fs.toFixed(1)}" textLength="${(bw * 0.98).toFixed(1)}" lengthAdjust="spacingAndGlyphs" fill="${col}">${esc(n)}</text>`;
        }
      }
      out += '</g>';
    });
    out += '</g>';
  }
  if (sp.cityDots) {
    out += '<g pointer-events="none">';
    for (const k of unsel) {
      if (k.a < TH.h && !isBH(k)) continue;
      const [x, y] = kc(k);
      out += `<circle cx="${x.toFixed(1)}" cy="${(y + 8).toFixed(1)}" r="3.2" fill="#fff" stroke="${land}" stroke-width="1"/>`;
    }
    out += '</g>';
  }
  if (sp.sea) {
    const sea = (GEO.sea || []).map((x) => [...worldPt(x[0] + 180, 90 - x[1]), t(x[2]).toUpperCase()]);
    out += `<g pointer-events="none" font-family="'${ds.body}'" font-size="10" letter-spacing="3" fill="${ink}" opacity="${tOp(0.7)}" ${guard && isHex(bg) ? `stroke="${bg}" stroke-opacity=".85" stroke-width="3" paint-order="stroke"` : ''} ${sp.seaItalic ? 'font-style="italic"' : ''}>`;
    for (const [fx, fy, t] of sea)
      out += `<text x="${fx.toFixed(0)}" y="${fy.toFixed(0)}" text-anchor="middle">${t}</text>`;
    out += '</g>';
  }
  if (st === 'atlas' || st === 'regions') {
    const rl = cache['rl' + det] || (cache['rl' + det] = pathLines(det ? GEO.rlines.d : GEO.rlines.s));
    if (rlCasing)
      out += `<path d="${rl}" fill="none" stroke="${light(rlCol) ? '#000000' : '#ffffff'}" stroke-opacity=".45" stroke-width="2.6" pointer-events="none"/>`;
    out += `<path d="${rl}" fill="none" stroke="${rlCol}" stroke-width="1.2" stroke-dasharray="5 3" pointer-events="none" opacity=".8"/>`;
    out += `<g pointer-events="none" font-family="'${ds.body}'" font-size="9" letter-spacing="2" font-weight="600" opacity="${regOk ? 0.65 : 0.9}" fill="${regCol}" ${!regOk ? `stroke="${light(regCol) ? '#000000' : '#ffffff'}" stroke-opacity=".6" stroke-width="2.4" paint-order="stroke"` : ''}>`;
    for (const r in REGC) {
      if (S.focus) break;
      const [x, y] = P(REGC[r][0], REGC[r][1]);
      out += `<text x="${x.toFixed(0)}" y="${(y + 3).toFixed(0)}" text-anchor="middle">${GEO.groups[r].toUpperCase()}</text>`;
    }
    if (st === 'atlas') {
      const sea = (GEO.sea || []).map((x) => [...worldPt(x[0] + 180, 90 - x[1]), t(x[2]).toUpperCase()]);
      for (const [fx, fy, t] of sea)
        out += `<text x="${fx.toFixed(0)}" y="${fy.toFixed(0)}" text-anchor="middle" font-style="italic" font-weight="400" letter-spacing="3">${t}</text>`;
    }
    out += '</g>';
  }
  // the colour a unit shows when not highlighted: its fill, pattern base, or the page when land is see-through
  const unitBase = (k) => {
    if (st === 'outline' || sp.pixel) return bg;
    if (st === 'halftone') return mix(bg, land, 0.35);
    const f = baseFill(k);
    if (isHex(f)) return f;
    if (sp.patterns) return '#ffffff';
    return isHex(baseLand) ? baseLand : bg;
  };
  // highlight groups (drawn in order; later groups on top)
  groups.forEach((g, gi) => {
    const col = g.color,
      hl = g.hl;
    out += `<g id="g${gi}">`;
    for (const c of g.sel) {
      const k = GEO.units.find((k) => k.c === c);
      if (!k) continue;
      let fill = hl.has('fill')
        ? col
        : hl.has('tint')
          ? mix(
              baseFill(k) === 'url(#dotsBase)' ? baseLand : baseFill(k).startsWith('url') ? baseLand : baseFill(k),
              col,
              0.5,
            )
          : baseFill(k);
      if (hl.has('hatch')) fill = `url(#hatch${gi})`;
      else if (hl.has('dots')) fill = `url(#dots${gi})`;
      let strk = strokeBase,
        sw = swBase;
      if (hl.has('outline')) {
        strk = hl.has('fill') && !hl.has('hatch') && !hl.has('dots') ? onCol(col) : col;
        sw = 3.2;
      } else if (guard && hl.has('fill') && contrast(col, unitBase(k)) < 1.4) {
        // stands out from the fill and from the ordinary borders
        strk = readable([ds.accent, D.colors.accent2, onCol(col)], isHex(strokeBase) ? [col, strokeBase] : [col], 2);
        sw = Math.max(swBase + 1.4, 2.4);
      }
      const tr = hl.has('emboss') ? 'transform="translate(0,-6)"' : '';
      const f = hl.has('emboss') ? 'filter="url(#emboss)"' : '';
      const fillAttr = sp.pixel
        ? 'fill-opacity="0"'
        : st === 'outline' && !hl.has('fill') && !hl.has('hatch') && !hl.has('dots') && !hl.has('tint')
          ? 'fill-opacity="0"'
          : '';
      out += `<g ${tr}>${hl.has('glow') ? `<path d="${kp(k, det)}" fill="${col}" stroke="${col}" stroke-width="6" filter="url(#glow)" opacity=".85" pointer-events="none"/>` : ''}<path class="k" data-c="${k.c}" d="${kp(k, det)}" fill="${fill}" ${fillAttr} stroke="${strk}" stroke-width="${sw}" stroke-linejoin="round" ${f}/></g>`;
    }
    out += '</g>';
  });
  out += fxMap(allPath);
  // major cities (country views, or focused units in the world view)
  const CL =
    S.map !== 'world'
      ? citiesToDraw()
      : S.focus && GEO.cities
        ? (focusUnits() || []).flatMap((u) => (GEO.cities[u.c] || []).filter((c) => !GEO.groups[S.focus] || c.cap))
        : [];
  const cityBoxes = [];
  const boxHit = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
  if (CL.length && document.getElementById('showCities').checked) {
    out += '<g pointer-events="none">';
    for (const u of [0]) {
      // every dot first, so no label covers a city that is drawn later
      for (const c of CL) {
        const [dx, dy0] = S.map === 'world' ? P(c.x, c.y) : cityPt(c);
        cityBoxes.push([dx - 5, dy0 - 5, dx + 5, dy0 + 5]);
      }
      for (const c of CL) {
        const [x, y] = S.map === 'world' ? P(c.x, c.y) : cityPt(c);
        const big = c.cap || c.pop > (S.map === 'dk' ? 2e5 : 2e6);
        const fs = big ? 12 : 10,
          tw = c.n.length * fs * 0.56;
        // right of the dot, or left when that would collide with a label already placed
        let box = [x + 6, y - fs * 0.8, x + 7 + tw, y + fs * 0.35],
          left = false;
        let dy = 0;
        if (cityBoxes.some((b) => boxHit(b, box))) {
          // left, then above, then below; a lesser city that fits nowhere keeps only its dot
          const opts = [
            [[x - 7 - tw, box[1], x - 6, box[3]], true, 0],
            [[x - tw / 2, y - fs * 1.9, x + tw / 2, y - fs * 0.75], 'mid', -fs * 1.05],
            [[x - tw / 2, y + fs * 0.5, x + tw / 2, y + fs * 1.65], 'mid', fs * 1.3],
          ];
          const fit = opts.find(([bx]) => !cityBoxes.some((b) => boxHit(b, bx)));
          if (fit) [box, left, dy] = fit;
          else if (!c.cap) left = 'skip';
        }
        cityBoxes.push([x - 5, y - 5, x + 5, y + 5]);
        if (left !== 'skip') cityBoxes.push(box);
        const tx = left === 'mid' ? x : left ? x - 7 : x + 7,
          anchor = left === 'mid' ? 'middle' : left ? 'end' : 'start';
        out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${big ? 4.5 : 3}" fill="${c.cap ? ds.accent : '#ffffff'}" stroke="${ink}" stroke-width="1.2"/>`;
        if (left !== 'skip')
          out += `<text x="${tx.toFixed(1)}" y="${(y + 4 + dy).toFixed(1)}" text-anchor="${anchor}" font-family="'${ds.body}'" font-size="${fs}" font-weight="${c.cap ? 700 : 500}" fill="${ink}" stroke="${bg}" stroke-width="3" paint-order="stroke">${esc(c.n)}</text>`;
      }
    }
    out += '</g>';
  }
  let labelFill = sp.labelColor || (st === 'outline' || st === 'halftone' ? ink : light(land) ? '#222' : '#fff');
  const labelBg = sp.patterns
    ? '#ffffff'
    : st === 'blueprint' && !dsc
      ? '#1d4a73'
      : sp.network
        ? mix(land, bg, 0.45)
        : st === 'outline' || !isHex(land)
          ? bg
          : st === 'halftone'
            ? [bg, mix(bg, land, 0.35)]
            : st === 'glass' || st === 'slate'
              ? [land, mix(land, '#ffffff', 0.45)]
              : st === 'regions'
                ? [land, mix(land, bg, 0.75)]
                : land;
  if (guard) labelFill = readable([labelFill, '#222222', '#ffffff'], labelBg, 3, 0.9);
  // what a unit label can sit on, besides its own fill: other style fills, the page, highlights, outlines
  const labelOn = [...(Array.isArray(labelBg) ? labelBg : [labelBg])];
  if (st === 'shades') labelOn.push(landAlt, mix(land, bg, 0.25), mix(land, bg, 0.4), mix(land, '#000', 0.12));
  if (st === 'patchwork') labelOn.push(...PATCH);
  if (st === 'regions') labelOn.push(mix(land, bg, 0.75));
  if (isHex(bg)) labelOn.push(bg);
  for (const g of groups)
    if (g.sel.size && (g.hl.has('fill') || g.hl.has('outline'))) {
      labelOn.push(g.color);
      if (g.hl.has('outline') || contrast(g.color, isHex(land) ? land : bg) < 1.4) labelOn.push(onCol(g.color));
    }
  const labelWorst = Math.min(...labelOn.filter(isHex).map((b) => contrast(mix(labelFill, b, 0.1), b)));
  const labelHalo =
    guard && (sp.flag || sp.patterns || sp.network || !!AT || reliefOn(sp) || st === 'blueprint' || labelWorst < 3)
      ? `stroke="${light(labelFill) ? '#000000' : '#ffffff'}" stroke-opacity=".7" stroke-width="2.4" paint-order="stroke"`
      : '';
  // navne, pins, labels, callouts
  const lf = ds.body;
  out += '<g pointer-events="none">';
  if (all || sp.labels)
    for (const k of unsel) {
      if (S.focusHide && !inFocus(k)) continue;
      const [x, y] = kc(k);
      if (k.a < (sp.labels ? TH.h : TH.l) && !isBH(k)) continue;
      const caps = sp.labels === 'caps';
      // a unit label gives way to a city label it would run into
      const lfs = caps ? (k.a > TH.big ? 7.5 : 6.5) : k.a > TH.big ? 8 : 6.5,
        lw = nm(k).length * lfs * 0.6;
      if (cityBoxes.some((b) => boxHit(b, [x - lw / 2, y - lfs, x + lw / 2, y + 2]))) continue;
      out += `<text x="${x.toFixed(0)}" y="${(y - (sp.cityDots ? 2 : 0)).toFixed(0)}" font-family="'${lf}'" font-size="${caps ? (k.a > TH.big ? 7.5 : 6.5) : k.a > TH.big ? 8 : 6.5}" ${caps ? 'letter-spacing="1.2"' : 'font-weight="700"'} text-anchor="middle" fill="${labelFill}" ${labelHalo} opacity=".9">${esc(caps ? nm(k).toUpperCase() : nm(k))}</text>`;
    }
  const margin = { l: [], r: [] };
  groups.forEach((g) => {
    const col = g.color,
      hl = g.hl;
    for (const c of g.sel) {
      const k = GEO.units.find((k) => k.c === c);
      if (!k) continue;
      const [x, y] = kc(k);
      if (hl.has('pin'))
        out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="none" stroke="${col}" stroke-width="2.5" class="pulse"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${col}" stroke="${onCol(col)}" stroke-width="1.6"/>`;
      if (hl.has('label') && !hl.has('callout')) {
        const w = nm(k).length * 6.6 + 16;
        out += `<g transform="translate(${x.toFixed(1)},${(y - (hl.has('pin') ? 16 : 0)).toFixed(1)})"><rect x="${-w / 2}" y="-20" width="${w}" height="18" rx="4" fill="${dark ? col : ds.primary}"/><text y="-7" text-anchor="middle" font-family="'${lf}'" font-weight="700" font-size="10.5" fill="${dark ? onCol(col) : onCol(ds.primary)}">${esc(nm(k))}</text></g>`;
      }
      if (hl.has('callout')) (x < W / 2 ? margin.l : margin.r).push({ k, x, y, col });
    }
  });
  for (const side of ['l', 'r']) {
    const arr = margin[side].sort((a, b) => a.y - b.y);
    const n = arr.length;
    if (!n) continue;
    const avail = H - FOOT - 260;
    const step = Math.min(70, avail / n);
    const y0 = (H - FOOT - step * (n - 1)) / 2 + 40;
    arr.forEach((o, i) => {
      const lab = y0 + i * step;
      const lx = side === 'l' ? PAD.l - 18 : W - PAD.r + 18;
      const tx = side === 'l' ? 24 : W - 24;
      const ln = `M${o.x.toFixed(1)} ${o.y.toFixed(1)}L${lx} ${lab.toFixed(1)}`;
      const lc = o.col.toLowerCase() === land.toLowerCase() ? onCol(land) : o.col;
      out += `<path d="${ln}" fill="none" stroke="${bg}" stroke-width="4" stroke-linecap="round" opacity=".7"/><path d="${ln}" fill="none" stroke="${lc}" stroke-width="1.6" stroke-linecap="round"/><circle cx="${o.x.toFixed(1)}" cy="${o.y.toFixed(1)}" r="4" fill="${lc}" stroke="${bg}" stroke-width="1.5"/><text x="${tx}" y="${(lab - 4).toFixed(1)}" text-anchor="${side === 'l' ? 'start' : 'end'}" font-family="'${ds.head}'" font-weight="700" font-size="15" fill="${ink}">${esc(nm(o.k))}</text><text x="${tx}" y="${(lab + 10).toFixed(1)}" text-anchor="${side === 'l' ? 'start' : 'end'}" font-family="'${lf}'" font-size="9" letter-spacing="1.5" fill="${ink}" opacity=".7">${GEO.groups[o.k.r].toUpperCase()}</text>`;
    });
  }
  // signaturforklaring
  // Title/subtitle text and positions (computed before the legend, which moves up to make room).
  // Positions: t/b (top/bottom) + l/c/r. Title "auto" follows the map style; subtitle "under" sits below the title.
  if (document.getElementById('autoText').checked) {
    const a = autoText();
    document.getElementById('title').value = a.title;
    document.getElementById('sub').value = a.sub;
  }
  const title = document.getElementById('title').value,
    sub = document.getElementById('sub').value;
  const showText = document.getElementById('showText').checked;
  let hcol = sp.bg ? sp.heading || ink0 : dark ? ds.headingOnDark : ds.heading;
  if (guard) hcol = readable([hcol, ds.heading, ds.headingOnDark, ds.accent, ds.primary, ink0, ink], textBgs, 3);
  const ts = Math.round(W * 0.038);
  let tp = document.getElementById('titlePos').value;
  if (tp === 'auto') tp = 't' + (sp.titleAlign || 'left')[0];
  let sPos = document.getElementById('subPos').value;
  if (sPos === tp || !title) sPos = 'under';
  const hx = (h) => (h === 'c' ? W / 2 : h === 'r' ? W - PAD.l + 12 : PAD.l - 12);
  const anc = (h) => (h === 'c' ? 'middle' : h === 'r' ? 'end' : 'start');
  const top = Math.round(ts * 2),
    bot = H - FOOT - Math.round(H * 0.035);
  const ty = tp[0] === 't' ? top : sPos === 'under' && sub ? bot - 24 : bot;
  const textTop = {}; // top edge of bottom-placed text per side
  if (showText) {
    if (title && tp[0] === 'b') textTop[tp[1]] = ty - ts * 0.8;
    if (sub && sPos !== 'under' && sPos[0] === 'b') textTop[sPos[1]] = Math.min(textTop[sPos[1]] ?? H, bot - 14);
  }
  if (document.getElementById('legend').checked) {
    const items = [];
    const gs = groups.filter((g) => g.sel.size);
    if (gs.length > 1 || (gs.length === 1 && gs[0].name))
      gs.forEach((g) => {
        const sw = g.hl.has('hatch')
          ? `url(#hatch${groups.indexOf(g)})`
          : g.hl.has('dots')
            ? `url(#dots${groups.indexOf(g)})`
            : g.hl.has('fill')
              ? g.color
              : g.hl.has('tint')
                ? mix(baseLand, g.color, 0.5)
                : baseLand;
        items.push({
          sw,
          stroke: g.hl.has('outline') && !g.hl.has('fill') ? g.color : ink,
          sw2: g.hl.has('outline') ? 2 : 0.6,
          label: g.name + ' (' + g.sel.size + ')',
        });
      });
    if (AT && !sp.patterns && !sp.text) {
      items.push({ head: true, label: t(AT.n) });
      ATC.forEach((v) => items.push({ sw: attrColor(AT, v, ATC, land), stroke: ink, sw2: 0.4, label: v }));
      const src = attrSource(AT);
      if (src) items.push({ src: true, label: src });
    }
    if (relief) items.push(...reliefLegend(sp));
    if (items.length) {
      const side = margin.l.length ? (margin.r.length ? 'c' : 'r') : 'l';
      let y = H - FOOT - (frame && !FOOT ? 34 : 14) - items.length * 18;
      if (textTop[side] != null) y -= Math.max(0, H - FOOT - 2 - textTop[side]);
      const lw = Math.max(...items.map((o) => o.label.length * (o.src ? 5.2 : 6.2))) + 50;
      const x = side === 'c' ? (W - lw) / 2 : side === 'r' ? W - PAD.r + 20 - lw : PAD.l - 20;
      out += `<rect x="${x - 8}" y="${y - 8}" width="${lw}" height="${items.length * 18 + 12}" rx="6" fill="${bg}" fill-opacity=".85"/>`;
      items.forEach((o) => {
        if (o.head)
          out += `<text x="${x}" y="${y + 11}" font-family="'${lf}'" font-size="11" font-weight="700" fill="${ink}">${esc(o.label)}</text>`;
        else if (o.src)
          out += `<text x="${x}" y="${y + 10}" font-family="'${lf}'" font-size="9" fill="${ink}" opacity="${tOp(0.65)}">${esc(o.label)}</text>`;
        else
          out += `<rect x="${x}" y="${y}" width="14" height="14" rx="2" fill="${o.sw}" stroke="${o.stroke}" stroke-width="${o.sw2}"/><text x="${x + 20}" y="${y + 11}" font-family="'${lf}'" font-size="11" fill="${ink}">${esc(o.label)}</text>`;
        y += 18;
      });
    }
  }
  out += '</g>';
  out += '<g pointer-events="none">';
  if (showText) {
    const t = sp.titleCaps ? title.toUpperCase() : title;
    const ls = sp.titleCaps ? 8 : -1;
    if (title)
      out += `<text x="${hx(tp[1])}" y="${ty}" text-anchor="${anc(tp[1])}" font-family="'${ds.head}'" font-weight="700" font-size="${ts}" letter-spacing="${ls}" fill="${hcol}" ${guard && isHex(bg) && (S.focus || S.zoom.k > 1.2) ? `stroke="${bg}" stroke-opacity=".85" stroke-width="6" paint-order="stroke"` : ''}>${esc(t)}</text>`;
    if (sub) {
      const sh = sPos === 'under' ? tp[1] : sPos[1];
      const sy = sPos === 'under' ? ty + 24 : sPos[0] === 't' ? top : bot;
      out += `<text x="${hx(sh) + (sh === 'l' ? 2 : 0)}" y="${sy}" text-anchor="${anc(sh)}" font-family="'${lf}'" font-weight="600" font-size="14" letter-spacing="${sp.titleCaps ? 3 : 0}" fill="${ink}" opacity=".9" ${guard && isHex(bg) ? `stroke="${bg}" stroke-opacity=".85" stroke-width="3" paint-order="stroke"` : ''}>${esc(sp.titleCaps ? sub.toUpperCase() : sub)}</text>`;
    }
  }
  if (document.getElementById('showLogo').checked) {
    const L = D.company.logo;
    if (L.src) {
      const lw = Math.min(L.width || 220, W * 0.26),
        lh = lw / (L.aspect || 4);
      const uniformDark =
        dark &&
        (bg.toLowerCase() === (L.boxColor || '').toLowerCase() || st === 'neon' || st === 'blueprint' || ds.dark);
      const box =
        L.box === 'always' ||
        (L.box === 'auto' && !uniformDark) ||
        // a box-less logo (white lettering on dark profiles) gets its box back where the page is too light for it
        (guard &&
          L.box === 'auto' &&
          ds.dark &&
          textBgs
            .filter(isHex)
            .some((b) => contrast('#ffffff', b) < 4.5 || contrast(ds.headingOnDark || ds.accent, b) < 3));
      if (!box)
        out += `<image href="${L.src}" x="${W - PAD.l + 12 - lw}" y="46" width="${lw}" height="${lh.toFixed(1)}"/>`;
      else
        out += `<rect x="${W - PAD.l + 12 - lw - 22}" y="38" width="${lw + 44}" height="${(lh + 30).toFixed(1)}" fill="${L.boxColor}"/><image href="${L.src}" x="${W - PAD.l + 12 - lw}" y="53" width="${lw}" height="${lh.toFixed(1)}"/>`;
    } else {
      const txt = loc(L.text) || loc(D.company.name);
      if (txt)
        out += `<text x="${W - PAD.l + 12}" y="72" text-anchor="end" font-family="'${ds.head}'" font-weight="700" font-size="20" fill="${ink}">${esc(txt)}</text><text x="${W - PAD.l + 12}" y="90" text-anchor="end" font-family="'${lf}'" font-size="10" letter-spacing="2" fill="${ink}" opacity=".7">${esc(loc(L.sub))}</text>`;
    }
  }
  out += '</g>';
  // footer with partner logos
  window._links = [];
  if (FOOT) {
    const fy = H - FOOT;
    const label = document.getElementById('footerLabel').value;
    const dv = D.footer.divider;
    let dcol = dv.color || ds.primary;
    // the brand divider keeps its colour unless it would disappear on this background
    const dop = dv.opacity != null ? dv.opacity : 1;
    const dvis = (c) => Math.min(...textBgs.filter(isHex).map((b) => contrast(mix(c, b, 1 - dop), b)));
    if (guard && dvis(dcol) < 2) dcol = readable([dcol, ds.accent, ds.primary, ink0, ink], textBgs, 3, dop);
    const dw = dv.width <= 1 ? (W - 2 * (PAD.l - 12)) * dv.width : dv.width;
    const dx = dv.align === 'center' ? (W - dw) / 2 : dv.align === 'right' ? W - PAD.l + 12 - dw : PAD.l - 12;
    out += '<g pointer-events="none">';
    if (dv.style === 'bar')
      out += `<rect x="${dx.toFixed(1)}" y="${(fy - dv.height / 2).toFixed(1)}" width="${dw.toFixed(1)}" height="${dv.height}" rx="${dv.height / 2}" fill="${dcol}" fill-opacity="${dv.opacity}"/>`;
    else if (dv.style === 'line')
      out += `<line x1="${dx.toFixed(1)}" y1="${fy}" x2="${(dx + dw).toFixed(1)}" y2="${fy}" stroke="${dcol}" stroke-opacity="${dv.opacity}" stroke-width="1"/>`;
    let x = PAD.l - 12;
    const lh = FOOT * 0.5,
      gap = Math.round(W * 0.03);
    const ty = fy + FOOT / 2;
    if (label) {
      out += `<text x="${x}" y="${(ty + 4).toFixed(1)}" font-family="'${lf}'" font-size="11" letter-spacing="1" fill="${ink}" opacity="${tOp(0.75)}">${esc(label.toUpperCase())}</text>`;
      x += label.length * 7.2 + gap;
    }
    for (const p of S.partners) {
      if (p.logo && p.logo.src) {
        const a = p.logo.aspect || 2,
          lw = Math.min(lh * a, W * 0.2);
        const bx = x,
          by = ty - lh / 2;
        out += `<rect x="${bx - 6}" y="${by - 6}" width="${lw + 12}" height="${lh + 12}" rx="4" fill="#ffffff" fill-opacity="${dark || !nearWhite(bg) ? 0.92 : 0}"/><image href="${p.logo.src}" x="${bx}" y="${by.toFixed(1)}" width="${lw.toFixed(1)}" height="${lh.toFixed(1)}" preserveAspectRatio="xMidYMid meet"/>`;
        if (p.link) window._links.push({ x: bx, y: by, w: lw, h: lh, url: p.link });
        x += lw + gap;
      } else if (p.name) {
        out += `<text x="${x}" y="${(ty + 4).toFixed(1)}" font-family="'${ds.head}'" font-weight="700" font-size="13" fill="${ink}">${esc(p.name)}</text>`;
        if (p.link) window._links.push({ x, y: ty - 10, w: p.name.length * 8, h: 20, url: p.link });
        x += p.name.length * 8 + gap;
      }
    }
    out += '</g>';
  }
  out += fxContentTop(ink, ds.accent);
  if (target) {
    target.setAttribute('viewBox', `0 0 ${W} ${H}`);
    target.innerHTML = defs + fxWrap(out, bg, ink, ds.accent);
    window._links = links;
    return;
  }
  document.getElementById('svg').innerHTML = defs + fxWrap(out, bg, ink, ds.accent);
  const wrap = document.getElementById('wrap');
  wrap.style.background = FXL.active ? S.fx.surface : bg;
  wrap.style.setProperty('--hl', (groups[S.active] || groups[0] || { color: ds.accent }).color);
  document.getElementById('textInfo').textContent = !document.getElementById('showText').checked
    ? t('off')
    : document.getElementById('autoText').checked
      ? t('text_auto')
      : t('text_custom');
  document.getElementById('count').textContent = t('count').replace('{n}', selAll.size).replace('{g}', groups.length);
  afterRender();
}

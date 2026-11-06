function render() {
  setLayout(S.layout);
  const D = DS[S.ds],
    st = S.style,
    det = document.getElementById('detail').checked,
    all = document.getElementById('labels').checked;
  const ds = Object.assign({ head: D.fonts.heading, body: D.fonts.body }, D.colors);
  const sp = SP[st] || {};
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
  const groups = S.groups;
  const selAll = new Set(groups.flatMap((g) => [...g.sel]));
  const AT = attrDef();
  const ATC = AT ? attrCats(AT) : [];
  const unsel = GEO.units.filter((k) => !selAll.has(k.c));
  const onCol = (c) => (light(c) ? '#1b1b1b' : '#ffffff');
  let defs = `<defs>
  <filter id="glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="6" result="b1"/><feGaussianBlur stdDeviation="14" result="b2"/><feMerge><feMergeNode in="b2"/><feMergeNode in="b1"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="emboss" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="7" stdDeviation="5" flood-color="#000" flood-opacity="${dark ? 0.7 : 0.4}"/><feDropShadow dx="-1" dy="-1" stdDeviation="0.6" flood-color="#fff" flood-opacity="0.5"/></filter>
  <filter id="paper" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="2" dy="4" stdDeviation="3" flood-color="#000" flood-opacity="0.22"/></filter>
  <filter id="neonf" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="longshadow" x="-50%" y="-50%" width="250%" height="250%">${[...Array(14)].map((_, i) => `<feOffset in="SourceAlpha" dx="${(i + 1) * 3}" dy="${(i + 1) * 3}" result="o${i}"/>`).join('')}<feMerge>${[...Array(14)].map((_, i) => `<feMergeNode in="o${i}"/>`).join('')}</feMerge><feColorMatrix type="matrix" values="0 0 0 0 0.1 0 0 0 0 0.2 0 0 0 0 0.3 0 0 0 0.35 0"/><feGaussianBlur stdDeviation="2"/></filter>
  <pattern id="dotsBase" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="${bg}"/><circle cx="3.5" cy="3.5" r="2.3" fill="${land === 'none' ? stroke : land}"/></pattern>
  <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="#9fd3ff" stroke-opacity=".25" stroke-width=".7"/><path d="M10 0V50M20 0V50M30 0V50M40 0V50M0 10H50M0 20H50M0 30H50M0 40H50" stroke="#9fd3ff" stroke-opacity=".1" stroke-width=".4"/></pattern>
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
  <filter id="landglow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10"/></filter>
  <filter id="stonef" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" seed="11" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0.3  0 0 0 0 0.3  0 0 0 0 0.28  0 0 0 0.35 0" result="w"/><feComposite in="w" in2="SourceGraphic" operator="in" result="t"/><feBlend in="t" in2="SourceGraphic" mode="multiply"/></filter>
  <filter id="concrete" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" seed="4" result="n"/><feColorMatrix in="n" type="saturate" values="0" result="g"/><feComponentTransfer in="g"><feFuncA type="linear" slope="0" intercept="0.22"/></feComponentTransfer></filter>
  <filter id="sticker" x="-10%" y="-10%" width="120%" height="125%"><feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="#000" flood-opacity="0.25"/></filter>
  <filter id="pxshadow" x="-5%" y="-5%" width="115%" height="115%"><feDropShadow dx="2" dy="3" stdDeviation="1.5" flood-color="#000" flood-opacity="0.3"/></filter>
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
  defs += '</defs>';
  let out = `<rect width="${W}" height="${H}" fill="${bg}"/>`;
  if (st === 'blueprint')
    out += `<rect width="${W}" height="${H}" fill="url(#grid)"/><rect x="20" y="20" width="${W - 40}" height="${H - 40}" fill="none" stroke="#9fd3ff" stroke-opacity=".5"/><g font-family="'IBM Plex Mono'" font-size="9" fill="#9fd3ff" fill-opacity=".7">${[...Array(9)].map((_, i) => `<text x="${PAD.l + (i * (W - PAD.l - PAD.r)) / 8}" y="${H - FOOT - 26}">${(8 + i * 0.6).toFixed(1)}°E</text>`).join('')}${[...Array(6)].map((_, i) => `<text x="26" y="${150 + (i * (H - 200)) / 5}" transform="rotate(-90 26 ${150 + (i * (H - 200)) / 5})">${(57.8 - i * 0.5).toFixed(1)}°N</text>`).join('')}</g>`;
  if (st === 'neon') out += `<rect width="${W}" height="${H}" fill="url(#vignette)"/>`;
  if (sp.bgGradient) out += `<rect width="${W}" height="${H}" fill="url(#midbg)"/>`;
  if (sp.stars) {
    let r = 12345;
    const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
    out += '<g pointer-events="none">';
    for (let i = 0; i < 160; i++)
      out += `<circle cx="${(rnd() * W).toFixed(0)}" cy="${(rnd() * (H - FOOT)).toFixed(0)}" r="${(0.4 + rnd() * 1.2).toFixed(1)}" fill="#fff" opacity="${(0.2 + rnd() * 0.6).toFixed(2)}"/>`;
    out += '</g>';
  }
  if (sp.concrete) out += `<rect width="${W}" height="${H}" fill="#fff" filter="url(#concrete)"/>`;
  if (sp.waves) out += `<rect width="${W}" height="${H}" fill="url(#waves)"/>`;
  if (sp.frame)
    out += `<rect x="18" y="18" width="${W - 36}" height="${H - 36}" fill="none" stroke="${ink}" stroke-opacity=".6" stroke-width="1.5"/>`;
  if (sp.sea) {
    const sea = S.focus ? [] : (GEO.sea || []).map((x) => [x[0], x[1], t(x[2]).toUpperCase()]);
    out += `<g pointer-events="none" font-family="'${ds.body}'" font-size="10" letter-spacing="3" fill="${ink}" opacity=".7" ${sp.seaItalic ? 'font-style="italic"' : ''}>`;
    for (const [fx, fy, t] of sea)
      out += `<text x="${(fx * W).toFixed(0)}" y="${(fy * (H - FOOT)).toFixed(0)}" text-anchor="middle">${t}</text>`;
    out += '</g>';
  }
  const allPath = landPath(det) + (I ? kp(GEO.units.find(isBH), det) : '');
  // neighbouring countries as grey context (country views)
  if (S.map !== 'world' && document.getElementById('showNeighbours').checked && !S.focusHide) {
    const nb = neighboursPath();
    if (nb)
      out += `<path d="${nb}" fill="${mix(bg, dark ? '#ffffff' : '#000000', dark ? 0.1 : 0.09)}" stroke="${bg}" stroke-width="0.8" pointer-events="none"/>`;
  }
  // inset box (Bornholm), drawn over the neighbours so its frame stays clean
  if (I) {
    const R = bhRect();
    out += `<rect x="${R.x.toFixed(1)}" y="${R.y.toFixed(1)}" width="${R.w.toFixed(1)}" height="${R.h.toFixed(1)}" fill="${bg}" fill-opacity=".92" stroke="${st === 'neon' ? stroke : ink}" stroke-opacity=".45" stroke-width="1" ${st === 'blueprint' ? 'stroke-dasharray="4 3"' : ''}/>`;
  }
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
    if (st === 'blueprint') return '#1d4a73';
    if (AT && !sp.patterns && !sp.text) return attrColor(AT, Math.max(0, ATC.indexOf(AT.f(k))), ATC.length, land);
    if (st === 'shades') {
      const i = (parseInt(k.c) * 7) % 5;
      return [land, landAlt, mix(land, bg, 0.25), mix(land, bg, 0.4), mix(land, '#000', 0.12)][i];
    }
    if (st === 'regions') {
      const n = Math.max(2, Object.keys(GEO.groups).length);
      return mix(land, bg, (0.75 * REGI[k.r]) / (n - 1));
    }
    if (st === 'patchwork') {
      return PATCH[(parseInt(k.c) * 13 + REGI[k.r]) % PATCH.length];
    }
    if (sp.patterns) {
      return 'url(' + DOODLE[(parseInt(k.c) * 7 + REGI[k.r]) % DOODLE.length] + ')';
    }
    if (st === 'topo') {
      return (parseInt(k.c) * 7) % 3 ? land : landAlt;
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
  if (sp.network) {
    out += `<path d="${allPath}" fill="none" stroke="#7cc4ff" stroke-width="5" filter="url(#landglow)" opacity=".55" pointer-events="none"/><path d="${allPath}" fill="none" stroke="#9fd6ff" stroke-width="1.2" pointer-events="none"/>`;
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
      `<path d="${ls}" stroke="#8fd0ff" stroke-width=".7" opacity=".5" fill="none" pointer-events="none"/><g filter="url(#neonf)" pointer-events="none">` +
      nodes
        .map((n) => {
          const gi = groupOf(n.k.c);
          return `<circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${gi >= 0 ? 4.5 : 2.2}" fill="${gi >= 0 ? S.groups[gi].color : '#cfeeff'}"/>`;
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
        P(k.b[0], k.b[1], isBH(k)),
        P(k.b[2], k.b[3], isBH(k)),
        P(k.b[0], k.b[3], isBH(k)),
        P(k.b[2], k.b[1], isBH(k)),
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
  if (st === 'atlas' || st === 'regions') {
    const rl = cache['rl' + det] || (cache['rl' + det] = pathLines(det ? GEO.rlines.d : GEO.rlines.s));
    out += `<path d="${rl}" fill="none" stroke="${ds.dark ? ink : '#4a6a85'}" stroke-width="1.2" stroke-dasharray="5 3" pointer-events="none" opacity=".8"/>`;
    out += `<g pointer-events="none" font-family="'${ds.body}'" font-size="9" letter-spacing="2" font-weight="600" opacity=".65" fill="${ds.dark ? ink : '#355a78'}">`;
    for (const r in REGC) {
      if (S.focus) break;
      const [x, y] = P(REGC[r][0], REGC[r][1]);
      out += `<text x="${x.toFixed(0)}" y="${(y + 3).toFixed(0)}" text-anchor="middle">${GEO.groups[r].toUpperCase()}</text>`;
    }
    if (st === 'atlas') {
      const sea = S.focus ? [] : (GEO.sea || []).map((x) => [x[0], x[1], t(x[2]).toUpperCase()]);
      for (const [fx, fy, t] of sea)
        out += `<text x="${(fx * W).toFixed(0)}" y="${(fy * (H - FOOT)).toFixed(0)}" text-anchor="middle" font-style="italic" font-weight="400" letter-spacing="3">${t}</text>`;
    }
    out += '</g>';
  }
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
  // major cities (country views, or focused units in the world view)
  const CL =
    S.map === 'adm1'
      ? GEO.cityList
      : S.focus && GEO.cities
        ? (focusUnits() || []).flatMap((u) => (GEO.cities[u.c] || []).filter((c) => !GEO.groups[S.focus] || c.cap))
        : [];
  if (CL.length && document.getElementById('showCities').checked) {
    out += '<g pointer-events="none">';
    for (const u of [0]) {
      for (const c of CL) {
        const [x, y] = P(c.x, c.y);
        const big = c.cap || c.pop > 2e6;
        out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${big ? 4.5 : 3}" fill="${c.cap ? ds.accent : '#ffffff'}" stroke="${ink}" stroke-width="1.2"/><text x="${(x + 7).toFixed(1)}" y="${(y + 4).toFixed(1)}" font-family="'${ds.body}'" font-size="${big ? 12 : 10}" font-weight="${c.cap ? 700 : 500}" fill="${ink}" stroke="${bg}" stroke-width="3" paint-order="stroke">${esc(c.n)}</text>`;
      }
    }
    out += '</g>';
  }
  // navne, pins, labels, callouts
  const lf = ds.body;
  out += '<g pointer-events="none">';
  if (all || sp.labels)
    for (const k of unsel) {
      const [x, y] = kc(k);
      if (k.a < (sp.labels ? TH.h : TH.l) && !isBH(k)) continue;
      const caps = sp.labels === 'caps';
      out += `<text x="${x.toFixed(0)}" y="${(y - (sp.cityDots ? 2 : 0)).toFixed(0)}" font-family="'${lf}'" font-size="${caps ? (k.a > TH.big ? 7.5 : 6.5) : k.a > TH.big ? 8 : 6.5}" ${caps ? 'letter-spacing="1.2"' : 'font-weight="700"'} text-anchor="middle" fill="${sp.labelColor || (st === 'outline' || st === 'halftone' ? ink : light(land) ? '#222' : '#fff')}" opacity=".9">${esc(caps ? nm(k).toUpperCase() : nm(k))}</text>`;
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
    if (AT && !sp.patterns && !sp.text)
      ATC.forEach((v, i) =>
        items.push({
          sw: attrColor(AT, i, ATC.length, land),
          stroke: ink,
          sw2: 0.4,
          label: v,
        }),
      );
    if (items.length) {
      let y = H - FOOT - 14 - items.length * 18;
      const lw = Math.max(...items.map((o) => o.label.length)) * 6.2 + 50;
      const x = margin.l.length ? (margin.r.length ? (W - lw) / 2 : W - PAD.r + 20 - lw) : PAD.l - 20;
      out += `<rect x="${x - 8}" y="${y - 8}" width="${lw}" height="${items.length * 18 + 12}" rx="6" fill="${bg}" fill-opacity=".85"/>`;
      items.forEach((o) => {
        out += `<rect x="${x}" y="${y}" width="14" height="14" rx="2" fill="${o.sw}" stroke="${o.stroke}" stroke-width="${o.sw2}"/><text x="${x + 20}" y="${y + 11}" font-family="'${lf}'" font-size="11" fill="${ink}">${esc(o.label)}</text>`;
        y += 18;
      });
    }
  }
  out += '</g>';
  // tekst & logo
  if (document.getElementById('autoText').checked) {
    const a = autoText();
    document.getElementById('title').value = a.title;
    document.getElementById('sub').value = a.sub;
  }
  const title = document.getElementById('title').value,
    sub = document.getElementById('sub').value;
  const hcol = sp.bg ? sp.heading || ink : dark ? ds.headingOnDark : ds.heading;
  const ts = Math.round(W * 0.038);
  out += '<g pointer-events="none">';
  if (document.getElementById('showText').checked) {
    const ta = sp.titleAlign || 'left';
    const tx = ta === 'center' ? W / 2 : ta === 'right' ? W - PAD.l + 12 : PAD.l - 12;
    const anc = ta === 'center' ? 'middle' : ta === 'right' ? 'end' : 'start';
    const t = sp.titleCaps ? title.toUpperCase() : title;
    const ls = sp.titleCaps ? 8 : -1;
    out += `<text x="${tx}" y="${Math.round(ts * 2)}" text-anchor="${anc}" font-family="'${ds.head}'" font-weight="700" font-size="${ts}" letter-spacing="${ls}" fill="${hcol}">${esc(t)}</text><text x="${tx + (ta === 'left' ? 2 : 0)}" y="${Math.round(ts * 2 + 24)}" text-anchor="${anc}" font-family="'${lf}'" font-weight="600" font-size="14" letter-spacing="${sp.titleCaps ? 3 : 0}" fill="${ink}" opacity=".9">${esc(sp.titleCaps ? sub.toUpperCase() : sub)}</text>`;
  }
  if (document.getElementById('showLogo').checked) {
    const L = D.company.logo;
    if (L.src) {
      const lw = Math.min(L.width || 220, W * 0.26),
        lh = lw / (L.aspect || 4);
      const uniformDark =
        dark &&
        (bg.toLowerCase() === (L.boxColor || '').toLowerCase() || st === 'neon' || st === 'blueprint' || ds.dark);
      const box = L.box === 'always' || (L.box === 'auto' && !uniformDark);
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
    const dcol = dv.color || ds.primary;
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
      out += `<text x="${x}" y="${(ty + 4).toFixed(1)}" font-family="'${lf}'" font-size="11" letter-spacing="1" fill="${ink}" opacity=".75">${esc(label.toUpperCase())}</text>`;
      x += label.length * 7.2 + gap;
    }
    for (const p of S.partners) {
      if (p.logo && p.logo.src) {
        const a = p.logo.aspect || 2,
          lw = Math.min(lh * a, W * 0.2);
        const bx = x,
          by = ty - lh / 2;
        out += `<rect x="${bx - 6}" y="${by - 6}" width="${lw + 12}" height="${lh + 12}" rx="4" fill="#ffffff" fill-opacity="${dark ? 0.92 : 0}"/><image href="${p.logo.src}" x="${bx}" y="${by.toFixed(1)}" width="${lw.toFixed(1)}" height="${lh.toFixed(1)}" preserveAspectRatio="xMidYMid meet"/>`;
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
  document.getElementById('svg').innerHTML = defs + out;
  const wrap = document.getElementById('wrap');
  wrap.style.background = bg;
  wrap.style.setProperty('--hl', (groups[S.active] || groups[0] || { color: ds.accent }).color);
  document.getElementById('textInfo').textContent = !document.getElementById('showText').checked
    ? t('off')
    : document.getElementById('autoText').checked
      ? t('text_auto')
      : t('text_custom');
  document.getElementById('count').textContent = t('count').replace('{n}', selAll.size).replace('{g}', groups.length);
}

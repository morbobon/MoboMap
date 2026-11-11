// Title and subtitle flair (Page tab), stored in S.fx.title / S.fx.sub.
// 'auto' follows the design system's defaults.titleFx / defaults.subFx, else the map style (TEXT_FX_STYLE), else none.
// Choosing a design system, a map style or a look sets these again; the selects override them by hand.
const TITLE_FX = [
  'auto',
  'none',
  'shadow',
  'long',
  'extrude',
  'outline',
  'emboss',
  'glow',
  'neon',
  'foil',
  'gradient',
  'stamp',
  'marker',
  'swash',
  'ribbon',
  'cartouche',
  'plaque',
];
const SUB_FX = ['auto', 'none', 'rules', 'ornament', 'pill', 'tag', 'underline', 'spaced', 'italic'];
// map styles with a flair of their own: [title, subtitle]
const TEXT_FX_STYLE = {
  neon: ['neon', 'spaced'],
  blackgold: ['foil', 'ornament'],
  vintage: ['cartouche', 'ornament'],
  retro: ['ribbon', 'spaced'],
  cutout: ['extrude', 'pill'],
  doodle: ['swash', 'italic'],
  chalk: ['outline', 'underline'],
};
function textFxOf(which) {
  const list = which === 'title' ? TITLE_FX : SUB_FX;
  const v = (S.fx && S.fx[which]) || 'auto';
  if (v !== 'auto') return list.includes(v) ? v : 'none';
  return autoTextFx(which);
}
// what 'auto' gives: the design system's default, else the map style's, else none
function autoTextFx(which) {
  const list = which === 'title' ? TITLE_FX : SUB_FX;
  const d = (DS[S.ds] && DS[S.ds].defaults) || {};
  const dv = d[which === 'title' ? 'titleFx' : 'subFx'];
  if (dv && dv !== 'auto' && list.includes(dv)) return dv;
  return (TEXT_FX_STYLE[S.style] || [])[which === 'title' ? 0 : 1] || 'none';
}
function setTextFx(which, v) {
  S.fx = Object.assign({}, S.fx, { [which]: v });
  textFxUI();
  render();
}
// a design system's own flair (or back to auto) when it is chosen or loaded
function textFxFromDS(D) {
  const d = (D && D.defaults) || {};
  S.fx = Object.assign({}, S.fx, {
    title: TITLE_FX.includes(d.titleFx) ? d.titleFx : 'auto',
    sub: SUB_FX.includes(d.subFx) ? d.subFx : 'auto',
  });
}
// choosing a map style: its own flair, else back to auto (the design system's)
// mod, dsc: a saved style brings its changes and its colour source (32-style-custom.js); a preset is itself
function setStyle(id, mod, dsc) {
  S.style = id;
  S.styleMod = styleClean(mod, id);
  if (dsc != null) S.dsColours = dsc;
  const s = TEXT_FX_STYLE[id] || [];
  S.fx = Object.assign({}, S.fx, { title: s[0] || 'auto', sub: s[1] || 'auto' });
  ui();
  render();
}
function textFxUI() {
  const opts = (list, which, pre) =>
    list
      .map((id) => {
        const lab = id === 'auto' ? t('tfx_auto') + ' · ' + t(pre + autoTextFx(which)) : t(pre + id);
        return `<option value="${id}">${esc(lab)}</option>`;
      })
      .join('');
  const tf = document.getElementById('titleFx'),
    sf = document.getElementById('subFx');
  if (!tf || !sf) return;
  const autoT = S.fx.title,
    autoS = S.fx.sub;
  tf.innerHTML = opts(TITLE_FX, 'title', 'tfx_');
  sf.innerHTML = opts(SUB_FX, 'sub', 'sfx_');
  tf.value = TITLE_FX.includes(autoT) ? autoT : 'auto';
  sf.value = SUB_FX.includes(autoS) ? autoS : 'auto';
}

// ---- drawing ----
let TFX_CTX = null;
function textW(s, family, weight, size, ls, italic) {
  TFX_CTX = TFX_CTX || document.createElement('canvas').getContext('2d');
  TFX_CTX.font = `${italic ? 'italic ' : ''}${weight} ${size}px '${family}', sans-serif`;
  return TFX_CTX.measureText(s).width + s.length * (ls || 0);
}
// visible ink span of an anchored text: SVG adds the letter-spacing after every glyph, the last one too
function textSpan(x, anchor, w, ls) {
  const x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  return [x0, x0 + w - (ls || 0)];
}
// boxes are measured with canvas: draw again once the web fonts are in
if (document.fonts) {
  let fontT = 0;
  const again = () => {
    clearTimeout(fontT);
    fontT = setTimeout(() => typeof render === 'function' && W && render(), 120);
  };
  document.fonts.ready.then(again);
  document.fonts.addEventListener('loadingdone', again);
}
// how far an effect's drawing reaches, in font sizes (see titleSvg): top above and bot below the baseline,
// side beyond the text ends. Plain text: cap height .72, descenders .2.
const TFX_BOX = {
  ribbon: { top: 0.92, bot: 0.66, side: 1.14 },
  cartouche: { top: 1.27, bot: 0.76, side: 0.72 },
  plaque: { top: 1.0, bot: 0.56, side: 0.47 },
  stamp: { top: 1.05, bot: 0.62, side: 0.32 },
  swash: { top: 0.72, bot: 0.32, side: 0.2 },
};
// room the title needs: up / down beyond plain text (px), side (px); long shadow and 3D block follow the light
function titleFxExtent(fx, s, Lt) {
  let b = TFX_BOX[fx] || { top: 0.72, bot: 0.2, side: 0 };
  const reach = fx === 'long' ? 0.45 : fx === 'extrude' ? 0.12 : 0;
  if (reach && Lt) {
    const sx = -Lt.x,
      sy = -Lt.y;
    b = { top: 0.72 + reach * Math.max(0, -sy), bot: 0.2 + reach * Math.max(0, sy), side: reach * Math.abs(sx) };
  }
  return {
    up: Math.max(0, (b.top - 0.72) * s),
    down: Math.max(0, (b.bot - 0.2) * s),
    side: b.side * s,
    bot: b.bot * s,
  };
}
const SFX_SIDE = { pill: 12, tag: 12 };
const r1 = (n) => (+n).toFixed(1);
// o: { fx, text, x, y, anchor, size, font, weight, ls, fill, halo, bg, dark, ds, pick, Lt }
function titleSvg(o) {
  const { fx, text, x, y, anchor, size: s, font, weight, ls } = o;
  const u = o.uid || ''; // makes the effect's ids unique (text items)
  const T = (attrs, dx = 0, dy = 0) =>
    `<text x="${r1(x + dx)}" y="${r1(y + dy)}" text-anchor="${anchor}" font-family="'${font}'" font-weight="${weight}" font-size="${s}" letter-spacing="${ls}" ${attrs}>${esc(text)}</text>`;
  const plain = (fill = o.fill, halo = o.halo) => T(`fill="${fill}" ${halo || ''}`);
  if (!fx || fx === 'none') return plain();
  const [x0, x1] = textSpan(x, anchor, textW(text, font, weight, s, ls), ls);
  const w = x1 - x0,
    cx = (x0 + x1) / 2;
  const capTop = y - s * 0.72;
  const bgHex = isHex(o.bg) ? o.bg : o.dark ? '#111111' : '#ffffff';
  const ds = o.ds;
  // shadow direction: away from the light
  const sx = -o.Lt.x,
    sy = -o.Lt.y;
  const shade = o.dark ? '#000000' : mix(bgHex, '#000000', 0.55);
  const accent = o.pick([ds.accent, ds.accent2, ds.primary, o.fill]);
  const box = `x="-30%" y="-60%" width="160%" height="220%"`;
  switch (fx) {
    case 'shadow':
      return `<filter id="tfxShadow${u}" ${box}><feGaussianBlur in="SourceAlpha" stdDeviation="${r1(s * 0.05)}"/><feOffset dx="${r1(sx * s * 0.07)}" dy="${r1(sy * s * 0.07)}" result="o"/><feFlood flood-color="#000" flood-opacity="${o.dark ? 0.75 : 0.38}"/><feComposite in2="o" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter><g filter="url(#tfxShadow${u})">${plain()}</g>`;
    case 'long': {
      const n = Math.round(s * 0.45);
      const k = Math.hypot(sx, sy) || 1;
      // opaque copies in a translucent group, so the overlaps do not build up
      let g = `<g fill="${shade}" opacity="${o.dark ? 0.55 : 0.28}">`;
      for (let i = n; i >= 1; i--) g += T('', (sx / k) * i, (sy / k) * i);
      return g + '</g>' + plain();
    }
    case 'extrude': {
      const n = Math.max(3, Math.round(s * 0.09));
      const side = mix(accent, '#000000', 0.2);
      const k = Math.max(Math.abs(sx), Math.abs(sy)) || 1;
      let g = `<g fill="${side}">`;
      for (let i = n; i >= 1; i--) g += T('', (sx / k) * i, (sy / k) * i);
      return g + '</g>' + plain();
    }
    case 'outline':
      return (
        T(`fill="${accent}"`, sx * s * 0.06, sy * s * 0.06) +
        T(`fill="${bgHex}" stroke="${o.fill}" stroke-width="${r1(Math.max(1.2, s * 0.03))}" stroke-linejoin="round"`)
      );
    case 'emboss':
      return (
        T(`fill="#ffffff" fill-opacity="${o.dark ? 0.22 : 0.75}"`, o.Lt.x * 1.4, o.Lt.y * 1.4) +
        T(`fill="#000000" fill-opacity="${o.dark ? 0.6 : 0.3}"`, sx * 1.4, sy * 1.4) +
        plain()
      );
    case 'glow':
      return `<filter id="tfxGlow${u}" ${box}><feGaussianBlur in="SourceAlpha" stdDeviation="${r1(s * 0.14)}"/><feComponentTransfer result="b"><feFuncA type="linear" slope="1.6"/></feComponentTransfer><feFlood flood-color="${accent}" flood-opacity=".85"/><feComposite in2="b" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter><g filter="url(#tfxGlow${u})">${plain()}</g>`;
    case 'neon': {
      // the tube: a pale core on dark pages; on light pages the (readable) colour itself
      const nc = o.dark ? ds.accent || accent : accent;
      const core = o.dark ? mix(nc, '#ffffff', 0.6) : nc;
      return `<filter id="tfxNeon${u}" ${box}><feGaussianBlur in="SourceGraphic" stdDeviation="${r1(s * 0.05)}" result="a"/><feGaussianBlur in="SourceGraphic" stdDeviation="${r1(s * 0.18)}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="a"/><feMergeNode in="SourceGraphic"/></feMerge></filter><g filter="url(#tfxNeon${u})">${T(`fill="${core}" stroke="${nc}" stroke-width="${r1(Math.max(1, s * 0.025))}" paint-order="stroke"`)}</g>`;
    }
    case 'foil':
      return `<linearGradient id="tfxFoil${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a6a1f"/><stop offset=".42" stop-color="#f7e7a1"/><stop offset=".52" stop-color="#c9a227"/><stop offset=".7" stop-color="#fff1bd"/><stop offset="1" stop-color="#7a5a14"/></linearGradient><filter id="tfxFoilS${u}" ${box}><feGaussianBlur in="SourceAlpha" stdDeviation="${r1(s * 0.03)}"/><feOffset dx="${r1(sx * s * 0.04)}" dy="${r1(sy * s * 0.04)}" result="o"/><feFlood flood-color="#000" flood-opacity=".45"/><feComposite in2="o" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter><g filter="url(#tfxFoilS${u})">${T(`fill="url(#tfxFoil${u})" stroke="#5c430e" stroke-width=".6"`)}</g>`;
    case 'gradient': {
      const c2 = o.pick([ds.accent, ds.accent2, ds.primary].filter((c) => c !== o.fill));
      return `<linearGradient id="tfxGrad${u}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${o.fill}"/><stop offset="1" stop-color="${c2}"/></linearGradient>${T(`fill="url(#tfxGrad${u})" ${o.halo || ''}`)}`;
    }
    case 'stamp': {
      const sc = o.pick([ds.accent2, ds.accent, ds.primary, o.fill]);
      const p = s * 0.28,
        bx = x0 - p,
        by = capTop - p,
        bw = w + p * 2,
        bh = s * 0.92 + p * 2;
      return `<filter id="tfxStamp${u}" x="-5%" y="-10%" width="110%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="5" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2.4 0 0 0 1.9" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in" result="e"/><feDisplacementMap in="e" in2="n" scale="${r1(Math.max(1.5, s * 0.05))}"/></filter><g filter="url(#tfxStamp${u})" transform="rotate(-3 ${r1(cx)} ${r1(y - s * 0.3)})" opacity=".9"><rect x="${r1(bx)}" y="${r1(by)}" width="${r1(bw)}" height="${r1(bh)}" rx="${r1(s * 0.1)}" fill="none" stroke="${sc}" stroke-width="${r1(s * 0.07)}"/><rect x="${r1(bx + s * 0.13)}" y="${r1(by + s * 0.13)}" width="${r1(bw - s * 0.26)}" height="${r1(bh - s * 0.26)}" rx="${r1(s * 0.05)}" fill="none" stroke="${sc}" stroke-width="${r1(s * 0.025)}"/>${T(`fill="${sc}"`)}</g>`;
    }
    case 'marker': {
      const mc = ds.accent || accent;
      const a = x0 - s * 0.12,
        b = x1 + s * 0.12,
        t0 = y - s * 0.4,
        t1 = y + s * 0.08;
      const d = `M${r1(a)} ${r1(t0 + s * 0.04)}L${r1(b)} ${r1(t0 - s * 0.03)}L${r1(b - s * 0.05)} ${r1(t1)}L${r1(a + s * 0.04)} ${r1(t1 + s * 0.04)}Z`;
      // with the contrast guard on, the text colour is chosen against the marker as it shows on the page
      const under = isHex(mc) ? mix(mc, bgHex, 0.45) : bgHex;
      const tf = o.guard ? readable([o.fill, ds.heading, ds.primary, '#1b1b1b', '#ffffff'], [under, bgHex], 3) : o.fill;
      return `<path d="${d}" fill="${mc}" fill-opacity=".55"/>` + plain(tf, '');
    }
    case 'swash': {
      const a = x0,
        b = x1 + s * 0.2,
        m = (a + b) / 2;
      const d = `M${r1(a)} ${r1(y + s * 0.2)}Q${r1(m)} ${r1(y + s * 0.02)} ${r1(b)} ${r1(y + s * 0.05)}Q${r1(m)} ${r1(y + s * 0.15)} ${r1(a + s * 0.06)} ${r1(y + s * 0.3)}Z`;
      return `<path d="${d}" fill="${accent}"/>` + plain();
    }
    case 'ribbon': {
      const rc = o.pick([ds.primary, ds.accent, ds.accent2, o.fill]);
      const tc = light(rc) ? '#1b1b1b' : '#ffffff';
      const top = y - s * 0.92,
        hB = s * 1.3,
        bot = top + hB,
        d = s * 0.25;
      const bx0 = x0 - s * 0.5,
        bx1 = x1 + s * 0.5;
      const tail = (e, dir) =>
        `<path d="M${r1(e - dir * s * 0.15)} ${r1(top + d)}L${r1(e + dir * s * 0.62)} ${r1(top + d)}L${r1(e + dir * s * 0.36)} ${r1(top + d + hB / 2)}L${r1(e + dir * s * 0.62)} ${r1(top + d + hB)}L${r1(e - dir * s * 0.15)} ${r1(top + d + hB)}Z" fill="${mix(rc, '#000000', 0.28)}"/><path d="M${r1(e)} ${r1(bot)}L${r1(e)} ${r1(bot + d)}L${r1(e + dir * d)} ${r1(bot)}Z" fill="${mix(rc, '#000000', 0.55)}"/>`;
      return (
        tail(bx0, -1) +
        tail(bx1, 1) +
        `<rect x="${r1(bx0)}" y="${r1(top)}" width="${r1(bx1 - bx0)}" height="${r1(hB)}" fill="${rc}"/>` +
        `<path d="M${r1(bx0)} ${r1(top + s * 0.1)}H${r1(bx1)}M${r1(bx0)} ${r1(bot - s * 0.1)}H${r1(bx1)}" stroke="${tc}" stroke-opacity=".35" stroke-width="1" stroke-dasharray="4 3"/>` +
        T(`fill="${tc}"`, 0, -s * 0.05)
      );
    }
    case 'cartouche': {
      const px = s * 0.55,
        py = s * 0.38;
      const bx = x0 - px,
        by = capTop - py,
        bw = w + px * 2,
        bh = s * 0.92 + py * 2;
      const lc = o.fill,
        c = s * 0.16;
      let g = `<rect x="${r1(bx)}" y="${r1(by)}" width="${r1(bw)}" height="${r1(bh)}" fill="${bgHex}" fill-opacity=".92" stroke="${lc}" stroke-width="2"/><rect x="${r1(bx + 5)}" y="${r1(by + 5)}" width="${r1(bw - 10)}" height="${r1(bh - 10)}" fill="none" stroke="${lc}" stroke-width=".8"/>`;
      for (const [qx, qy] of [
        [bx, by],
        [bx + bw, by],
        [bx, by + bh],
        [bx + bw, by + bh],
      ])
        g += `<circle cx="${r1(qx)}" cy="${r1(qy)}" r="${r1(c)}" fill="${bgHex}" stroke="${lc}" stroke-width="1.4"/><circle cx="${r1(qx)}" cy="${r1(qy)}" r="${r1(c * 0.35)}" fill="${lc}"/>`;
      const my = by + bh / 2,
        dm = s * 0.12;
      for (const ex of [bx, bx + bw])
        g += `<path d="M${r1(ex)} ${r1(my - dm * 1.6)}L${r1(ex + dm)} ${r1(my)}L${r1(ex)} ${r1(my + dm * 1.6)}L${r1(ex - dm)} ${r1(my)}Z" fill="${lc}"/>`;
      return g + plain(o.fill, '');
    }
    case 'plaque': {
      const px = s * 0.45,
        py = s * 0.28;
      const bx = x0 - px,
        by = capTop - py,
        bw = w + px * 2,
        bh = s * 0.92 + py * 2;
      const sr = s * 0.055;
      let g = `<linearGradient id="tfxBrass${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0dfa8"/><stop offset=".45" stop-color="#c49f52"/><stop offset=".55" stop-color="#b48f43"/><stop offset="1" stop-color="#e2c77d"/></linearGradient><rect x="${r1(bx + 2)}" y="${r1(by + 3)}" width="${r1(bw)}" height="${r1(bh)}" rx="${r1(s * 0.12)}" fill="#000" fill-opacity=".25"/><rect x="${r1(bx)}" y="${r1(by)}" width="${r1(bw)}" height="${r1(bh)}" rx="${r1(s * 0.12)}" fill="url(#tfxBrass${u})" stroke="#6b4f1f" stroke-width="1.2"/><rect x="${r1(bx + 4)}" y="${r1(by + 4)}" width="${r1(bw - 8)}" height="${r1(bh - 8)}" rx="${r1(s * 0.08)}" fill="none" stroke="#fff6d8" stroke-opacity=".6"/>`;
      for (const [qx, qy] of [
        [bx + s * 0.18, by + s * 0.18],
        [bx + bw - s * 0.18, by + s * 0.18],
        [bx + s * 0.18, by + bh - s * 0.18],
        [bx + bw - s * 0.18, by + bh - s * 0.18],
      ])
        g += `<circle cx="${r1(qx)}" cy="${r1(qy)}" r="${r1(sr)}" fill="#7a5a24"/><path d="M${r1(qx - sr * 0.7)} ${r1(qy)}H${r1(qx + sr * 0.7)}" stroke="#f0dfa8" stroke-width=".7"/>`;
      return g + T('fill="#fff6d8" fill-opacity=".55"', 0, 1) + T('fill="#3b2a10"');
    }
  }
  return plain();
}
// o: { fx, text, x, y, anchor, size, font, weight, ls, fill, halo, bg, ds, pick, heading }
function subSvg(o) {
  let { fx, text, x, y, anchor, size, font, weight, ls } = o;
  let italic = false;
  if (fx === 'spaced') ((text = text.toUpperCase()), (ls = 4), (size = 12));
  if (fx === 'italic') ((font = o.heading), (weight = 400), (size = 16), (italic = true));
  const T = (attrs) =>
    `<text x="${r1(x)}" y="${r1(y)}" text-anchor="${anchor}" font-family="'${font}'" font-weight="${weight}" font-size="${size}" letter-spacing="${ls}" ${italic ? 'font-style="italic"' : ''} ${attrs}>${esc(text)}</text>`;
  const plain = () => T(`fill="${o.fill}" opacity=".9" ${o.halo || ''}`);
  if (!fx || fx === 'none' || fx === 'auto') return plain();
  const [x0, x1] = textSpan(x, anchor, textW(text, font, weight, size, ls, italic), ls);
  const w = x1 - x0;
  const ds = o.ds;
  const accent = o.pick([ds.accent, ds.accent2, ds.primary, o.fill]);
  const mid = y - size * 0.32;
  switch (fx) {
    case 'rules': {
      const L = 46;
      let g = '';
      if (anchor !== 'start')
        g += `<path d="M${r1(x0 - 12 - L)} ${r1(mid)}H${r1(x0 - 12)}" stroke="${accent}" stroke-width="1.5"/>`;
      if (anchor !== 'end')
        g += `<path d="M${r1(x1 + 12)} ${r1(mid)}H${r1(x1 + 12 + L)}" stroke="${accent}" stroke-width="1.5"/>`;
      return g + plain();
    }
    case 'ornament': {
      const dia = (cx) =>
        `<path d="M${r1(cx)} ${r1(mid - 4)}L${r1(cx + 4)} ${r1(mid)}L${r1(cx)} ${r1(mid + 4)}L${r1(cx - 4)} ${r1(mid)}Z" fill="${accent}"/>`;
      let g = '';
      if (anchor !== 'start')
        g += `<path d="M${r1(x0 - 40)} ${r1(mid)}H${r1(x0 - 16)}" stroke="${accent}"/>` + dia(x0 - 10);
      if (anchor !== 'end')
        g += dia(x1 + 10) + `<path d="M${r1(x1 + 16)} ${r1(mid)}H${r1(x1 + 40)}" stroke="${accent}"/>`;
      return g + plain();
    }
    case 'pill': {
      const pc = o.pick([ds.primary, ds.accent, ds.accent2, o.fill]);
      const tc = light(pc) ? '#1b1b1b' : '#ffffff';
      return (
        `<rect x="${r1(x0 - 10)}" y="${r1(y - size - 3)}" width="${r1(w + 20)}" height="${r1(size + 9)}" rx="${r1((size + 9) / 2)}" fill="${pc}"/>` +
        T(`fill="${tc}"`)
      );
    }
    case 'tag': {
      const bar =
        anchor === 'end'
          ? `<rect x="${r1(x1 + 8)}" y="${r1(y - size)}" width="3.5" height="${r1(size + 3)}" fill="${accent}"/>`
          : anchor === 'middle'
            ? `<rect x="${r1(x0 - 12)}" y="${r1(y - size)}" width="3.5" height="${r1(size + 3)}" fill="${accent}"/><rect x="${r1(x1 + 8.5)}" y="${r1(y - size)}" width="3.5" height="${r1(size + 3)}" fill="${accent}"/>`
            : `<rect x="${r1(x0 - 12)}" y="${r1(y - size)}" width="3.5" height="${r1(size + 3)}" fill="${accent}"/>`;
      return bar + plain();
    }
    case 'underline':
      return (
        `<path d="M${r1(x0)} ${r1(y + 5)}H${r1(x1)}" stroke="${accent}" stroke-width="2" stroke-linecap="round"/>` +
        plain()
      );
  }
  return plain();
}

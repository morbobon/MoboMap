// Simplified flags (no coats of arms). Format "type|colours…":
//   h|c1|c2…  horizontal stripes   v|c1|c2…  vertical stripes   s|c  solid
//   x|bg|cross[|inner]  Nordic cross   p|bg|fg  centred plus   c|bg|disc[|dx]  disc   d|bg|dot  dot top-left
//   us, gb, br, cz, cl  hand-drawn specials
const FLAGS = {
  DNK: 'x|#C8102E|#FFFFFF',
  SWE: 'x|#006AA7|#FECC00',
  NOR: 'x|#BA0C2F|#FFFFFF|#00205B',
  FIN: 'x|#FFFFFF|#002F6C',
  ISL: 'x|#02529C|#FFFFFF|#DC1E35',
  FRO: 'x|#FFFFFF|#0065BD|#EF303E',
  DEU: 'h|#000000|#DD0000|#FFCE00',
  FRA: 'v|#0055A4|#FFFFFF|#EF4135',
  ITA: 'v|#009246|#FFFFFF|#CE2B37',
  IRL: 'v|#169B62|#FFFFFF|#FF883E',
  BEL: 'v|#000000|#FDDA24|#EF3340',
  NLD: 'h|#AE1C28|#FFFFFF|#21468B',
  LUX: 'h|#EF3340|#FFFFFF|#00A3E0',
  AUT: 'h|#ED2939|#FFFFFF|#ED2939',
  HUN: 'h|#CE2939|#FFFFFF|#477050',
  BGR: 'h|#FFFFFF|#00966E|#D62612',
  EST: 'h|#0072CE|#000000|#FFFFFF',
  LTU: 'h|#FDB913|#006A44|#C1272D',
  LVA: 'h|#9E3039|#9E3039|#FFFFFF|#9E3039|#9E3039',
  POL: 'h|#FFFFFF|#DC143C',
  UKR: 'h|#0057B7|#FFD700',
  RUS: 'h|#FFFFFF|#0039A6|#D52B1E',
  ROU: 'v|#002B7F|#FCD116|#CE1126',
  MDA: 'v|#0046AE|#FFD200|#CC092F',
  ESP: 'h|#AA151B|#F1BF00|#F1BF00|#AA151B',
  PRT: 'v|#006600|#006600|#FF0000|#FF0000|#FF0000',
  GRC: 'h|#0D5EAF|#FFFFFF|#0D5EAF|#FFFFFF|#0D5EAF|#FFFFFF|#0D5EAF|#FFFFFF|#0D5EAF',
  CHE: 'p|#DA291C|#FFFFFF',
  GBR: 'gb',
  CZE: 'cz',
  SVK: 'h|#FFFFFF|#0B4EA2|#EE1C25',
  SVN: 'h|#FFFFFF|#005DA4|#ED1C24',
  HRV: 'h|#FF0000|#FFFFFF|#171796',
  SRB: 'h|#C6363C|#0C4076|#FFFFFF',
  BIH: 's|#002395',
  MNE: 's|#C40308',
  MKD: 'c|#D20000|#FFE600',
  ALB: 's|#E41E20',
  BLR: 'h|#C8313E|#C8313E|#4AA657',
  KOS: 's|#244AA5',
  CYP: 's|#FFFFFF',
  TUR: 'c|#E30A17|#FFFFFF|-0.08',
  USA: 'us',
  CAN: 'v|#D52B1E|#FFFFFF|#FFFFFF|#D52B1E',
  MEX: 'v|#006847|#FFFFFF|#CE1126',
  GTM: 'v|#4997D0|#FFFFFF|#4997D0',
  HND: 'h|#0073CF|#FFFFFF|#0073CF',
  SLV: 'h|#0F47AF|#FFFFFF|#0F47AF',
  NIC: 'h|#0067C6|#FFFFFF|#0067C6',
  CRI: 'h|#002B7F|#FFFFFF|#CE1126|#CE1126|#FFFFFF|#002B7F',
  PAN: 's|#FFFFFF',
  CUB: 'h|#002A8F|#FFFFFF|#002A8F|#FFFFFF|#002A8F',
  DOM: 'p|#002D62|#FFFFFF',
  HTI: 'h|#00209F|#D21034',
  JAM: 's|#009B3A',
  BRA: 'br',
  ARG: 'h|#74ACDF|#FFFFFF|#74ACDF',
  CHL: 'cl',
  COL: 'h|#FCD116|#FCD116|#003893|#CE1126',
  PER: 'v|#D91023|#FFFFFF|#D91023',
  VEN: 'h|#FFCC00|#00247D|#CF142B',
  ECU: 'h|#FFDD00|#FFDD00|#034EA2|#ED1C24',
  BOL: 'h|#D52B1E|#F9E300|#007934',
  PRY: 'h|#D52B1E|#FFFFFF|#0038A8',
  URY: 'h|#FFFFFF|#0038A8|#FFFFFF|#0038A8|#FFFFFF',
  GUY: 's|#009E49',
  SUR: 'h|#377E3F|#FFFFFF|#B40A2D|#B40A2D|#FFFFFF|#377E3F',
  JPN: 'c|#FFFFFF|#BC002D',
  CHN: 'd|#DE2910|#FFDE00',
  KOR: 'c|#FFFFFF|#CD2E3A',
  PRK: 'h|#024FA2|#ED1C27|#ED1C27|#024FA2',
  TWN: 's|#FE0000',
  MNG: 'v|#C4272F|#015197|#C4272F',
  IND: 'h|#FF9933|#FFFFFF|#138808',
  PAK: 'v|#FFFFFF|#01411C|#01411C|#01411C',
  BGD: 'c|#006A4E|#F42A41|-0.05',
  NPL: 's|#DC143C',
  LKA: 's|#FFBE29',
  MMR: 'h|#FECB00|#34B233|#EA2839',
  THA: 'h|#A51931|#F4F5F8|#2D2A4A|#2D2A4A|#F4F5F8|#A51931',
  LAO: 'h|#CE1126|#002868|#002868|#CE1126',
  KHM: 'h|#032EA1|#E00025|#E00025|#032EA1',
  VNM: 'c|#DA251D|#FFFF00',
  MYS: 'h|#CC0001|#FFFFFF|#CC0001|#FFFFFF|#CC0001|#FFFFFF|#CC0001',
  IDN: 'h|#CE1126|#FFFFFF',
  PHL: 'h|#0038A8|#CE1126',
  PNG: 's|#000000',
  AUS: 's|#012169',
  NZL: 's|#012169',
  KAZ: 's|#00AFCA',
  UZB: 'h|#0099B5|#FFFFFF|#1EB53A',
  TKM: 's|#00843D',
  KGZ: 'c|#E8112D|#FFEF00',
  TJK: 'h|#CC0000|#FFFFFF|#006600',
  AFG: 'v|#000000|#D32011|#007A36',
  IRN: 'h|#239F40|#FFFFFF|#DA0000',
  IRQ: 'h|#CE1126|#FFFFFF|#000000',
  SYR: 'h|#CE1126|#FFFFFF|#000000',
  YEM: 'h|#CE1126|#FFFFFF|#000000',
  SAU: 's|#006C35',
  ARE: 'h|#00732F|#FFFFFF|#000000',
  OMN: 's|#DB161B',
  QAT: 's|#8A1538',
  KWT: 'h|#007A3D|#FFFFFF|#CE1126',
  JOR: 'h|#000000|#FFFFFF|#007A3D',
  ISR: 'h|#FFFFFF|#0038B8|#FFFFFF|#FFFFFF|#FFFFFF|#0038B8|#FFFFFF',
  LBN: 'h|#ED1C24|#FFFFFF|#FFFFFF|#ED1C24',
  GEO: 'p|#FFFFFF|#FF0000',
  ARM: 'h|#D90012|#0033A0|#F2A800',
  AZE: 'h|#0092BC|#E4002B|#00AF66',
  EGY: 'h|#CE1126|#FFFFFF|#000000',
  LBY: 'h|#E70013|#000000|#000000|#239E46',
  TUN: 'c|#E70013|#FFFFFF',
  DZA: 'v|#006233|#FFFFFF',
  MAR: 's|#C1272D',
  SDN: 'h|#D21034|#FFFFFF|#000000',
  ETH: 'h|#078930|#FCDD09|#DA121A',
  KEN: 'h|#000000|#BB0000|#006600',
  UGA: 'h|#000000|#FCDC04|#D90000|#000000|#FCDC04|#D90000',
  TZA: 's|#1EB53A',
  NGA: 'v|#008751|#FFFFFF|#008751',
  GHA: 'h|#CE1126|#FCD116|#006B3F',
  CIV: 'v|#F77F00|#FFFFFF|#009E60',
  MLI: 'v|#14B53A|#FCD116|#CE1126',
  TCD: 'v|#002664|#FECB00|#C60C30',
  GIN: 'v|#CE1126|#FCD116|#009460',
  SEN: 'v|#00853F|#FDEF42|#E31B23',
  CMR: 'v|#007A5E|#CE1126|#FCD116',
  NER: 'h|#E05206|#FFFFFF|#0DB02B',
  GAB: 'h|#009E60|#FCD116|#3A75C4',
  SLE: 'h|#1EB53A|#FFFFFF|#0072C6',
  BEN: 'v|#008751|#FCD116',
  BFA: 'h|#EF2B2D|#009E49',
  TGO: 'h|#006A4E|#FFCE00|#006A4E|#FFCE00|#006A4E',
  ZAF: 'h|#E03C31|#FFFFFF|#007749|#FFFFFF|#001489',
  NAM: 's|#003580',
  BWA: 'h|#75AADB|#75AADB|#000000|#75AADB|#75AADB',
  ZWE: 'h|#319B42|#FFD200|#DE2010|#000000|#DE2010|#FFD200|#319B42',
  ZMB: 's|#198A00',
  MOZ: 'h|#009A44|#FFFFFF|#000000|#FFFFFF|#FCE100',
  AGO: 'h|#CC092F|#000000',
  COD: 's|#007FFF',
  COG: 's|#009543',
  MDG: 'h|#FC3D32|#007E3A',
  SOM: 'c|#4189DD|#FFFFFF',
  RWA: 'h|#00A1DE|#00A1DE|#FAD201|#20603D',
  GRL: 'h|#FFFFFF|#C8102E',
};
function flagSVG(desc, x, y, w, h) {
  const p = desc.split('|'),
    t = p[0],
    c = p.slice(1);
  const R = (a, b, cw, ch, col) =>
    `<rect x="${(x + a * w).toFixed(3)}" y="${(y + b * h).toFixed(3)}" width="${(cw * w).toFixed(3)}" height="${(ch * h).toFixed(3)}" fill="${col}"/>`;
  if (t === 'h') return c.map((col, i) => R(0, i / c.length, 1, 1 / c.length + 0.002, col)).join('');
  if (t === 'v') return c.map((col, i) => R(i / c.length, 0, 1 / c.length + 0.002, 1, col)).join('');
  if (t === 's') return R(0, 0, 1, 1, c[0]);
  if (t === 'x') {
    let o = R(0, 0, 1, 1, c[0]) + R(0.3, 0, 0.13, 1, c[1]) + R(0, 0.42, 1, 0.16, c[1]);
    if (c[2]) o += R(0.335, 0, 0.06, 1, c[2]) + R(0, 0.465, 1, 0.07, c[2]);
    return o;
  }
  if (t === 'p') return R(0, 0, 1, 1, c[0]) + R(0.42, 0.18, 0.16, 0.64, c[1]) + R(0.22, 0.42, 0.56, 0.16, c[1]);
  if (t === 'c') {
    const dx = +(c[2] || 0);
    return (
      R(0, 0, 1, 1, c[0]) +
      `<ellipse cx="${(x + (0.5 + dx) * w).toFixed(3)}" cy="${(y + 0.5 * h).toFixed(3)}" rx="${(0.18 * Math.min(w, h) * (w > h ? 1 : w / h)).toFixed(3)}" ry="${(0.18 * Math.min(w, h) * (h > w ? 1 : h / w)).toFixed(3)}" fill="${c[1]}"/>`.replace(
        /rx="[^"]*" ry="[^"]*"/,
        `rx="${(0.17 * w).toFixed(3)}" ry="${(0.25 * h).toFixed(3)}"`,
      )
    );
  }
  if (t === 'd')
    return (
      R(0, 0, 1, 1, c[0]) +
      `<ellipse cx="${(x + 0.17 * w).toFixed(3)}" cy="${(y + 0.25 * h).toFixed(3)}" rx="${(0.07 * w).toFixed(3)}" ry="${(0.1 * h).toFixed(3)}" fill="${c[1]}"/>`
    );
  if (t === 'us') {
    let o = '';
    for (let i = 0; i < 13; i++) o += R(0, i / 13, 1, 1 / 13 + 0.002, i % 2 ? '#FFFFFF' : '#B22234');
    return o + R(0, 0, 0.4, 7 / 13, '#3C3B6E');
  }
  if (t === 'gb') {
    const sw = Math.max(w, h);
    return (
      R(0, 0, 1, 1, '#012169') +
      `<path d="M${x} ${y}L${x + w} ${y + h}M${x + w} ${y}L${x} ${y + h}" stroke="#FFFFFF" stroke-width="${(0.12 * sw).toFixed(3)}"/><path d="M${x} ${y}L${x + w} ${y + h}M${x + w} ${y}L${x} ${y + h}" stroke="#C8102E" stroke-width="${(0.04 * sw).toFixed(3)}"/>` +
      R(0.4, 0, 0.2, 1, '#FFFFFF') +
      R(0, 0.38, 1, 0.24, '#FFFFFF') +
      R(0.44, 0, 0.12, 1, '#C8102E') +
      R(0, 0.43, 1, 0.14, '#C8102E')
    );
  }
  if (t === 'cz')
    return (
      R(0, 0, 1, 0.5, '#FFFFFF') +
      R(0, 0.5, 1, 0.5, '#D7141A') +
      `<path d="M${x} ${y}L${x + 0.5 * w} ${y + 0.5 * h}L${x} ${y + h}Z" fill="#11457E"/>`
    );
  if (t === 'cl') return R(0, 0, 1, 0.5, '#FFFFFF') + R(0, 0.5, 1, 0.5, '#D52B1E') + R(0, 0, 0.33, 0.5, '#0039A6');
  if (t === 'br')
    return (
      R(0, 0, 1, 1, '#009C3B') +
      `<path d="M${x + 0.08 * w} ${y + 0.5 * h}L${x + 0.5 * w} ${y + 0.1 * h}L${x + 0.92 * w} ${y + 0.5 * h}L${x + 0.5 * w} ${y + 0.9 * h}Z" fill="#FFDF00"/><ellipse cx="${x + 0.5 * w}" cy="${y + 0.5 * h}" rx="${0.18 * w}" ry="${0.26 * h}" fill="#002776"/>`
    );
  return R(0, 0, 1, 1, '#cccccc');
}

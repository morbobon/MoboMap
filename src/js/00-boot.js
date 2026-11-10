/*__DATA__*/
// DATA.adm1 (provinces), DATA.elev (terrain) and DATA.cities stay packed in DATA_Z until first read
for (const k of ['adm1', 'elev', 'cities'])
  Object.defineProperty(DATA, k, {
    configurable: true,
    get() {
      const v = DATA_Z[k] ? unpackJSON(DATA_Z[k]) : k === 'elev' ? null : {};
      Object.defineProperty(DATA, k, { value: v });
      return v;
    },
  });
/*__FONTS__*/
const fontCSS = Object.entries(FONTS)
  .map(
    ([n, b]) =>
      `@font-face{font-family:'${n}';src:url(data:font/woff2;base64,${b}) format('woff2');font-weight:${n === 'Work Sans' ? '400 700' : '700'}}`,
  )
  .join('');
document.head.insertAdjacentHTML('beforeend', '<style>' + fontCSS + '</style>');

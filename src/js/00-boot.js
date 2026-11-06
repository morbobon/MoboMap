/*__DATA__*/
/*__FONTS__*/
const fontCSS = Object.entries(FONTS)
  .map(
    ([n, b]) =>
      `@font-face{font-family:'${n}';src:url(data:font/woff2;base64,${b}) format('woff2');font-weight:${n === 'Work Sans' ? '400 700' : '700'}}`,
  )
  .join('');
document.head.insertAdjacentHTML('beforeend', '<style>' + fontCSS + '</style>');

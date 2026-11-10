const LANGN = {
  en: 'English',
  da: 'Dansk',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  sv: 'Svenska',
  no: 'Norsk',
  fi: 'Suomi',
  nl: 'Nederlands',
  it: 'Italiano',
  tr: 'Türkçe',
};
const T = /*__I18N__*/ {};
function t(k) {
  return (T[S.lang] && T[S.lang][k]) || T.en[k] || k;
}
// Resolve a design-system text field: plain string, or an object keyed by language
function loc(v) {
  if (v == null) return '';
  if (typeof v !== 'object') return String(v);
  return v[S.lang] ?? v.en ?? Object.values(v)[0] ?? '';
}
function setLang(l, silent) {
  if (!T[l]) l = 'en';
  S.lang = l;
  localStorage.setItem('mobomap.lang', l);
  document.documentElement.lang = l;
  document.querySelectorAll('[data-i18n]').forEach((e) => {
    e.textContent = t(e.dataset.i18n);
  });
  document.title = t('app_title');
  if (typeof applyUiMode === 'function' && document.getElementById('uiMode')) applyUiMode();
  document.querySelectorAll('[data-i18n-ph]').forEach((e) => {
    e.placeholder = t(e.dataset.i18nPh);
  });
  document.querySelectorAll('[data-i18n-title]').forEach((e) => {
    e.title = t(e.dataset.i18nTitle);
  });
  // short visible names for icon buttons where there is no hover (the phone menu)
  document.querySelectorAll('[data-i18n-label]').forEach((e) => {
    e.dataset.label = t(e.dataset.i18nLabel);
  });
  // profile texts that the user has not edited follow the language
  const fl = document.getElementById('footerLabel');
  if (fl && fl.dataset.auto !== '0' && S.ds && DS[S.ds]) fl.value = loc(DS[S.ds].footer.label);
  if (!silent) {
    ui();
    render();
  }
}

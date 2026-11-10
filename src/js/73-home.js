// "MoboMap" in the header goes back to the start map (the default project, no link parameters).
// With changes on the page it first offers to keep them: as a look in this browser, or as a project file.
function mapIsDefault() {
  try {
    const q = shareParams();
    ['hp', 'hs', 'full'].forEach((k) => q.delete(k)); // menu layout is not part of the map
    return ![...q.keys()].length;
  } catch {
    return false;
  }
}
// "Don't ask again" in the dialog (or the checkbox in the Map tab): reset straight away, in this browser
const homeAsk = () => localStorage.getItem('mobomap.homeAsk') !== '0';
function setHomeAsk(on) {
  localStorage.setItem('mobomap.homeAsk', on ? '1' : '0');
  document.getElementById('homeAsk').checked = on;
}
function leaveHome() {
  location.href = location.pathname;
}
function goHome(e) {
  if (e) e.preventDefault();
  if (mapIsDefault() || !homeAsk()) return leaveHome();
  const d = document.getElementById('homeDlg');
  document.getElementById('homeNoAsk').checked = false;
  if (typeof d.showModal === 'function') d.showModal();
  else if (confirm(t('home_q'))) leaveHome();
  return false;
}
function homeSave(kind) {
  const d = document.getElementById('homeDlg');
  if (kind !== 'cancel' && document.getElementById('homeNoAsk').checked) setHomeAsk(false);
  if (kind === 'look') {
    const n = userLooks().length;
    saveLook();
    if (userLooks().length === n) return; // name prompt cancelled: stay
    d.close();
    leaveHome();
  } else if (kind === 'project') {
    saveProject();
    d.close();
    setTimeout(leaveHome, 400); // let the download start
  } else if (kind === 'leave') {
    d.close();
    leaveHome();
  } else d.close();
}

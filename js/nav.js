// ═══════════════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════════════
function navigate(page) {
  // Push history
  if (navHistory.length === 0 || navHistory[navHistory.length-1] !== currentPage) {
    if (currentPage) navHistory.push(currentPage);
  }
  currentPage = page;
  history.replaceState(null, '', '#/pagina/' + page);
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page)?.classList.add('active');
  document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(n => n.classList.remove('active'));
  document.querySelectorAll(`.nav-link[data-page="${page}"], .mobile-nav-link[data-page="${page}"]`).forEach(n => n.classList.add('active'));
  if (page === 'stats')    renderStats();
  if (page === 'map')      renderMapPage();
  if (page === 'artists')  renderArtistsPage();
  if (page === 'about')    renderAboutPage();
  if (page === 'vinyl')    initVinylPage();
  if (page === 'friends')  renderFriendsPage();
  if (page === 'recs')     renderRecsPage();
  if (page === 'quiz')     renderQuiz();
  if (page === 'timeline') renderTimeline();
  if (page === 'shows')  initShowsPage();
  if (page === 'lastfm') initLastfmPage();
  updateBackBtn();
}

function goBack() {
  if (!navHistory.length) return;
  const prev = navHistory.pop();
  currentPage = prev;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + prev)?.classList.add('active');
  document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(n => n.classList.remove('active'));
  document.querySelectorAll(`.nav-link[data-page="${prev}"], .mobile-nav-link[data-page="${prev}"]`).forEach(n => n.classList.add('active'));
  if (prev === 'stats')    renderStats();
  if (prev === 'map')      renderMapPage();
  if (prev === 'artists')  renderArtistsPage();
  if (prev === 'about')    renderAboutPage();
  if (prev === 'vinyl')    initVinylPage();
  if (prev === 'friends')  renderFriendsPage();
  if (prev === 'recs')     renderRecsPage();
  if (prev === 'quiz')     renderQuiz();
  if (prev === 'timeline') renderTimeline();
  updateBackBtn();
}

function updateBackBtn() {
  const btn = document.getElementById('backBtn');
  if (btn) btn.style.display = navHistory.length ? 'flex' : 'none';
}

// ═══════════════════════════════════════════════════
//  SAVE
// ═══════════════════════════════════════════════════
function save() { localStorage.setItem('album1000', JSON.stringify(collection)); }

// ═══════════════════════════════════════════════════
//  MOBILE NAV
// ═══════════════════════════════════════════════════
function toggleMobileNav() {
  const nav     = document.getElementById('mobileNav');
  const overlay = document.getElementById('mobileNavOverlay');
  const btn     = document.getElementById('hamburgerBtn');
  const isOpen  = nav.classList.contains('open');
  nav.classList.toggle('open', !isOpen);
  overlay.classList.toggle('open', !isOpen);
  btn.textContent = isOpen ? '☰' : '✕';
}
function closeMobileNav() {
  document.getElementById('mobileNav').classList.remove('open');
  document.getElementById('mobileNavOverlay').classList.remove('open');
  document.getElementById('hamburgerBtn').textContent = '☰';
}
function mobileNavigate(page) {
  closeMobileNav();
  navigate(page);
  // Sync mobile nav links
  document.querySelectorAll('.mobile-nav-link').forEach(n => {
    n.classList.toggle('active', n.dataset.page === page);
  });
}

// Sync desktop nav-link active state with mobile
const _origNavigate = navigate;
// (already handled inside navigate + mobileNavigate)

// ═══════════════════════════════════════════════════
//  SEARCH + SUGGESTIONS
// ═══════════════════════════════════════════════════
const suggBox = document.getElementById('searchSuggestions');
let suggActive = -1;

function showSuggestions(q) {
  suggActive = -1;
  if (!q || q.length < 2) { suggBox.classList.remove('open'); return; }
  const lower = q.toLowerCase();
  const matches = collection.filter(a =>
    a.title.toLowerCase().includes(lower) || a.artist.toLowerCase().includes(lower)
  ).slice(0, 8);
  if (!matches.length) { suggBox.classList.remove('open'); return; }
  suggBox.innerHTML = matches.map((a,i) => {
    const cover = a.cover || '';
    const imgHtml = cover
      ? `<img src="${cover}" alt="" onerror="this.style.display='none'">`
      : `<div style="width:32px;height:32px;background:var(--surface3);border-radius:2px;flex-shrink:0"></div>`;
    const titleEsc = a.title.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    const artistEsc = a.artist.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    return `<div class="sugg-item" data-idx="${i}" onclick="applySuggestion('${artistEsc}','${titleEsc}')">
      ${imgHtml}
      <span><strong>${esc(a.artist)}</strong> — ${esc(a.title)}</span>
      <span class="sugg-label">#${a.rank}</span>
    </div>`;
  }).join('');
  suggBox.classList.add('open');
}

function applySuggestion(artist, title) {
  searchQuery = artist + ' ' + title;
  document.getElementById('searchInput').value = searchQuery;
  suggBox.classList.remove('open');
  currentAlbumPage = 1;
  renderCollection();
}

document.getElementById('searchInput').addEventListener('input', function() {
  searchQuery = this.value; currentAlbumPage = 1;
  const mob = document.getElementById('mobileSearchInput');
  if (mob) mob.value = this.value;
  showSuggestions(this.value.trim());
  if (currentPage==='collection') renderCollection();
});

document.getElementById('searchInput').addEventListener('keydown', function(e) {
  const items = suggBox.querySelectorAll('.sugg-item');
  if (!items.length) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); suggActive = Math.min(suggActive+1, items.length-1); items.forEach((el,i)=>el.classList.toggle('active',i===suggActive)); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); suggActive = Math.max(suggActive-1, 0); items.forEach((el,i)=>el.classList.toggle('active',i===suggActive)); }
  else if (e.key === 'Enter' && suggActive >= 0) { items[suggActive].click(); }
  else if (e.key === 'Escape') { suggBox.classList.remove('open'); }
});

document.addEventListener('click', function(e) { if (!e.target.closest('.search-wrap')) suggBox.classList.remove('open'); });

document.getElementById('mobileSearchInput').addEventListener('input', function() {
  searchQuery = this.value; currentAlbumPage = 1;
  document.getElementById('searchInput').value = this.value;
  if (currentPage==='collection') renderCollection();
});

// ═══════════════════════════════════════════════════
//  FAVORITES FILTER
// ═══════════════════════════════════════════════════
function toggleFavFilter() {
  showOnlyFavs = !showOnlyFavs;
  document.getElementById('favPill')?.classList.toggle('active', showOnlyFavs);
  currentAlbumPage = 1;
  renderCollection();
}

// ═══════════════════════════════════════════════════
//  UTILS

// ═══════════════════════════════════════════════════
//  THEME
// ═══════════════════════════════════════════════════
let currentTheme = localStorage.getItem('theme') || 'light';
function applyTheme() {
  document.documentElement.setAttribute('data-theme', currentTheme);
}
function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', currentTheme);
  applyTheme();
  // Re-render all charts so colors match the new theme
  if (currentPage === 'stats') renderAllCharts();
}
applyTheme();

// ═══════════════════════════════════════════════════
//  BANDAS / ARTISTAS PAGE

// ── LASTFM MAIS OUVIDOS ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════
//  KEYBOARD NAVIGATION
// ═══════════════════════════════════════════════════
document.addEventListener('keydown', function(e) {
  // / → focus search
  if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
    const searchEl = document.getElementById('searchInput');
    if (searchEl && document.activeElement !== searchEl) {
      e.preventDefault();
      searchEl.focus();
      return;
    }
  }

  // Only process modal shortcuts when album modal is open
  const modal = document.getElementById('modalBackdrop');
  const modalOpen = modal && modal.classList.contains('open');

  if (e.key === 'Escape') {
    if (modalOpen) { closeModalBtn(); return; }
    // also close any open dropdowns
    const sugg = document.getElementById('searchSuggestions');
    if (sugg) sugg.classList.remove('open');
    return;
  }

  if (!modalOpen) return;

  // Don't fire if user is typing in an input/textarea
  if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) return;

  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    e.preventDefault();
    navigateModal(e.key === 'ArrowRight' ? 1 : -1);
  }

  if (e.key === 'f' || e.key === 'F') {
    e.preventDefault();
    // find the current album rank from the modal
    const rankEl = document.querySelector('#modalContent [data-rank]');
    if (rankEl) toggleFavModal(parseInt(rankEl.dataset.rank));
  }
});

// ═══════════════════════════════════════════════════
//  RANDOM ALBUM
// ═══════════════════════════════════════════════════
function openRandomAlbum() {
  const pool = getFiltered();
  if (!pool.length) return;
  const album = pool[Math.floor(Math.random() * pool.length)];
  openAlbum(album.rank);
}

// ═══════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════
loadRealAlbums();
renderSortPills();
updateFilterPills();
renderCollection();
toast('1000 álbuns carregados! Buscando capas...', 3000);
enqueueCoverFetch();

// Hash routing — read URL on load
(function initHashRouter() {
  const hash = window.location.hash; // e.g. #/album/42 or #/pagina/stats
  if (!hash) return;
  const parts = hash.replace('#/', '').split('/');
  if (parts[0] === 'album' && parts[1]) {
    const rank = parseInt(parts[1]);
    if (!isNaN(rank)) setTimeout(() => openAlbum(rank), 300);
  } else if (parts[0] === 'pagina' && parts[1]) {
    const page = parts[1];
    const validPages = ['collection','artists','map','stats','about','vinyl','friends','recs','quiz','timeline','shows','lastfm'];
    if (validPages.includes(page)) setTimeout(() => navigate(page), 100);
  }
})();


// ═══════════════════════════════════════════════════
function esc(s)  { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function esc2(s) { return String(s||'').replace(/'/g,"\\'").replace(/"/g,'\\"'); }
function fmtMs(ms) {
  if (!ms) return '';
  const s = Math.round(ms/1000);
  return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
}
function toast(msg, dur=2800) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), dur);
}

// ═══════════════════════════════════════════════════
//  COVER CACHE
// ═══════════════════════════════════════════════════
let coverCache  = JSON.parse(localStorage.getItem('coverCache')  || '{}');
let itunesCache = JSON.parse(localStorage.getItem('itunesCache') || '{}');
let deezerCache = JSON.parse(localStorage.getItem('deezerCache') || '{}');

function saveCoverCache() {
  localStorage.setItem('coverCache',  JSON.stringify(coverCache));
  localStorage.setItem('itunesCache', JSON.stringify(itunesCache));
  localStorage.setItem('deezerCache', JSON.stringify(deezerCache));
}
function coverKey(title, artist) { return `${title}|${artist}`; }

// ═══════════════════════════════════════════════════
//  LOAD REAL ALBUMS
// ═══════════════════════════════════════════════════
function loadRealAlbums() {
  if (!window.ALBUMS_DATA) return;
  const existingMap = {};
  collection.forEach(a => { existingMap[coverKey(a.title,a.artist)] = a; });

  collection = window.ALBUMS_DATA.map(d => {
    const key      = coverKey(d.t, d.a);
    const existing = existingMap[key];
    const cached   = coverCache[key] || '';
    const itunes   = itunesCache[String(d.r)] || {};
    const deezer   = deezerCache[String(d.r)]  || {};
    return {
      rank:      d.r,
      title:     d.t,
      artist:    d.a,
      year:      d.y || null,
      genre:     d.g || '',
      country:   d.c || '',
      comment:   d.m || '',
      cover:     existing?.cover     || cached || '',
      itunesId:  existing?.itunesId  || itunes.id  || null,
      itunesUrl: existing?.itunesUrl || itunes.url || '',
      deezerUrl: existing?.deezerUrl || deezer.url || '',
      fav:       existing?.fav       || false,
      addedAt:   existing?.addedAt   || Date.now(),
    };
  });
  save();
}

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

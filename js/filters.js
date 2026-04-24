// ═══════════════════════════════════════════════════
//  FILTERS
// ═══════════════════════════════════════════════════
function filterGenre(genre) {
  activeGenre = genre; currentAlbumPage = 1;
  updateFilterPills();
  renderCollection();
}
function filterCountry(country) {
  activeCountry = country; currentAlbumPage = 1;
  updateFilterPills();
  renderCollection();
}
function filterYear(year) {
  activeYear = year; currentAlbumPage = 1;
  if (year !== 'all') activeDecade = 'all';
  updateFilterPills();
  renderCollection();
}
function filterDecade(d) {
  activeDecade = d; currentAlbumPage = 1;
  if (d !== 'all') activeYear = 'all';
  updateFilterPills();
  renderCollection();
}
function applyFilters() { currentAlbumPage = 1; renderCollection(); }
function clearAllFilters() {
  activeGenre = 'all'; activeCountry = 'all'; activeYear = 'all'; activeDecade = 'all';
  showOnlyFavs = false;
  document.getElementById('favPill')?.classList.remove('active');
  currentAlbumPage = 1;
  updateFilterPills();
  renderCollection();
  closeFPanels();
}

// ── Sort Pills ──
const SORT_OPTIONS = [
  { v: 'rank-desc', l: 'Descobrir' },
  { v: 'rank',      l: 'Ranking ↑' },
  { v: 'title',     l: 'Título A→Z' },
  { v: 'artist',    l: 'Artista A→Z' },
  { v: 'year',      l: 'Ano' },
  { v: 'genre',     l: 'Gênero' },
  { v: 'country',   l: 'País' },
];
function renderSortPills() {
  const z = document.getElementById('sortZone');
  if (!z) return;
  z.innerHTML = `<span class="sort-lbl">Ordenar</span>` +
    SORT_OPTIONS.map(o =>
      `<button class="spill${sortBy===o.v?' active':''}" onclick="setSortPill('${o.v}')">${o.l}</button>`
    ).join('');
}
function setSortPill(v) { sortBy = v; currentAlbumPage = 1; renderSortPills(); renderCollection(); }

// ── Filter Pills state ──
function updateFilterPills() {
  const set = (id, lblId, val, placeholder) => {
    const btn = document.getElementById(id);
    const lbl = document.getElementById(lblId);
    if (!btn || !lbl) return;
    lbl.textContent = val === 'all' ? placeholder : val;
    btn.classList.toggle('has-val', val !== 'all');
  };
  set('fpillGenre',   'fpill-genre-lbl',   activeGenre,   'Gênero');
  set('fpillCountry', 'fpill-country-lbl', activeCountry, 'País');
  set('fpillDecade',  'fpill-decade-lbl',  activeDecade === 'all' ? 'all' : activeDecade + 's', 'Década');
  set('fpillYear',    'fpill-year-lbl',    activeYear,    'Ano');
  const hasAny = activeGenre !== 'all' || activeCountry !== 'all' || activeYear !== 'all' || activeDecade !== 'all';
  const cl = document.getElementById('fpillClear');
  if (cl) cl.style.display = hasAny ? '' : 'none';
}

// ── Filter Panels ──
let activeFPanel = null;
function toggleFPanel(panelId, btnEl) {
  if (activeFPanel && activeFPanel !== panelId) closeFPanels();
  const panel = document.getElementById(panelId);
  if (!panel) return;
  if (panel.classList.contains('open')) { closeFPanels(); return; }
  // Position below button
  const rect = btnEl.getBoundingClientRect();
  panel.style.top  = (rect.bottom + 5) + 'px';
  panel.style.left = Math.min(rect.left, window.innerWidth - 250) + 'px';
  panel.classList.add('open');
  activeFPanel = panelId;
  populateFPanel(panelId);
  setTimeout(() => panel.querySelector('input')?.focus(), 50);
}
function closeFPanels() {
  if (activeFPanel) { document.getElementById(activeFPanel)?.classList.remove('open'); activeFPanel = null; }
}
document.addEventListener('click', e => {
  if (!e.target.closest('.fpanel') && !e.target.closest('.fpill')) closeFPanels();
});

function fItem(val, label, cnt, isActive, fn) {
  return `<div class="fpanel-item${isActive?' active':''}" onclick="${fn}('${esc2(val)}');closeFPanels()">
    <span>${label}</span>
    ${cnt !== '' ? `<span class="fpanel-item-cnt">${cnt}</span>` : ''}
    ${isActive ? '<span class="fpanel-check">✓</span>' : ''}
  </div>`;
}

function populateFPanel(panelId) {
  if (panelId === 'fpanel-genre') {
    const genres = [...new Set(collection.map(a=>a.genre).filter(Boolean))].sort();
    document.getElementById('fpanel-genre-list').innerHTML =
      fItem('all','Todos os Gêneros','',activeGenre==='all','filterGenre') +
      genres.map(g => fItem(g, g, collection.filter(a=>a.genre===g).length, activeGenre===g, 'filterGenre')).join('');
  } else if (panelId === 'fpanel-country') {
    const cs = [...new Set(collection.map(a=>a.country).filter(c=>c&&c!=='Sem tags'))].sort();
    document.getElementById('fpanel-country-list').innerHTML =
      fItem('all','Todos os Países','',activeCountry==='all','filterCountry') +
      cs.map(c => fItem(c, c, collection.filter(a=>a.country===c).length, activeCountry===c, 'filterCountry')).join('');
  } else if (panelId === 'fpanel-decade') {
    const ds = [...new Set(collection.map(a=>a.year?Math.floor(a.year/10)*10:null).filter(Boolean))].sort();
    document.getElementById('fpanel-decade-list').innerHTML =
      fItem('all','Todas as Décadas','',activeDecade==='all','filterDecade') +
      ds.map(d => fItem(String(d), d+'s', collection.filter(a=>a.year&&Math.floor(a.year/10)*10===d).length, String(activeDecade)===String(d), 'filterDecade')).join('');
  } else if (panelId === 'fpanel-year') {
    const ys = [...new Set(collection.map(a=>a.year).filter(Boolean))].sort((a,b)=>b-a);
    document.getElementById('fpanel-year-list').innerHTML =
      fItem('all','Todos os Anos','',activeYear==='all','filterYear') +
      ys.map(y => fItem(String(y), String(y), collection.filter(a=>a.year===y).length, String(activeYear)===String(y), 'filterYear')).join('');
  }
}

function searchFPanel(inp, panelId) {
  const q = inp.value.toLowerCase();
  document.getElementById(panelId)?.querySelectorAll('.fpanel-item').forEach(el => {
    el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

function getFiltered() {
  let items = [...collection];
  const q = searchQuery.toLowerCase().trim();
  if (q) items = items.filter(a =>
    a.title.toLowerCase().includes(q) ||
    a.artist.toLowerCase().includes(q) ||
    (a.genre||'').toLowerCase().includes(q) ||
    String(a.year||'').includes(q) ||
    (a.country||'').toLowerCase().includes(q)
  );
  if (activeGenre !== 'all')   items = items.filter(a => (a.genre||'').toLowerCase() === activeGenre.toLowerCase());
  if (activeCountry !== 'all') items = items.filter(a => (a.country||'') === activeCountry);
  if (activeYear !== 'all')    items = items.filter(a => String(a.year||'') === String(activeYear));
  if (activeDecade !== 'all') {
    const d = parseInt(activeDecade);
    items = items.filter(a => a.year && Math.floor(a.year/10)*10 === d);
  }
  if (showOnlyFavs) items = items.filter(a => a.fav);
  items.sort((a,b) => {
    if (sortBy==='rank')      return a.rank - b.rank;
    if (sortBy==='rank-desc') return b.rank - a.rank;
    if (sortBy==='title')     return a.title.localeCompare(b.title);
    if (sortBy==='artist')    return a.artist.localeCompare(b.artist);
    if (sortBy==='year')      return (a.year||0) - (b.year||0);
    if (sortBy==='genre')     return (a.genre||'').localeCompare(b.genre||'');
    if (sortBy==='country')   return (a.country||'').localeCompare(b.country||'');
    return 0;
  });
  return items;
}

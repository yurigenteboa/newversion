function _legacyUpdateFilters_unused() {
  // Genre
  const genres = [...new Set(collection.map(a=>a.genre).filter(Boolean))].sort();
  const gSel = document.getElementById('genreFilter');
  if (gSel) {
    const cur = gSel.value;
    gSel.innerHTML = `<option value="all">Todos os Gêneros</option>` +
      genres.map(g=>`<option value="${esc(g)}"${cur===g?' selected':''}>${esc(g)}</option>`).join('');
  }
  // Country
  const countries = [...new Set(collection.map(a=>a.country).filter(c=>c&&c!=='Sem tags'))].sort();
  const cSel = document.getElementById('countryFilter');
  if (cSel) {
    const cur = cSel.value;
    cSel.innerHTML = `<option value="all">Todos os Países</option>` +
      countries.map(c=>`<option value="${esc(c)}"${cur===c?' selected':''}>${esc(c)}</option>`).join('');
  }
  // Year
  const years = [...new Set(collection.map(a=>a.year).filter(Boolean))].sort((a,b)=>b-a);
  const ySel = document.getElementById('yearFilter');
  if (ySel) {
    const cur = ySel.value;
    ySel.innerHTML = `<option value="all">Todos os Anos</option>` +
      years.map(y=>`<option value="${y}"${String(cur)===String(y)?' selected':''}>${y}</option>`).join('');
  }
  // Decade
  const decades = [...new Set(collection.map(a=>a.year?Math.floor(a.year/10)*10:null).filter(Boolean))].sort((a,b)=>a-b);
  const dSel = document.getElementById('decadeFilter');
  if (dSel) {
    const cur = dSel.value;
    dSel.innerHTML = `<option value="all">Todas as Décadas</option>` +
      decades.map(d=>`<option value="${d}"${cur==d?' selected':''}>${d}s</option>`).join('');
  }
}

// ═══════════════════════════════════════════════════
//  WORLD MAP PAGE
// ═══════════════════════════════════════════════════
function buildCountryData() {
  const data = {};
  collection.forEach(a => {
    if (!a.country || a.country==='Sem tags') return;
    const iso = PT_TO_ISO[a.country];
    if (iso) data[iso] = (data[iso]||0)+1;
  });
  return data;
}

function renderMapPage() {
  renderCountryTopBar();
  initOrUpdateMap();
}

function renderCountryTopBar() {
  const barEl = document.getElementById('countryTopBar');
  if (!barEl) return;
  const counts = {};
  collection.forEach(a => {
    if (!a.country || a.country==='Sem tags') return;
    counts[a.country] = (counts[a.country]||0)+1;
  });
  const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,10);
  barEl.innerHTML = top.map(([name, cnt]) => {
    const iso  = PT_TO_ISO[name]||'';
    const flag = COUNTRY_FLAGS[iso]||'🌐';
    return `<div class="country-top-card" onclick="showCountryAlbums('${esc(name)}')" data-country="${esc(name)}">
      <div class="country-top-flag">${flag}</div>
      <div class="country-top-name">${esc(name)}</div>
      <div class="country-top-count">${cnt}</div>
    </div>`;
  }).join('');
}

function initOrUpdateMap() {
  const container = document.getElementById('world-map');
  if (!container) return;

  const countryData = buildCountryData();

  if (mapInstance) {
    try { mapInstance.series.regions[0].setValues(countryData); } catch(e) {}
    return;
  }

  if (typeof jsVectorMap === 'undefined') {
    container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted)">Mapa indisponível offline.<br>Conecte-se à internet para carregar o mapa interativo.</div>';
    return;
  }

  // Cor base do mapa respeitando tema
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const mapBaseFill = isDark ? '#1a1a1a' : '#d8d8d5';
  const mapStroke   = isDark ? '#2a2a2a' : '#bbb';

  try {
    mapInstance = new jsVectorMap({
      selector: '#world-map',
      map: 'world',
      backgroundColor: 'transparent',
      zoomButtons: true,
      zoomOnScroll: true,
      zoomOnScrollSpeed: 2,
      regionStyle: {
        initial:  { fill: mapBaseFill, stroke: mapStroke, strokeWidth: 0.5, fillOpacity: 1 },
        hover:    { fill: '#c82b30', cursor: 'pointer' },
        selected: { fill: '#E8373C' }
      },
      series: {
        regions: [{
          attribute: 'fill',
          values: countryData,
          scale: ['#8a1a1a', '#E8373C'],
          normalizeFunction: 'linear'
        }]
      },
      onRegionTooltipShow(event, tooltip, code) {
        // code vem em maiúsculas do jsvectormap ('US', 'GB', ...)
        const ptName = ISO_TO_PT[code] || code;
        const cnt    = countryData[code] || 0;
        const flag   = COUNTRY_FLAGS[code] || '';
        const label  = cnt === 0 ? 'Nenhum álbum' : `${cnt} álbum${cnt!==1?'s':''}`;
        tooltip.text(`${flag} ${ptName} — ${label}`, true);
      },
      onRegionClick(event, code) {
        const ptName = ISO_TO_PT[code];
        if (ptName) showCountryAlbums(ptName);
      }
    });
  } catch(e) {
    console.warn('Map init error:', e);
  }
}

function showCountryAlbums(countryName) {
  const iso   = PT_TO_ISO[countryName] || '';
  const flag  = COUNTRY_FLAGS[iso] || '🌐';
  const albums = collection.filter(a => a.country === countryName).sort((a,b) => a.rank-b.rank);

  // Update side panel
  document.getElementById('countrySideFlag').textContent  = flag;
  document.getElementById('countrySideName').textContent  = countryName;
  document.getElementById('countrySideCount').textContent = `${albums.length} álbum${albums.length!==1?'s':''}`;

  const emptyEl = document.getElementById('countrySideEmpty');
  const listEl  = document.getElementById('countryAlbumList');
  if (albums.length === 0) {
    emptyEl.style.display = 'block'; listEl.style.display = 'none'; return;
  }
  emptyEl.style.display = 'none'; listEl.style.display = 'block';
  listEl.innerHTML = albums.map(a => {
    const coverEl = a.cover
      ? `<img class="ca-cover" src="${esc(a.cover)}" loading="lazy" onerror="this.style.display='none'">`
      : `<div class="ca-cover-ph">♪</div>`;
    return `<div class="country-album-item" onclick="openAlbum(${a.rank})">
      <span class="ca-rank">#${a.rank}</span>
      ${coverEl}
      <div class="ca-info">
        <div class="ca-title">${esc(a.title)}</div>
        <div class="ca-artist">${esc(a.artist)}</div>
      </div>
    </div>`;
  }).join('');

  // Highlight selected top-bar card
  document.querySelectorAll('.country-top-card').forEach(el => {
    el.classList.toggle('selected', el.dataset.country === countryName);
  });
}

// ═══════════════════════════════════════════════════
//  STREAMING LINKS
// ═══════════════════════════════════════════════════
function streamingLinksHTML(album) {
  const qs  = encodeURIComponent(`${album.artist} ${album.title}`);
  const aE  = encodeURIComponent(album.artist);
  const tE  = encodeURIComponent(album.title);

  const spotifyUrl  = `https://open.spotify.com/search/${qs}`;
  const appleUrl    = album.itunesUrl || `https://music.apple.com/search?term=${qs}`;
  const deezerUrl   = album.deezerUrl || `https://www.deezer.com/search/${qs}`;
  const lastfmUrl   = `https://www.last.fm/music/${aE}/${tE}`;
  const ytUrl       = `https://music.youtube.com/search?q=${qs}`;
  const tidalUrl    = `https://tidal.com/search?q=${qs}`;
  const bandcampUrl = `https://bandcamp.com/search?q=${qs}`;
  const qobuzUrl    = `https://www.qobuz.com/search?q=${qs}`;
  const scUrl       = `https://soundcloud.com/search?q=${qs}`;

  // Ícone via Simple Icons CDN
  const si = (slug, color) =>
    `<img class="streaming-btn-img" src="https://cdn.simpleicons.org/${slug}/${color}" alt="" onerror="this.style.display='none'">`;

  return `<div class="streaming-bar">
    <span class="streaming-label">Ouvir em</span>
    <a href="${spotifyUrl}" target="_blank" rel="noopener" class="streaming-btn spotify">
      ${si('spotify','ffffff')} Spotify
    </a>
    <a href="${appleUrl}" target="_blank" rel="noopener" class="streaming-btn apple">
      ${si('applemusic','ffffff')} Apple Music
    </a>
    <a href="${ytUrl}" target="_blank" rel="noopener" class="streaming-btn youtube">
      ${si('youtubemusic','ffffff')} YT Music
    </a>
    <a href="${deezerUrl}" target="_blank" rel="noopener" class="streaming-btn deezer">
      ${si('deezer','ffffff')} Deezer
    </a>
    <a href="${tidalUrl}" target="_blank" rel="noopener" class="streaming-btn tidal">
      ${si('tidal','ffffff')} Tidal
    </a>
    <a href="${bandcampUrl}" target="_blank" rel="noopener" class="streaming-btn bandcamp">
      ${si('bandcamp','ffffff')} Bandcamp
    </a>
    <a href="${qobuzUrl}" target="_blank" rel="noopener" class="streaming-btn qobuz">
      ${si('qobuz','ffffff')} Qobuz
    </a>
    <a href="${scUrl}" target="_blank" rel="noopener" class="streaming-btn soundcloud">
      ${si('soundcloud','ffffff')} SoundCloud
    </a>
    <a href="${lastfmUrl}" target="_blank" rel="noopener" class="streaming-btn lastfm">
      ${si('lastdotfm','ffffff')} Last.fm
    </a>
  </div>`;
}

// ═══════════════════════════════════════════════════
//  CUSTOM ALBUM TAGS
// ═══════════════════════════════════════════════════
let customAlbumTags = JSON.parse(localStorage.getItem('customAlbumTags') || '{}');
function saveCustomTags() { localStorage.setItem('customAlbumTags', JSON.stringify(customAlbumTags)); }

function addCustomTag(rank, inp) {
  const tag = inp.value.trim().toLowerCase().replace(/\s+/g,'-');
  if (!tag) return;
  if (!customAlbumTags[rank]) customAlbumTags[rank] = [];
  if (customAlbumTags[rank].includes(tag)) { inp.value=''; return; }
  customAlbumTags[rank].push(tag);
  saveCustomTags();
  inp.value = '';
  refreshTagSection(rank);
  toast(`Tag "#${tag}" adicionada!`, 1800);
}

function removeCustomTag(rank, tag) {
  if (!customAlbumTags[rank]) return;
  customAlbumTags[rank] = customAlbumTags[rank].filter(t => t !== tag);
  saveCustomTags();
  refreshTagSection(rank);
}

function refreshTagSection(rank) {
  const sec = document.getElementById('albumTagsSection');
  if (!sec) return;
  const fetched = sec.dataset.fetched ? JSON.parse(sec.dataset.fetched) : [];
  const custom  = customAlbumTags[rank] || [];
  sec.innerHTML = renderTagsHTML(rank, fetched, custom);
}

function renderTagsHTML(rank, fetched, custom) {
  const fetchedHTML = fetched.map(t => `<span class="album-tag-pill">#${esc(t)}</span>`).join('');
  const customHTML  = custom.map(t =>
    `<span class="album-tag-pill custom">#${esc(t)}<span class="tag-del" onclick="removeCustomTag(${rank},'${esc2(t)}')">✕</span></span>`
  ).join('');
  const addForm = `<div class="add-tag-wrap">
    <input class="add-tag-inp" id="addTagInp_${rank}" placeholder="+ tag" maxlength="25"
      onkeydown="if(event.key==='Enter'){event.preventDefault();addCustomTag(${rank},this)}"
      title="Pressione Enter para adicionar">
  </div>`;
  return fetchedHTML + customHTML + addForm;
}

// ═══════════════════════════════════════════════════
//  VINYL / DISCOGS PAGE
// ═══════════════════════════════════════════════════
const DISCOGS_USER   = 'yurigenteboa';
const DISCOGS_PER_PAGE = 100;
let vinylAllReleases  = [];  // todos os registros carregados
let vinylFiltered     = [];  // após filtro/busca
let vinylCurrentPage  = 1;
const VINYL_PAGE_SIZE = 50;  // cards por página na UI
let vinylLoaded       = false;

async function initVinylPage() {
  if (vinylLoaded) { renderVinylGrid(); return; }
  const grid = document.getElementById('vinylGrid');
  if (grid) grid.innerHTML = `<div class="vinyl-loading"><div class="spinner"></div> Carregando coleção do Discogs…</div>`;
  await fetchAllDiscogsReleases();
}

async function fetchAllDiscogsReleases() {
  vinylAllReleases = [];
  try {
    // Busca página 1 para saber total
    const first = await fetchDiscogsPage(1);
    if (!first) throw new Error('Sem resposta');
    const totalPages = first.pagination?.pages || 1;
    const totalItems = first.pagination?.items  || 0;
    vinylAllReleases = first.releases || [];

    // Atualizar badge com total real
    const badge = document.getElementById('vinylTotalBadge');
    if (badge) badge.textContent = totalItems;

    // Buscar páginas restantes em paralelo (máx 5 simultâneas)
    if (totalPages > 1) {
      const pageNums = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
      // Lotes de 5 para não sobrecarregar a API
      for (let i = 0; i < pageNums.length; i += 5) {
        const batch = pageNums.slice(i, i + 5);
        const results = await Promise.allSettled(batch.map(p => fetchDiscogsPage(p)));
        results.forEach(r => {
          if (r.status === 'fulfilled' && r.value?.releases) {
            vinylAllReleases.push(...r.value.releases);
          }
        });
        renderVinylGrid(); // atualiza parcialmente enquanto carrega
      }
    }

    vinylLoaded = true;
    vinylFiltered = [...vinylAllReleases];
    // Cache vinyl data for cross-reference in album modal
    try { localStorage.setItem('discogsVinylCache', JSON.stringify(vinylAllReleases)); } catch(e) {}
    renderVinylGrid();
  } catch(e) {
    const grid = document.getElementById('vinylGrid');
    if (grid) grid.innerHTML = `<div class="vinyl-error">
      <div style="font-size:32px;margin-bottom:12px">💿</div>
      <p>Não foi possível carregar a coleção do Discogs.</p>
      <p style="margin-top:8px;font-size:12px">A API pública pode estar temporariamente indisponível.</p>
      <a href="https://www.discogs.com/pt_BR/user/${DISCOGS_USER}/collection" target="_blank"
         style="display:inline-block;margin-top:14px;color:var(--accent);font-weight:700;font-size:13px">
        Ver coleção no Discogs ↗
      </a>
    </div>`;
  }
}

async function fetchDiscogsPage(page) {
  const url = `https://api.discogs.com/users/${DISCOGS_USER}/collection/folders/0/releases`
    + `?sort=added&sort_order=desc&per_page=${DISCOGS_PER_PAGE}&page=${page}`;
  const r = await fetch(url, {
    headers: { 'User-Agent': 'AlbumCollection/1.0 +https://github.com/personal' },
    signal: AbortSignal.timeout(12000),
  });
  if (!r.ok) return null;
  return r.json();
}

function filterVinyl(query) {
  const q      = (query ?? document.getElementById('vinylSearch')?.value ?? '').toLowerCase().trim();
  const fmt    = document.getElementById('vinylFormatFilter')?.value || '';
  const sort   = document.getElementById('vinylSortSel')?.value || 'added';

  let list = vinylAllReleases.filter(r => {
    const bi = r.basic_information;
    const matchQ = !q ||
      bi.title?.toLowerCase().includes(q) ||
      bi.artists?.some(a => a.name?.toLowerCase().includes(q));
    const matchF = !fmt || bi.formats?.some(f => f.name === fmt);
    return matchQ && matchF;
  });

  if (sort === 'title')  list.sort((a,b) => (a.basic_information.title||'').localeCompare(b.basic_information.title||''));
  if (sort === 'artist') list.sort((a,b) => (a.basic_information.artists?.[0]?.name||'').localeCompare(b.basic_information.artists?.[0]?.name||''));
  if (sort === 'year')   list.sort((a,b) => (b.basic_information.year||0) - (a.basic_information.year||0));
  // 'added' mantém a ordem original (sort_order=desc da API)

  vinylFiltered = list;
  vinylCurrentPage = 1;
  renderVinylGrid();
}

function renderVinylGrid() {
  const grid = document.getElementById('vinylGrid');
  if (!grid) return;

  const source = vinylFiltered.length || vinylAllReleases.length === 0
    ? vinylFiltered : vinylAllReleases;

  const totalPages = Math.max(1, Math.ceil(source.length / VINYL_PAGE_SIZE));
  if (vinylCurrentPage > totalPages) vinylCurrentPage = totalPages;
  const start = (vinylCurrentPage - 1) * VINYL_PAGE_SIZE;
  const page  = source.slice(start, start + VINYL_PAGE_SIZE);

  if (!source.length) {
    grid.innerHTML = `<div class="vinyl-error">Nenhum disco encontrado.</div>`;
    document.getElementById('vinylPagBar').innerHTML = '';
    return;
  }

  grid.innerHTML = page.map(r => {
    const bi      = r.basic_information;
    const artist  = bi.artists?.map(a => a.name.replace(/ \(\d+\)$/, '')).join(', ') || '';
    const title   = bi.title || '';
    const year    = bi.year  || '';
    const fmt     = bi.formats?.[0]?.name || '';
    const desc    = bi.formats?.[0]?.descriptions?.join(', ') || '';
    const thumb   = bi.cover_image || bi.thumb || '';
    const url     = `https://www.discogs.com/release/${r.id}`;
    const fmtEmoji = fmt === 'Vinyl' ? '💿' : fmt === 'CD' ? '📀' : fmt === 'Cassette' ? '📼' : '🎵';
    const coverEl  = thumb
      ? `<img class="vinyl-cover" src="${esc(thumb)}" loading="lazy" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      : '';
    const phEl = `<div class="vinyl-cover-ph" ${thumb ? 'style="display:none"' : ''}>${fmtEmoji}</div>`;
    const vinylTitle = title.toLowerCase();
    const inCollection = collection.some(a =>
      a.title.toLowerCase().includes(vinylTitle.slice(0,12)) ||
      vinylTitle.includes(a.title.toLowerCase().slice(0,12))
    );
    const collBadge = inCollection ? `<div style="position:absolute;top:4px;right:4px;background:var(--accent);color:#fff;font-size:9px;padding:1px 5px;border-radius:2px;font-weight:700">TOP 1000</div>` : '';
    return `<a class="vinyl-card" href="${url}" target="_blank" rel="noopener">
      <div class="vinyl-cover-wrap" style="position:relative">
        ${coverEl}${phEl}
        ${fmt ? `<span class="vinyl-format-badge">${esc(fmt)}</span>` : ''}
        ${collBadge}
      </div>
      <div class="vinyl-info">
        <div class="vinyl-artist">${esc(artist)}</div>
        <div class="vinyl-title">${esc(title)}</div>
        <div class="vinyl-meta">${year ? `<span>${year}</span>` : ''}${desc ? `<span>·</span><span>${esc(desc)}</span>` : ''}</div>
      </div>
    </a>`;
  }).join('');

  // Paginação
  renderVinylPagination(source.length, totalPages);
}

function renderVinylPagination(total, totalPages) {
  const bar = document.getElementById('vinylPagBar');
  if (!bar) return;
  if (totalPages <= 1) { bar.innerHTML = ''; return; }
  const start = (vinylCurrentPage - 1) * VINYL_PAGE_SIZE + 1;
  const end   = Math.min(vinylCurrentPage * VINYL_PAGE_SIZE, total);
  const pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (vinylCurrentPage > 3) pages.push('…');
    for (let i = Math.max(2, vinylCurrentPage - 1); i <= Math.min(totalPages - 1, vinylCurrentPage + 1); i++) pages.push(i);
    if (vinylCurrentPage < totalPages - 2) pages.push('…');
    pages.push(totalPages);
  }
  bar.innerHTML = `<div class="pagination">
    <span class="pag-info">${start}–${end} de ${total} discos</span>
    <div class="pag-pages">
      <button class="pag-btn" ${vinylCurrentPage===1?'disabled':''} onclick="goToVinylPage(${vinylCurrentPage-1})">←</button>
      ${pages.map(p => p==='…'
        ? `<span class="pag-ellipsis">…</span>`
        : `<button class="pag-btn${p===vinylCurrentPage?' active':''}" onclick="goToVinylPage(${p})">${p}</button>`
      ).join('')}
      <button class="pag-btn" ${vinylCurrentPage===totalPages?'disabled':''} onclick="goToVinylPage(${vinylCurrentPage+1})">→</button>
    </div>
  </div>`;
}

function goToVinylPage(p) {
  vinylCurrentPage = p;
  renderVinylGrid();
  document.getElementById('page-vinyl')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ═══════════════════════════════════════════════════
//  FRIENDS PAGE
// ═══════════════════════════════════════════════════
const FRIENDS_DATA = [
  { name: 'Vi Antunes',  lastfm: 'vitaantunes',  rym: 'vitantunes'   },
  { name: 'Vinilmac',    lastfm: 'vinilmac',      rym: null           },
  { name: 'Andre Sevira',lastfm: 'SeviPig',       rym: 'sososevi'     },
  { name: 'Gu Sales',    lastfm: null,             rym: 'grrstavo'     },
  { name: 'Sanchez',     lastfm: 'olarcomovai',   rym: null           },
  { name: 'Vic Piazza',  lastfm: 'vicpiazza',     rym: null           },
  { name: 'Heisenbele',  lastfm: 'heisenbele',    rym: null           },
  { name: 'Bea Dantas',  lastfm: 'blodewed',      rym: 'beatrizdantxs'},
  { name: 'Mari Troc',   lastfm: 'birkinmjane',   rym: 'marianatroc'  },
  { name: 'Harumi',      lastfm: 'the_harumi',    rym: null           },
  { name: 'Maya',        lastfm: 'rmayaliz',      rym: null           },
];


function renderFriendsPage() {
  const grid = document.getElementById('friendsGrid');
  if (!grid) return;
  grid.innerHTML = FRIENDS_DATA.map(f => {
    const lastfmBtn = f.lastfm
      ? `<a class="friend-link" href="https://www.last.fm/user/${f.lastfm}" target="_blank" rel="noopener">
           <img src="https://cdn.simpleicons.org/lastdotfm/888888" width="11" height="11" alt="" onerror="this.style.display='none'"> Last.fm
         </a>` : '';
    const rymBtn = f.rym
      ? `<a class="friend-link" href="https://rateyourmusic.com/~${f.rym}" target="_blank" rel="noopener">
           <img src="https://cdn.simpleicons.org/sonemic/888888" width="11" height="11" alt="" onerror="this.style.display='none'"> RYM
         </a>` : '';
    return `<div class="friend-card" id="fc-${esc(f.lastfm||f.name)}">
      <div style="flex:1">
        <div class="friend-name">${esc(f.name)}</div>
        <div class="friend-scrobbles" id="scrobbles-${esc(f.lastfm||f.name)}"></div>
      </div>
      <div class="friend-links">${lastfmBtn}${rymBtn}</div>
    </div>`;
  }).join('');

  // Fetch recent scrobbles if API key is available
  const key = localStorage.getItem('lastfmApiKey');
  if (key) {
    FRIENDS_DATA.forEach(f => {
      if (!f.lastfm) return;
      fetchFriendScrobbles(f.lastfm, key);
    });
  }
}

async function fetchFriendScrobbles(lastfmUser, key) {
  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(lastfmUser)}&api_key=${encodeURIComponent(key)}&format=json&limit=3`;
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return;
    const d = await r.json();
    const tracks = (d.recenttracks?.track || []).slice(0, 3);
    const el = document.getElementById(`scrobbles-${lastfmUser}`);
    if (!el || !tracks.length) return;
    el.innerHTML = tracks.map(t => {
      const nowPlaying = t['@attr']?.nowplaying === 'true';
      const name = `${t.artist?.['#text'] || ''} — ${t.name || ''}`;
      return `<span class="friend-scrobble-track${nowPlaying?' now-playing':''}">${nowPlaying?'▶ ':''}${esc(name)}</span>`;
    }).join('');
  } catch(e) {}
}

// ═══════════════════════════════════════════════════
//  RECS PAGE
// ═══════════════════════════════════════════════════
const RECS_DATA = [
  {
    name: '300noise',
    desc: 'Portal de música independente com resenhas, entrevistas e descobertas.',
    site: 'https://www.300noise.com.br/',
    insta: 'https://www.instagram.com/300noise/',
    logo: 'https://www.300noise.com.br/favicon.ico',
    emoji: '📰'
  },
  {
    name: 'The Music Newsletter',
    desc: 'Newsletter semanal com as melhores recomendações e análises musicais.',
    site: 'https://themusicnewsletter.substack.com/',
    insta: 'https://www.instagram.com/themusicnewsletter/',
    logo: null,
    emoji: '📬'
  },
  {
    name: 'Polvo Manco',
    desc: 'Conteúdo criativo sobre música com uma perspectiva única.',
    site: null,
    insta: 'https://www.instagram.com/polvomanco/',
    logo: null,
    emoji: '🐙'
  },
  {
    name: 'Hominis Canidae',
    desc: 'Reflexões profundas sobre música, arte e cultura sonora.',
    site: 'https://www.hominiscanidae.org/',
    insta: 'https://www.instagram.com/hominiscanidae/',
    logo: 'https://www.hominiscanidae.org/favicon.ico',
    emoji: '🐺'
  },
];

function renderRecsPage() {
  const grid = document.getElementById('recsGrid');
  if (!grid) return;
  grid.innerHTML = RECS_DATA.map(r => {
    const logoEl = r.logo
      ? `<img src="${r.logo}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" style="width:100%;height:100%;object-fit:contain;border-radius:11px"><span style="display:none;align-items:center;justify-content:center;width:100%;height:100%;font-size:22px">${r.emoji}</span>`
      : `<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:22px">${r.emoji}</span>`;
    const siteBtn = r.site
      ? `<a class="rec-link" href="${r.site}" target="_blank" rel="noopener">
           🌐 Site
         </a>` : '';
    const instaBtn = r.insta
      ? `<a class="rec-link" href="${r.insta}" target="_blank" rel="noopener">
           <img src="https://cdn.simpleicons.org/instagram/888888" width="11" height="11" alt="" onerror="this.style.display='none'"> Instagram
         </a>` : '';
    return `<div class="rec-card">
      <div class="rec-card-header">
        <div class="rec-logo">${logoEl}</div>
        <div class="rec-info">
          <div class="rec-name">${esc(r.name)}</div>
          <div class="rec-desc">${esc(r.desc)}</div>
        </div>
      </div>
      <div class="rec-links">${siteBtn}${instaBtn}</div>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════
//  ABOUT PAGE
// ═══════════════════════════════════════════════════
function renderAboutPage() {
  // Stats dinâmicas
  const n       = collection.length;
  const artists = new Set(collection.map(a=>a.artist)).size;
  const genres  = new Set(collection.map(a=>a.genre).filter(Boolean)).size;
  const countries = new Set(collection.map(a=>a.country).filter(c=>c&&c!=='Sem tags')).size;
  const favs    = collection.filter(a=>a.fav).length;
  const years   = collection.map(a=>a.year).filter(Boolean);
  const decades = new Set(years.map(y=>Math.floor(y/10)*10)).size;

  const sg = document.getElementById('aboutStatsGrid');
  if (sg) sg.innerHTML = [
    ['Álbuns na lista', n],
    ['Artistas únicos', artists],
    ['Gêneros musicais', genres],
    ['Países', countries],
    ['Décadas', decades],
    ['Favoritados ♥', favs],
  ].map(([l,v])=>`<div class="about-stat"><div class="about-stat-num">${v}</div><div class="about-stat-lbl">${l}</div></div>`).join('');

  // Top 10
  const top10El = document.getElementById('aboutTop10Grid');
  if (top10El) {
    const top = collection.filter(a=>a.rank<=10).sort((a,b)=>a.rank-b.rank);
    top10El.innerHTML = top.map(a => {
      const img = a.cover
        ? `<img class="about-fav-cover" src="${esc(a.cover)}" loading="lazy" onerror="this.style.display='none'">`
        : `<div class="about-fav-cover-ph">♪</div>`;
      return `<div class="about-fav-card" onclick="openAlbum(${a.rank})">
        ${img}
        <div class="about-fav-info">
          <div class="about-fav-rank">#${a.rank}</div>
          <div class="about-fav-title">${esc(a.title)}</div>
          <div class="about-fav-artist">${esc(a.artist)}</div>
        </div>
      </div>`;
    }).join('');
  }

  // Gêneros
  const genreCount = {};
  collection.forEach(a=>{ if(a.genre) genreCount[a.genre]=(genreCount[a.genre]||0)+1; });
  const sortedG = Object.entries(genreCount).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const maxG = sortedG[0]?.[1]||1;
  const gBars = document.getElementById('aboutGenreBars');
  if (gBars) gBars.innerHTML = sortedG.map(([g,cnt])=>`
    <div class="genre-bar-item">
      <div class="genre-bar-label"><span>${esc(g)}</span><span class="genre-bar-count">${cnt}</span></div>
      <div class="genre-bar-track"><div class="genre-bar-fill" style="width:${(cnt/maxG)*100}%"></div></div>
    </div>`).join('');

  // Países
  const countryCounts = {};
  collection.forEach(a=>{ if(a.country&&a.country!=='Sem tags') countryCounts[a.country]=(countryCounts[a.country]||0)+1; });
  const topCountries = Object.entries(countryCounts).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const cBar = document.getElementById('aboutCountryBar');
  if (cBar) cBar.innerHTML = topCountries.map(([name,cnt]) => {
    const iso  = PT_TO_ISO[name]||'';
    const flag = COUNTRY_FLAGS[iso]||'🌐';
    return `<div class="country-top-card" onclick="navigate('map');setTimeout(()=>showCountryAlbums('${esc2(name)}'),300)">
      <div class="country-top-flag">${flag}</div>
      <div class="country-top-name">${esc(name)}</div>
      <div class="country-top-count">${cnt}</div>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════
//  QUIZ
// ═══════════════════════════════════════════════════
let quizState = null;

function startQuiz() {
  const pool = collection.filter(a => a.cover);
  if (pool.length < 4) { document.getElementById('quizContent').innerHTML = '<p style="color:var(--muted)">Coleção insuficiente para o quiz.</p>'; return; }
  const correct = pool[Math.floor(Math.random() * pool.length)];
  const wrong = pool.filter(a => a.rank !== correct.rank).sort(() => Math.random()-0.5).slice(0,3);
  const choices = [...wrong, correct].sort(() => Math.random()-0.5);
  quizState = { correct, choices, score: quizState?.score || 0, total: quizState?.total || 0 };
  renderQuiz();
}

function renderQuiz() {
  const el = document.getElementById('quizContent');
  if (!el) return;
  if (!quizState) { startQuiz(); return; }
  const { correct, choices, score, total } = quizState;
  el.innerHTML = `
    <div style="text-align:center;margin-bottom:20px">
      <img src="${esc(correct.cover)}" alt="" style="width:220px;height:220px;object-fit:cover;border-radius:4px;box-shadow:0 8px 32px rgba(0,0,0,0.4)">
    </div>
    <p style="text-align:center;color:var(--muted);font-size:13px;margin-bottom:16px">Qual é este álbum?</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">
      ${choices.map(c => `
        <button onclick="answerQuiz(${c.rank})" style="background:var(--surface2);border:1px solid var(--border2);border-radius:4px;padding:12px 14px;cursor:pointer;text-align:left;transition:all 0.15s;color:var(--text)" onmouseenter="this.style.background='var(--surface3)'" onmouseleave="this.style.background='var(--surface2)'" id="quiz-choice-${c.rank}">
          <div style="font-weight:600;font-size:13px">${esc(c.title)}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px">${esc(c.artist)}</div>
        </button>
      `).join('')}
    </div>
    <div style="text-align:center;color:var(--muted);font-size:13px">Pontuação: <strong style="color:var(--text)">${score}</strong> / ${total}</div>
  `;
}

function answerQuiz(rank) {
  if (!quizState) return;
  const { correct, choices } = quizState;
  const isCorrect = rank === correct.rank;
  quizState.total++;
  if (isCorrect) quizState.score++;
  choices.forEach(c => {
    const btn = document.getElementById('quiz-choice-' + c.rank);
    if (!btn) return;
    btn.onclick = null;
    if (c.rank === correct.rank) { btn.style.background = 'rgba(6,214,160,0.18)'; btn.style.borderColor = '#06D6A0'; }
    else if (c.rank === rank) { btn.style.background = 'rgba(232,55,60,0.18)'; btn.style.borderColor = 'var(--accent)'; }
    btn.style.cursor = 'default';
    btn.onmouseenter = null; btn.onmouseleave = null;
  });
  const el = document.getElementById('quizContent');
  // Update score display
  el.querySelectorAll('div').forEach(d => { if (d.innerHTML && d.innerHTML.includes('Pontuação:')) d.innerHTML = `Pontuação: <strong style="color:var(--text)">${quizState.score}</strong> / ${quizState.total}`; });
  const next = document.createElement('div');
  next.style.cssText = 'text-align:center;margin-top:16px';
  next.innerHTML = `
    <p style="font-size:14px;margin-bottom:12px;color:${isCorrect?'#06D6A0':'var(--accent)'}">${isCorrect ? '✓ Correto!' : `✗ Era <strong>${esc(correct.artist)} — ${esc(correct.title)}</strong>`}</p>
    <button onclick="startQuiz()" style="background:var(--accent);color:#fff;border:none;border-radius:4px;padding:10px 24px;cursor:pointer;font-size:14px;font-weight:600">Próxima →</button>
    <button onclick="quizState={score:0,total:0};startQuiz()" style="background:var(--surface2);color:var(--text2);border:1px solid var(--border2);border-radius:4px;padding:10px 18px;cursor:pointer;font-size:14px;margin-left:8px">Reiniciar</button>
  `;
  el.appendChild(next);
}

// ═══════════════════════════════════════════════════
//  TIMELINE
// ═══════════════════════════════════════════════════
function renderTimeline() {
  const el = document.getElementById('timelineContent');
  if (!el) return;
  const byYear = {};
  collection.forEach(a => {
    if (!a.year) return;
    if (!byYear[a.year]) byYear[a.year] = [];
    byYear[a.year].push(a);
  });
  const years = Object.keys(byYear).map(Number).sort((a,b) => a-b);
  el.innerHTML = years.map(y => `
    <div class="timeline-year">
      <div class="timeline-year-label">${y} <span style="font-size:13px;font-weight:400;color:var(--muted)">(${byYear[y].length} álbum${byYear[y].length>1?'s':''})</span></div>
      <div class="timeline-row">
        ${byYear[y].sort((a,b)=>a.rank-b.rank).map(a => `
          <div class="timeline-card" onclick="openAlbum(${a.rank})" title="${esc(a.artist)} — ${esc(a.title)}">
            ${a.cover ? `<img src="${esc(a.cover)}" alt="" loading="lazy">` : `<div style="width:90px;height:90px;background:var(--surface2);border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:24px">♪</div>`}
            <div class="timeline-card-title">${esc(a.title)}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

// ── SHOWS DATA ──────────────────────────────────────────────────────────────
function parseStars(s){
  if(!s)return{rating:0,elite:false};
  const elite=s.includes('.');
  const count=(s.match(/★/g)||[]).length;
  return{rating:count,elite};
}
const SHOWS_RAW=[
["17/05/2014","★☆☆☆☆","Golpe de Estado","Virada Cultural/Av. São João"],
["17/05/2014","★★☆☆☆","Uriah Heep","Virada Cultural/Av. São João"],
["18/05/2014","★★★★☆","Mark Farner of Grand Funk Railroad","Virada Cultural/Av. São João"],
["18/05/2014","★★★☆☆","Os Autoramas (part. Lafayette & B Negão)","Virada Cultural/Lgo. Do Arouche"],
["18/05/2014","★★☆☆☆","Secret Chiefs 3","Virada Cultural/Av. São João"],
["29/08/2014","★☆☆☆☆","Capital Inicial","Expo Mogi/Pro-Hiper Mogilar"],
["14/09/2014","★☆☆☆☆","General Bonimores","Samsung e-festival/Auditório Ibirapuera (externo)"],
["14/09/2014","★★★★☆","Gilberto Gil","Samsung e-festival/Auditório Ibirapuera (externo)"],
["18/04/2015","★★★☆☆","Eleven Strings","Colinas Rock Festival/Praça dos Remédios"],
["18/04/2015","★★☆☆☆","Groovy","Colinas Rock Festival/Praça dos Remédios"],
["19/04/2015","★★★★☆","Pastor Rottweiler","Colinas Rock Festival/Praça Matriz"],
["21/06/2015","★★★★☆","Boogarins","Virada Cultural/Luz"],
["21/06/2015","★★★☆☆","Metá Metá","Virada Cultural/Luz"],
["21/06/2015","★★★★☆","Nando Reis","Virada Cultural/Júlio Prestes"],
["30/08/2015","★★☆☆☆","Nando Reis","Expo Mogi/Pro-Hiper Mogilar"],
["25/09/2015","★★★★☆","Carne Doce","MCI/Lgo. Sanfran"],
["25/09/2015","★★☆☆☆","Hellbenders","MCI/Lgo. Sanfran"],
["25/09/2015","★★★★☆","O Terno & Boogarins","MCI/Lgo. Sanfran"],
["21/11/2015","★☆☆☆☆","Jovem Palerosi (dj set)","Balaclava Fest/Audio"],
["21/11/2015",".★★★★★.","Mac DeMarco","Balaclava Fest/Audio"],
["21/11/2015","★★★☆☆","Mahmed","Balaclava Fest/Audio"],
["21/11/2015","★★☆☆☆","Séculos Apaixonados","Balaclava Fest/Audio"],
["21/11/2015","★★★☆☆","Terno Rei","Balaclava Fest/Audio"],
["11/12/2015",".★★★★★.","David Gilmour","Rattle That Lock World Tour/Allianz Parque"],
["24/01/2016","★★☆☆☆","Maurício Nóia & Berna and The Gangsta's","LaLounge Chama/Associação Cultural Cecília"],
["12/03/2016","★★★☆☆","A-Trak","Lollapalooza Brasil/Perry's Stage"],
["12/03/2016","★★★☆☆","Bad Religion","Lollapalooza Brasil/Skol Stage"],
["12/03/2016","★★★★☆","Eagles of Death Metal","Lollapalooza Brasil/Onix Stage"],
["12/03/2016","★★☆☆☆","Eminem","Lollapalooza Brasil/Skol Stage"],
["12/03/2016",".★★★★★.","Mumford & Sons","Lollapalooza Brasil/Onix Stage"],
["12/03/2016",".★★★★★.","Tame Impala","Lollapalooza Brasil/Skol Stage"],
["12/03/2016","★★★☆☆","Of Monsters and Men","Lollapalooza Brasil/Onix Stage"],
["12/03/2016","★★★☆☆","Vintage Trouble","Lollapalooza Brasil/AXE Stage"],
["23/04/2016","★★★☆☆","A Herdade","Colinas Rock Festival/Praça dos Remédios"],
["23/04/2016","★★★☆☆","A Prole dos 3 Poderes","Colinas Rock Festival/Praça dos Remédios"],
["23/04/2016","★★★☆☆","Devonts","Colinas Rock Festival/Praça dos Remédios"],
["24/04/2016","★★★☆☆","Some Cover of Wonderful (Grand Funk cover)","Colinas Rock Festival/Praça Matriz"],
["26/04/2016","★★★★★","Carne Doce","Prata da Casa/SESC Pompéia"],
["10/05/2016","★★★☆☆","Lucy Rose","House of Bubbles"],
["15/05/2016","★★★★☆","Baleia","Festival Path/Praça Prof. Resende Puech"],
["15/05/2016","★★★★☆","Maglore","Festival Path/Praça Prof. Resende Puech"],
["22/05/2016","★★★☆☆","BIKE","Virada Cultural/Beneficência Portuguesa"],
["22/05/2016","★★★☆☆","Cidadão Instigado","Virada Cultural/Av. Rio Branco"],
["22/05/2016","★☆☆☆☆","Clarice Falcão","Virada Cultural/Av. São João"],
["22/05/2016","★★★★★","Criolo","Virada Cultural/Júlio Prestes"],
["22/05/2016","★★★☆☆","Elba Ramalho","Virada Cultural/Av. São João"],
["22/05/2016","★★★☆☆","Grassmass feat. Thomas Harres","Virada Cultural/Beneficência Portuguesa"],
["22/05/2016","★★★☆☆","MC Bin Laden","Virada Cultural/República"],
["22/05/2016","★☆☆☆☆","Skrotes","Virada Cultural/COPAN"],
["22/05/2016","★★★☆☆","Tributo a Júpiter Maçã","Virada Cultural/Av. Rio Branco"],
["28/05/2016","★★★☆☆","Eleven Strings","Virada Cultural Paulista/Lgo. Do Rosário"],
["29/05/2016","★★★☆☆","Cícero","Virada Cultural Paulista/Ginásio Hugo Ramos"],
["29/05/2016","★★★★☆","Leo Fressato","Virada Cultural Paulista/CCMC"],
["05/06/2016","★★★☆☆","Mahmundi","Mirante 9 de Julho"],
["12/06/2016","★★☆☆☆","Kaiser Chiefs","Festival Cultura Inglesa/Memorial da América Latina"],
["18/06/2016","★★★☆☆","Nuven","Showcase Balaclava/Mirante 9 de Julho"],
["18/06/2016","★★★★☆","Quarto Negro","Showcase Balaclava/Mirante 9 de Julho"],
["16/07/2016","★★★★☆","Quarto Negro","Sintonia do Rock/CCSP Vergueiro"],
["17/07/2016","★★☆☆☆","Surfer Blood","Jim Beam History Fest/Praça Dom José Gaspar"],
["17/07/2016","★★★☆☆","Wild Nothing","Jim Beam History Fest/Praça Dom José Gaspar"],
["09/09/2016","★★★★★","O Terno","Auditório Ibirapuera"],
["17/09/2016","★★★☆☆","Boogarins","SP Urban/Auditório Ibirapuera (externo)"],
["18/09/2016","★★★★☆","Carne Doce","SP Urban/Mirante 9 de Julho"],
["09/10/2016",".★★★★★.","Carne Doce","Festival CRIA/Casa das Caldeiras"],
["09/10/2016","★★★☆☆","FingerFingerrr","Festival CRIA/Casa das Caldeiras"],
["09/10/2016","★★★☆☆","Raça","Festival CRIA/Casa das Caldeiras"],
["01/11/2016","★★☆☆☆","The Outs","Prata da Casa/SESC Pompéia"],
["06/11/2016","★★★★☆","Carne Doce","Secret Festival/Vila São Paulo"],
["06/11/2016","★☆☆☆☆","Charly Coombes","Secret Festival/Vila São Paulo"],
["06/11/2016","★★★☆☆","Mahmundi","Secret Festival/Vila São Paulo"],
["06/11/2016","★★★☆☆","Terno Rei","Secret Festival/Vila São Paulo"],
["06/11/2016","★★★☆☆","TOPS","Secret Festival/Vila São Paulo"],
["10/12/2016","★★★★☆","As Bahias e a Cozinha Mineira","SIM São Paulo/CCSP Vergueiro"],
["10/12/2016","★★☆☆☆","El Efecto","SIM São Paulo/VIC - A Casa Do Centro"],
["10/12/2016","★★★★☆","Francisco el Hombre","SIM São Paulo/VIC - A Casa Do Centro"],
["10/12/2016","★☆☆☆☆","JuanaFé","SIM São Paulo/VIC - A Casa Do Centro"],
["10/12/2016","★★☆☆☆","Liniker & Os Caramelows","Cidadania nas Ruas/Vale do Anhangabaú"],
["10/12/2016","★★★★☆","Rashid","SIM São Paulo/VIC - A Casa Do Centro"],
["10/12/2016","★★★☆☆","Rashid","Cidadania nas Ruas/Vale do Anhangabaú"],
["10/12/2016","★★★☆☆","Tagore","SIM São Paulo/CCSP Vergueiro"],
["10/12/2016","★☆☆☆☆","Tulipa Ruiz","Cidadania nas Ruas/Vale do Anhangabaú"],
["10/12/2016","★★★★☆","Ventre","SIM São Paulo/CCSP Vergueiro"],
["20/01/2017","★★★★☆","Hierofante Púrpura & Ventre","Balaclava Apresenta/CCSP Vergueiro"],
["20/01/2017","★★☆☆☆","Tatá Aeroplano","xxxbórnia de carnaval/Trackers"],
["14/02/2017","★★★★★","Carne Doce","Prata da Casa/SESC Pompéia"],
["14/02/2017","★★★★★","Ventre","Prata da Casa/SESC Pompéia"],
["17/03/2017","★☆☆☆☆","Moxine","xxxbórnia (edição SÊLA)/Trackers"],
["17/03/2017","★★★★☆","PAPISA","xxxbórnia (edição SÊLA)/Trackers"],
["25/03/2017","★★★★★","BaianaSystem","Lollapalooza Brasil/AXE Stage"],
["25/03/2017","★★★★★","Cage the Elephant","Lollapalooza Brasil/Skol Stage"],
["25/03/2017","★★☆☆☆","Glass Animals","Lollapalooza Brasil/Onix Stage"],
["25/03/2017","★★★☆☆","Jaloo","Lollapalooza Brasil/AXE Stage"],
["25/03/2017","★★☆☆☆","The 1975","Lollapalooza Brasil/Onix Stage"],
["25/03/2017","★☆☆☆☆","The Chaismokers","Lollapalooza Brasil/AXE Stage"],
["25/03/2017","★★☆☆☆","The Outs","Lollapalooza Brasil/Onix Stage"],
["25/03/2017",".★★★★★.","The XX","Lollapalooza Brasil/Onix Stage"],
["31/03/2017","★★★★☆","Francisco el Hombre","Cirquito Cultural Paulista/Theatro Vasques"],
["02/04/2017","★★★★★","Carne Doce","CCSP Vergueiro"],
["07/05/2017","★★★★☆","Chico César","Feira Nacional da Reforma Agrária/Pq. Agua Branca"],
["07/05/2017","★★★☆☆","Liniker & Os Caramelows","Feira Nacional da Reforma Agrária/Pq. Agua Branca"],
["20/05/2017","★★☆☆☆","Nômade Orchestra","Virada Cultural/Lgo. Do Arouche"],
["21/05/2017","★★★☆☆","Banda Heroes — Tributo à David Bowie","Virada Cultural/Boulevard São João"],
["21/05/2017","★★★☆☆","Carne Doce","Virada Cultural/São Bento"],
["21/05/2017","★★★☆☆","E A Terra Nunca Me Pareceu Tão Distante","Virada Cultural/Pça. Dom José Gaspar"],
["21/05/2017","★★★★★","Karnak","Virada Cultural/SESC Belenzinho"],
["16/06/2017","★★★☆☆","Séculos Apaixonados","xxxbórnia/Trackers"],
["16/06/2017","★★☆☆☆","The Blank Tapes","xxxbórnia/Trackers"],
["24/06/2017","★★☆☆☆","Atalhos","Dia da Música/Funhouse"],
["24/06/2017","★★★☆☆","E A Terra Nunca Me Pareceu Tão Distante","Dia da Música/Concha Acústica/Santo André"],
["24/06/2017","★★☆☆☆","Mombojó","Dia da Música/Lgo. Da Batata"],
["09/07/2017","★★★☆☆","Baleia","Fest Contrapedal São Paulo/CCSP Vergueiro"],
["09/07/2017","★★★☆☆","Jaloo","Fest Contrapedal São Paulo/CCSP Vergueiro"],
["09/07/2017","★★☆☆☆","Mateo Kingman","Fest Contrapedal São Paulo/CCSP Vergueiro"],
["14/07/2017","★☆☆☆☆","Coronel Pacheco","xxxbórnia/Trackers"],
["14/07/2017","★★★★☆","Giovani Cidreira","xxxbórnia/Trackers"],
["14/07/2017","★★★★☆","Mel Azul","xxxbórnia/Trackers"],
["16/07/2017","★★★☆☆","Francisco el Hombre","Festival de Inverno Mogi/Theatro Vasques"],
["23/07/2017","★★★★★","Boogarins","Centro do Rock/CCSP Vergueiro"],
["23/07/2017","★☆☆☆☆","MQN","Centro do Rock/CCSP Vergueiro"],
["08/09/2017","★★★★★","Dolphinkids","Complexo/Mogi"],
["21/09/2017","★★★☆☆","Alter Bridge","São Paulo Trip/Allianz Parque"],
["21/09/2017","★★☆☆☆","The Cult","São Paulo Trip/Allianz Parque"],
["21/09/2017",".★★★★★.","The Who","São Paulo Trip/Allianz Parque"],
["14/10/2017","★★★★☆","Ventre","Sacola Alternativa/Praça das Artes"],
["20/10/2017","★★★★★","El Toro Fuerte","xxxbórnia/Trackers"],
["20/10/2017","★★☆☆☆","FingerFingerrr","xxxbórnia/Trackers"],
["20/10/2017","★★★★☆","Raça","xxxbórnia/Trackers"],
["15/11/2017","★★★★☆","AlunaGeorge (part. Iza)","Popload Festival/Memorial da América Latina"],
["15/11/2017","★★★★★","Carne Doce","Popload Festival/Memorial da América Latina"],
["15/11/2017","★★★★☆","Daughter","Popload Festival/Memorial da América Latina"],
["15/11/2017","★★★☆☆","Neon Indian","Popload Festival/Memorial da América Latina"],
["15/11/2017",".★★★★★.","Phoenix","Popload Festival/Memorial da América Latina"],
["15/11/2017","★★★★★","PJ Harvey","Popload Festival/Memorial da América Latina"],
["15/11/2017","★★★☆☆","Ventre","Popload Festival/Memorial da América Latina"],
["01/12/2017","★★★★☆","Dolphinkids","Campus 6"],
["01/12/2017","★★★☆☆","Walfredo em Busca da Simbiose","Campus 6"],
["09/12/2017",".★★★★★.","Arcade Fire","Arena Anhembi"],
["09/12/2017","★★☆☆☆","Bomba Estéreo","Arena Anhembi"],
["18/03/2018",".★★★★★.","Carne Doce","Auditório Ibirapuera"],
["22/03/2018",".★★★★★.","LCD Soundsystem","Lollapalooza Brasil/#OnixDay"],
["22/03/2018","★★★★☆","Liam Gallagher","Lollapalooza Brasil/#OnixDay"],
["22/03/2018","★★☆☆☆","Wiz Khalifa","Lollapalooza Brasil/#OnixDay"],
["22/04/2018","★★☆☆☆","Aldo the Band","Soundhearts Festival/Allianz Parque"],
["22/04/2018","★★★★☆","Flying Lotus","Soundhearts Festival/Allianz Parque"],
["22/04/2018","★★★★☆","Junun & The Rajasthan Express","Soundhearts Festival/Allianz Parque"],
["22/04/2018",".★★★★★.","Radiohead","Soundhearts Festival/Allianz Parque"],
["08/05/2018",".★★★★★.","Mogwai","Popload Gig/Tropical Butantã"],
["12/05/2018","★★★★★","Beach Fossils","Aquecimento Balaclava Fest/Fabrique Club"],
["26/05/2018","★★★★★","Boogarins","xxxbórnival/Audio"],
["26/05/2018","★★★★★","Letrux","xxxbórnival/Audio"],
["26/05/2018","★★☆☆☆","MC Carol","xxxbórnival/Audio"],
["26/05/2018","★☆☆☆☆","Tessuto (live set)","xxxbórnival/Audio"],
["26/05/2018","★★★★★","TETO PRETO","xxxbórnival/Audio"],
["26/05/2018","★★★★☆","Vektroid (a.k.a. MÄCINTOSH PLUS)","xxxbórnival/Audio"],
["21/06/2018","★★★★☆","Ombu","Balaclava Apresenta/SESC Avenida Paulista"],
["21/07/2018","★★☆☆☆","Bruna Mendez","Centro do Rock/CCSP Vergueiro"],
["21/07/2018","★★★★★","Carne Doce","Centro do Rock/CCSP Vergueiro"],
["24/08/2018","★★★★☆","Carne Doce","Pardieiro/Cine Joia"],
["24/08/2018","★★★☆☆","GEO","Pardieiro/Cine Joia"],
["16/09/2018","★★☆☆☆","Dom Pescoço","Dezembro Independente/Pq. Botyra"],
["16/09/2018","★★★☆☆","E A Terra Nunca Me Pareceu Tão Distante","Dezembro Independente/Pq. Botyra"],
["16/09/2018","★★☆☆☆","Seamus","Dezembro Independente/Pq. Botyra"],
["10/10/2018",".★★★★★.","Roger Waters","Us + Them Tour/Allianz Parque"],
["13/10/2018","★★★★☆","UBUNTO (dj set)","SP na Rua/Vale do Anhangabaú"],
["10/11/2018","★★★★☆","Helião RZO","Virada Cultural Paulista/Av. Cívica - Mogilar"],
["10/11/2018","★☆☆☆☆","Marcelo Jeneci","Virada Cultural Paulista/Av. Cívica - Mogilar"],
["10/11/2018","★★★☆☆","Queen Tribute Brazil","Virada Cultural Paulista/SESI Mogi das Cruzes"],
["15/11/2018","★★★★☆","At the Drive-In","Popload Festival/Memorial da América Latina"],
["15/11/2018","★★★★★","Blondie","Popload Festival/Memorial da América Latina"],
["15/11/2018","★★★★☆","Death Cab for Cutie","Popload Festival/Memorial da América Latina"],
["15/11/2018",".★★★★★.","Lorde","Popload Festival/Memorial da América Latina"],
["15/11/2018","★★★☆☆","MGMT","Popload Festival/Memorial da América Latina"],
["15/11/2018","★★★☆☆","O Terno & Liniker","Popload Festival/Memorial da América Latina"],
["15/11/2018","★★☆☆☆","Superbanda (Jaloo + Far From Alaska)","Popload Festival/Memorial da América Latina"],
["15/11/2018","★★☆☆☆","Tropkillaz & Céu","Popload Festival/Memorial da América Latina"],
["08/12/2018","★★★☆☆","Dolphinkids","SIM São Paulo/Estúdio Aurora"],
["21/02/2019","★★★☆☆","BRVNKS","Popload Gig/Fabrique"],
["21/02/2019","★★★★★","Courtney Barnett","Popload Gig/Fabrique"],
["31/03/2019","★★★★☆","Carne Doce","SESC Pompéia (externo)"],
["18/05/2019","★★★☆☆","Black Alien","Virada Cultural/São Bento"],
["19/05/2019","★★★★☆","As Bahias e a Cozinha Mineira","Virada Cultural/COPAN"],
["19/05/2019","★★★★☆","Boogarins","Virada Cultural/Av. Rio Branco"],
["19/05/2019","★★★★☆","Chico César","Virada Cultural/Av. São João"],
["19/05/2019","★★★★★","Cidadão Instigado apresentando Pink Floyd","Virada Cultural/SESC 24 de Maio/Teatro"],
["19/05/2019",".★★★★★.","O Grande Encontro","Virada Cultural/Av. São João"],
["19/05/2019","★★☆☆☆","Pabllo Vittar","Virada Cultural/República"],
["27/06/2019","★★★★★","The Jesus and Mary Chain","Popload Gig/Tropical Butantã"],
["12/07/2019","★★☆☆☆","Duda Beat","Festival da Democracia/Ginásio Nilson Nelson"],
["12/07/2019","★☆☆☆☆","Queer Prise","Festival da Democracia/Ginásio Nilson Nelson"],
["30/08/2019","★☆☆☆☆","Carbo","Festa dos Virgens/Overdrive"],
["30/08/2019","★★★☆☆","Violet Soda","Festa dos Virgens/Overdrive"],
["15/11/2019","★★★★★","CSS","Popload Festival/Memorial da América Latina"],
["15/11/2019","★★★★☆","Hot Chip","Popload Festival/Memorial da América Latina"],
["15/11/2019","★★★★☆","Khruangbin","Popload Festival/Memorial da América Latina"],
["15/11/2019","★★★★★","Patti Smith","Popload Festival/Memorial da América Latina"],
["15/11/2019","★★☆☆☆","The Raconteurs","Popload Festival/Memorial da América Latina"],
["15/11/2019","★★★☆☆","Tove Lo","Popload Festival/Memorial da América Latina"],
["01/12/2019","★★★★☆","Karnak","Virada SP São José dos Campos/Parque Vicentina Aranha"],
["07/12/2019",".★★★★★.","Metronomy","Popload Gig/Audio"],
["17/01/2020","★★★★★","(Sandy) Alex G","Balaclava Apresenta/SESC Pompéia"],
["23/02/2020","★★★★★","Cashu (live set)","EnXAME Carnaval/Libero Badaró"],
["24/02/2020","★★★★☆","Gop Tun djs (dj set)","SUPERLOUNGE/Parque Dom Pedro II"],
["26/11/2021","★★★★★","Boogarins","Cine Joia 10 anos/Cine Joia"],
["26/11/2021","★★★☆☆","Edgar","Cine Joia 10 anos/Cine Joia"],
["03/12/2021","★★★★☆","Marcos Valle","SESC Pompéia (teatro)"],
["25/03/2022","★★★★☆","Caribou","Lollapalooza Brasil/Adidas Stage"],
["25/03/2022","★★★☆☆","Marina","Lollapalooza Brasil/Onix Stage"],
["25/03/2022","★★★★☆","Pabllo Vittar","Lollapalooza Brasil/Adidas Stage"],
["25/03/2022","★★★★☆","The Strokes","Lollapalooza Brasil/Onix Stage"],
["25/03/2022","★★★★★","TURNSTILE","Lollapalooza Brasil/Budweiser Stage"],
["31/03/2022","★☆☆☆☆","Gab Ferreira","Balaclava/Audio"],
["31/03/2022","★★★★★","The Drums","Balaclava/Audio"],
["03/04/2022","★★★★★","Boogarins","SESC Vila Mariana"],
["22/04/2022","★★★★☆","Dexter","Espaço das Américas"],
["22/04/2022",".★★★★★.","Racionais MC's","Espaço das Américas"],
["22/04/2022","★★★☆☆","Rincon Sapiência","Espaço das Américas"],
["23/04/2022","★★★☆☆","Gab Ferreira","Balaclava Fest/Central 1926"],
["23/04/2022","★★★★☆","gorduratrans","Balaclava Fest/Central 1926"],
["23/04/2022",".★★★★★.","Lupe de Lupe","Balaclava Fest/Central 1926"],
["23/04/2022","★★★☆☆","Odradek","Balaclava Fest/Central 1926"],
["23/04/2022","★★★★☆","Ombu","Balaclava Fest/Central 1926"],
["24/04/2022","★★★☆☆","Apeles","Balaclava Fest/Central 1926"],
["24/04/2022","★★★★☆","terraplana","Balaclava Fest/Central 1926"],
["28/04/2022","★★★☆☆","Lafetah","Cabaret da Cecília"],
["01/05/2022","★★★★☆","Terno Rei","Cine Joia"],
["01/05/2022","★★☆☆☆","Walfredo em Busca da Simbiose","Cine Joia"],
["07/05/2022","★★★★☆","Boogarins","Ocupação Modernista/Centro Cultural Olido"],
["12/05/2022","★★★★★","Antônio Neves","Noite Coala/Studio SP"],
["12/05/2022","★★★★☆","Sophia Chablau e uma enorme perda de tempo","Noite Coala/Studio SP"],
["13/05/2022","★★★★☆","Amigos do Arnesto","Toca da Capivara"],
["28/05/2022","★★★☆☆","Don L","Virada Cultural/Pça. das Artes"],
["29/05/2022","★★★★☆","Ave Sangria","Virada Cultural/Casa de Cultura Butantã"],
["02/06/2022","★★★★★","Tagua Tagua","SESC Pompéia"],
["05/06/2022","★☆☆☆☆","Mariana Aydar","Festival Pinheiros/Rua dos Pinheiros"],
["25/06/2022","★★★★☆","Hermeto Pascoal","Blues Jazz Festival Brasil/Parque Villa-Lobos"],
["25/06/2022","★★☆☆☆","O Bando Rock & Blues","Blues Jazz Festival Brasil/Parque Villa-Lobos"],
["05/07/2022","★★★★★","KL Jay (dj set)","Fatiado Discos"],
["20/07/2022","★★★★☆","Almir Sater","Revelando SP/Parque da Água Branca"],
["24/07/2022","★★★☆☆","Boogarins","Mês do Rock/Tendal da Lapa"],
["24/07/2022","★★★★☆","Samba do Formiga","KaiA n'Gandaia/KAIA"],
["29/07/2022","★★★★☆","Antiprisma","FFFront"],
["29/07/2022","★★★★☆","Sophia Chablau e uma enorme perda de tempo","SESC Avenida Paulista"],
["04/08/2022","★★★☆☆","Bruno Berle","Noite Coala/Studio SP"],
["11/08/2022","★★★★★","Eiras e Beiras","FFFront"],
["19/08/2022","★★★★☆","Besouro Mulher","Casa Rockambole"],
["19/08/2022","★☆☆☆☆","BRVNKS","Casa Rockambole"],
["19/08/2022","★★☆☆☆","Deb and the Mentals","Casa Rockambole"],
["22/08/2022",".★★★★★.","Rosalía","Espaço das Américas"],
["26/08/2022",".★★★★★.","Milton Nascimento","Espaço das Américas"],
["26/08/2022","★★☆☆☆","Zé Ibarra","Espaço das Américas"],
["28/08/2022",".★★★★★.","Sophia Chablau e uma enorme perda de tempo","Picles"],
["30/08/2022","★★★☆☆","Eliminadorzinho","Centro da Terra"],
["16/09/2022","★★★★★","Djavan","Coala Festival/Memorial da América Latina"],
["16/09/2022","★★★★☆","Gilberto Gil","Coala Festival/Memorial da América Latina"],
["16/09/2022","★★★★★","KL Jay (dj set)","Coala Festival/Memorial da América Latina"],
["18/09/2022","★★★☆☆","Monoclub","Picles"],
["23/09/2022","★☆☆☆☆","Dada Joãozinho & Tripla Chama","Casa Rockambole"],
["23/09/2022","★★★★☆","Eiras e Beiras","Casa Rockambole"],
["09/10/2022","★★★☆☆","Samba do Formiga","KaiA n'Gandaia/KAIA"],
["10/10/2022","★★★★☆","Fernando Catatau & Kiko Dinucci","Centro da Terra"],
["12/10/2022","★★★☆☆","Cat Power","Popload Festival/Centro Esportivo Tietê"],
["12/10/2022","★★★☆☆","Chet Faker","Popload Festival/Centro Esportivo Tietê"],
["12/10/2022","★★★☆☆","Fresno & Pitty","Popload Festival/Centro Esportivo Tietê"],
["12/10/2022","★★★★☆","Jack White","Popload Festival/Centro Esportivo Tietê"],
["12/10/2022","★★★★★","Mu540 (dj set)","Popload Festival/Centro Esportivo Tietê"],
["12/10/2022","★★★★★","Pixies","Popload Festival/Centro Esportivo Tietê"],
["16/10/2022","★★★★★","Orkestra Rumpilezz","Sesc Jazz/SESC Pompéia"],
["17/10/2022","★★★★☆","Fernando Catatau & Juçara Marçal","Centro da Terra"],
["19/10/2022","★★★★☆","Sophia Chablau","Casa Rockambole"],
["22/10/2022","★★★☆☆","Gabriel Reis","Jardim Majestoso"],
["22/10/2022","★★★★★","Miragem","Jardim Majestoso"],
["22/10/2022","★★★★★","Onda Quadrada","Jardim Majestoso"],
["23/10/2022","★★★★★","KOKOROKO","Sesc Jazz/SESC Pompéia"],
["25/10/2022","★★★★☆","Eiras e Beiras","Centro da Terra"],
["01/11/2022","★★★★☆","Ana Frango Elétrico","Primavera na Cidade/Cine Joia"],
["01/11/2022","★☆☆☆☆","BRVNKS","Primavera na Cidade/Cine Joia"],
["01/11/2022","★☆☆☆☆","Gab Ferreira","Primavera na Cidade/Cine Joia"],
["05/11/2022",".★★★★★.","Beach House","Primavera Sound/Palco Primavera"],
["05/11/2022","★★★★☆","Beak>","Primavera Sound/Palco Elo"],
["05/11/2022","★★★★★","Björk","Primavera Sound/Palco Primavera"],
["05/11/2022","★★★★☆","Boy Harsher","Primavera Sound/Palco Elo"],
["05/11/2022","★★★★★","Giovani Cidreira","Primavera Sound/Auditório Barcelona"],
["05/11/2022","★★★☆☆","Helado Negro","Primavera Sound/Palco Beck's"],
["05/11/2022","★★★★★","Mitski","Primavera Sound/Palco Primavera"],
["05/11/2022","★★★★★","Sevdaliza","Primavera Sound/Palco Elo"],
["06/11/2022","★★★★☆","Arca","Primavera Sound/Palco Elo"],
["06/11/2022","★★★★☆","Caroline Polachek","Primavera Sound/Palco Elo"],
["06/11/2022","★★★★☆","Chai","Primavera Sound/Palco Beck's"],
["06/11/2022","★★☆☆☆","Föllakzoid","Primavera Sound/Auditório Barcelona"],
["06/11/2022","★★★★★","Japanese Breakfast","Primavera Sound/Palco Beck's"],
["06/11/2022",".★★★★★.","Jessie Ware","Primavera Sound/Palco Beck's"],
["06/11/2022","★★★★★","Lorde","Primavera Sound/Palco Primavera"],
["06/11/2022","★★★★☆","Phoebe Bridgers","Primavera Sound/Palco Primavera"],
["06/11/2022","★★★☆☆","Selvagem (dj set)","Primavera Sound/Palco Bits"],
["12/11/2022","★★★★★","Shame","Fabrique"],
["26/11/2022","★★★★☆","As Mercenárias","Festival Três pra Um/Associação Cultural Cecília"],
["02/12/2022","★★★★☆","Samuca & a Selva","Mundo Pensante"],
["04/12/2022","★★★★★","Metronomy","Popload Gig/Cine Jóia"],
["11/12/2022","★★★★★","Alvvays","Balaclava Fest/Tokio Marine Hall"],
["11/12/2022","★★★★☆","Crumb","Balaclava Fest/Tokio Marine Hall"],
["11/12/2022","★★★★★","Fleet Foxes","Balaclava Fest/Tokio Marine Hall"],
["11/12/2022","★★★☆☆","Ombu","Balaclava Fest/Tokio Marine Hall"],
["11/01/2023","★★★★★","Lupe de Lupe","Red Star Studios"],
["23/01/2023","★★★★★","Pink Floyd Dream — The Dark Side of the Moon","Belas Artes Sonoriza/Petra Belas Artes"],
["01/02/2023","★★★☆☆","Lauiz","Bar Alto"],
["01/02/2023","★★★★☆","Pelados","Bar Alto"],
["12/02/2023","★★★★★","Giu Nunez (dj set)","Miúda"],
["12/02/2023","★★★★★","Poly Ritmo (dj set)","Miúda"],
["15/02/2023","★★★★☆","Sophia Chablau","Centro da Terra"],
["24/02/2023",".★★★★★.","Boogarins","SESC Pompéia/Teatro"],
["04/03/2023","★★★★★","Goldenloki","Baile Seloki Records/Estúdio Lâmina"],
["04/03/2023","★★★★☆","Irmão Victor","Baile Seloki Records/Estúdio Lâmina"],
["04/03/2023","★★★★☆","Retrato","Baile Seloki Records/Estúdio Lâmina"],
["09/03/2023","★★★★☆","eliminadorzinho + Fernando Motta","Bar Alto"],
["09/03/2023","★★★★★","terraplana","Bar Alto"],
["10/03/2023",".★★★★★.","Marcos Valle & Azymuth","Festival Zunido/SESC Pompéia"],
["12/03/2023",".★★★★★.","terraplana","Fabrique"],
["12/03/2023",".★★★★★.","Deafheaven","Fabrique"],
["23/03/2023","★★☆☆☆","Ludmilla","Budweiser/Shopping Cidade de S. Paulo"],
["24/03/2023","★★★★☆","Modest Mouse","Lollapalooza Brasil/Chevrolet Stage"],
["24/03/2023","★☆☆☆☆","Mother Mother","Lollapalooza Brasil/Budweiser Stage"],
["24/03/2023","★★★☆☆","Conan Gray","Lollapalooza Brasil/Chevrolet Stage"],
["24/03/2023","★★★★★","Kali Uchis","Lollapalooza Brasil/Budweiser Stage"],
["24/03/2023","★★★★★","Billie Eilish","Lollapalooza Brasil/Budweiser Stage"],
["24/03/2023","★★★★☆","Gop Tun djs (dj set)","Gop Tun//CO"],
["24/03/2023",".★★★★★.","Jamie XX","Gop Tun//CO"],
["25/03/2023","★★★☆☆","Wallows","Lollapalooza Brasil/Budweiser Stage"],
["25/03/2023","★★☆☆☆","Jane's Addiction","Lollapalooza Brasil/Chevrolet Stage"],
["25/03/2023","★★★☆☆","Sofi Tukker","Lollapalooza Brasil/Adidas Stage"],
["25/03/2023",".★★★★★.","Tame Impala","Lollapalooza Brasil/Chevrolet Stage"],
["25/03/2023",".★★★★★.","Jamie XX","Lollapalooza Brasil/Perry's Stage"],
["26/03/2023","★★★★☆","Aurora","Lollapalooza Brasil/Chevrolet Stage"],
["26/03/2023","★★★☆☆","Baco Exu do Blues","Lollapalooza Brasil/Adidas Stage"],
["26/03/2023",".★★★★★.","Rosalía","Lollapalooza Brasil/Chevrolet Stage"],
["30/03/2023","★★★★★","Sophia Chablau e uma enorme perda de tempo","Bar Alto"],
["01/04/2023","★★☆☆☆","Applegate","Cine Jóia"],
["01/04/2023","★★★★★","Boogarins","Cine Jóia"],
["07/04/2023","★★★★★","RHR (dj set)","Praça das Artes"],
["07/04/2023",".★★★★★.","Skrillex b2b Jyoty & M.I.A.","Praça das Artes"],
["07/04/2023","★★★★☆","Chico Buarque part. Mônica Salmaso","Tokio Marine Hall"],
["13/04/2023","★★☆☆☆","Test","Bar Alto"],
["13/04/2023","★★★★★","Odradek","Bar Alto"],
["07/05/2023","★★★★★","Pelados","Sesc Avenida Paulista"],
["11/05/2023","★★★★☆","Zeca Baleiro","Feira Nacional da Reforma Agrária/Pq. Agua Branca"],
["12/05/2023","★★★☆☆","Jorge Aragão","Feira Nacional da Reforma Agrária/Pq. Agua Branca"],
["14/05/2023","★★★☆☆","Chico César","Feira Nacional da Reforma Agrária/Pq. Agua Branca"],
["16/05/2023","★★★★☆","Sam Quealy","Fabrique"],
["16/05/2023","★★★★★","La Femme","Fabrique"],
["16/05/2023","★★★★★","Sam Quealy (dj set)","Casa Rockambole"],
["20/05/2023","★★★★☆","Model 500 by Juan Atkins","C6 Fest/Parque do Ibirapuera"],
["20/05/2023","★★★★★","Kraftwerk","C6 Fest/Parque do Ibirapuera"],
["20/05/2023","★★★★★","Underworld","C6 Fest/Parque do Ibirapuera"],
["21/05/2023","★★★★★","Black Country New Road","C6 Fest/Tenda Heineken/Parque do Ibirapuera"],
["21/05/2023","★★★★★","Weyes Blood","C6 Fest/Tenda Heineken/Parque do Ibirapuera"],
["21/05/2023","★★★★★","The War on Drugs","C6 Fest/Tenda Heineken/Parque do Ibirapuera"],
["21/05/2023","★★★★☆","Deekapz","C6 Fest/Parque do Ibirapuera"],
["04/06/2023","★★★★★","Ana Frango Elétrico","SESC Vila Mariana"],
["11/06/2023","★★★★★","Arthur Verocai","MITA Day/Memorial da América Latina"],
["19/06/2023","★★★★☆","terraplana","SESC Carmo"],
["24/06/2023","★★★☆☆","Mu540 (dj set)","Festival Turá/Parque do Ibirapuera"],
["24/06/2023","★★☆☆☆","MC Hariel","Festival Turá/Parque do Ibirapuera"],
["24/06/2023","★★★★☆","Zeca Pagodinho","Festival Turá/Parque do Ibirapuera"],
["24/06/2023","★★★★★","Jorge Ben Jor","Festival Turá/Parque do Ibirapuera"],
["30/06/2023","★★★★★","Pelados","Picles"],
["02/07/2023","★★★★☆","Sophia Chablau e uma enorme perda de tempo","SESC Belenzinho/Teatro"],
["29/07/2023","★★★☆☆","Dramamine","Black Hole SP"],
["31/07/2023","★★★★☆","Hiran","Tranquilo São Paulo/União Fraterna"],
["31/07/2023","★★★☆☆","Iara Rennó","Tranquilo São Paulo/União Fraterna"],
["31/07/2023","★★★★☆","Jards Macalé","Tranquilo São Paulo/União Fraterna"],
["03/08/2023","★☆☆☆☆","BIKE","Cineclube Cortina"],
["03/08/2023","★★★★☆","Las Ligas Menores","Cineclube Cortina"],
["05/08/2023","★★★★☆","Jovem Palerosi (live set)","ai probleminha/235 Secos & Molhados"],
["07/08/2023","★★★★★","Sophia Chablau","Tranquilo São Paulo/Coringa"],
["13/08/2023","★★★★☆","João Gomes & Vanessa da Mata","Doce Maravilha/Marina da Glória"],
["13/08/2023","★★★★★","Marcelo D2 — A Procura da Batida Perfeita","Doce Maravilha/Marina da Glória"],
["24/08/2023","★★★★☆","terraplana","Bar Alto"],
["24/08/2023","★★★★★","terraplana","Bar Alto"],
["17/09/2023","★★★★☆","Sophia Chablau e uma enorme perda de tempo","Coala Festival/Memorial da América Latina"],
["17/09/2023","★★★★☆","Bruno Berle","Coala Festival/Memorial da América Latina"],
["17/09/2023","★★★☆☆","Marcos Valle part. Joyce Moreno & Céu","Coala Festival/Memorial da América Latina"],
["17/09/2023","★★★★☆","Giu Nunez (dj set)","Coala Festival/Memorial da América Latina"],
["17/09/2023","★★★★☆","Letrux","Coala Festival/Memorial da América Latina"],
["17/09/2023","★★★☆☆","Pista Quente (dj Set)","Coala Festival/Memorial da América Latina"],
["17/09/2023","★★★★★","Marina Lima & Fernanda Abreu","Coala Festival/Memorial da América Latina"],
["17/09/2023","★★★★★","KL Jay (dj set)","Coala Festival/Memorial da América Latina"],
["17/09/2023","★★★★★","Jorge Ben Jor","Coala Festival/Memorial da América Latina"],
["30/09/2023","★★★☆☆","Lupe de Lupe","SESC Santana"],
["19/10/2023","★★★★★","Makaya McCraven","SESC Jazz/SESC Pompéia"],
["22/10/2023","★★★☆☆","Jonnata Doll e Os Garotos Solventes","Cine Jóia"],
["22/10/2023","★★★★★","Sophia Chablau e uma enorme perda de tempo","Cine Jóia"],
["29/10/2023","★★★★☆","Egberto Gismonti","SESC Jazz/SESC 14 Bis"],
["05/11/2023","★☆☆☆☆","Sofi Tukker","GP Week/Allianz Parque"],
["05/11/2023","★★★★★","Thundercat","GP Week/Allianz Parque"],
["05/11/2023","★★★★★","Kendrick Lamar","GP Week/Allianz Parque"],
["12/11/2023","★★★★★","Roger Waters","This Is Not a Drill/Allianz Parque"],
["17/11/2023","★★★★☆","PVA","Balaclava Fest/Casa Rockambole"],
["17/11/2023","★★★☆☆","Hatchie","Balaclava Fest/Casa Rockambole"],
["19/11/2023","★★★★☆","PVA","Balaclava Fest/Tokio Marine Hall"],
["19/11/2023","★★★★☆","Whitney","Balaclava Fest/Tokio Marine Hall"],
["19/11/2023","★★★★★","American Football","Balaclava Fest/Tokio Marine Hall"],
["19/11/2023","★★★★★","THUS LOVE","Balaclava Fest/Tokio Marine Hall"],
["19/11/2023","★★★☆☆","Unknown Mortal Orchestra","Balaclava Fest/Tokio Marine Hall"],
["23/11/2023","★★★★★","Ana Frango Elétrico","SESC Pompéia"],
["26/11/2023","★★★★☆","Marcelo D2","Daki Fest/Parque Villa Lobos"],
["29/11/2023","★★★★★","black midi","Primavera na Cidade/Cine Joia"],
["02/12/2023","★★★★★","black midi","Primavera Sound/Palco Corona"],
["02/12/2023","★★★★☆","Dorian Electra","Primavera Sound/Palco São Paulo"],
["02/12/2023","★★★☆☆","Cherolainne","Primavera Sound/TNT Club"],
["02/12/2023","★★★★★","Slowdive","Primavera Sound/Palco São Paulo"],
["02/12/2023","★★★★★","Marisa Monte","Primavera Sound/Palco Corona"],
["02/12/2023","★★★★★","Pet Shop Boys","Primavera Sound/Palco Barcelona"],
["03/12/2023","★★★★☆","Soccer Mommy","Primavera Sound/Palco Barcelona"],
["03/12/2023","★★★★★","Carly Rae Jepsen","Primavera Sound/Palco Corona"],
["03/12/2023","★★★★☆","Beck","Primavera Sound/Palco Corona"],
["03/12/2023","★★★★☆","TOKiMONSTA","Primavera Sound/Palco São Paulo"],
["03/12/2023","★★★★★","The Cure","Primavera Sound/Palco Corona"],
["09/12/2023","★★★★★","Pelados","Sacola Alternativa/SESC Vila Mariana"],
["09/12/2023","★★★★★","Paul McCartney","Got Back Tour/Allianz Parque"],
["03/02/2024","★★★☆☆","Flavio Venturini","Tokio Marine Hall"],
["03/02/2024","★★★★★","Lo Borges","Tokio Marine Hall"],
["03/02/2024","★★★☆☆","Beto Guedes","Tokio Marine Hall"],
["04/02/2024","★★★★★","Boogarins","SESC Vila Mariana"],
["02/03/2024","★★★★★","King Krule","Terra SP"],
["22/03/2024","★★★★★","Jungle","Lollapalooza Brasil/Palco Samsung Galaxy"],
["22/03/2024","★★★★★","Arcade Fire","Lollapalooza Brasil/Palco Samsung Galaxy"],
["23/03/2024","★★★☆☆","Limp Bizkit","Lollapalooza Brasil/Palco Samsung Galaxy"],
["23/03/2024","★★★★★","King Gizzard and the Lizard Wizard","Lollapalooza Brasil/Palco Alternativo"],
["23/03/2024","★★★★★","Titãs Encontro","Lollapalooza Brasil/Palco Samsung Galaxy"],
["04/04/2024","★★★★★","Pelados","Fffront"],
["16/04/2024","★☆☆☆☆","Liam Benzvi","Tokio Marine Hall"],
["16/04/2024","★★★★★","TURNSTILE","Tokio Marine Hall"],
["27/04/2024","★★★★☆","Besouro Mulher","Casa Rockambole"],
["27/04/2024","★★★★★","Pelados","Casa Rockambole"],
["02/05/2024","★★★★★","Baleia + Lupe de Lupe","Bar Alto"],
["17/05/2024","★★★★☆","Bruno Pernadas","SESC Pompéia"],
["19/05/2024","★★★★☆","Jair Naves","C6 Fest/Parque do Ibirapuera"],
["19/05/2024","★★★★★","Squid","C6 Fest/Parque do Ibirapuera"],
["19/05/2024","★★★☆☆","DJ Meme (dj set)","C6 Fest/Parque do Ibirapuera"],
["19/05/2024","★★★☆☆","Cat Power","C6 Fest/Parque do Ibirapuera"],
["19/05/2024","★★★★★","Pavement","C6 Fest/Parque do Ibirapuera"],
["02/08/2024","★★★☆☆","Varanda","Cineclube Cortina"],
["02/08/2024","★★★★★","Pelados","Cineclube Cortina"],
["09/08/2024","★★★★☆","Ana Frango Elétrico","SESC Belenzinho/Comedoria"],
["14/09/2024","★★★★★","Carne Doce","Citylights"],
["15/09/2024","★★★★☆","Adorável Clichê","Cine Jóia"],
["15/09/2024","★★★★★","DIIV","Cine Jóia"],
["16/10/2024","★★★★★","Paul McCartney","Got Back Tour/Allianz Parque"],
["05/11/2024","★★★★☆","Boy Harsher","Carioca Club"],
["09/11/2024","★★★★☆","terraplana","Sideshow Balaclava Fest/Casa Rockambole"],
["09/11/2024","★★☆☆☆","Gal Go","Sideshow Balaclava Fest/Casa Rockambole"],
["13/11/2024","★☆☆☆☆","PAH","Teatro de Arena Eugênio Kusnet"],
["09/12/2024","★★★★☆","Mauricio Pereira","Itaú Cultural"],
["12/12/2024","★★★☆☆","Bufo Borealis","Picles"],
["12/12/2024","★★★★☆","Pelados","Picles"],
["17/01/2025","★★★★☆","Miragem","A Porta Maldita"],
["17/01/2025","★★★☆☆","LABATÚ","A Porta Maldita"],
["17/01/2025","★★★☆☆","monstro bom","A Porta Maldita"],
["25/01/2025","★★★★☆","Trio Mocotó","SESC Bom Retiro"],
["01/02/2025","★★★☆☆","Mundo Video","Porta"],
["01/02/2025","★★★☆☆","ottopapi","Porta"],
["21/02/2025","★★★★☆","Pelados","Museu da Imagem e do Som"],
["21/02/2025","★★★★★","Pagode da 27 part. Dexter & Criolo","Movimento Cultural Recreativo Dois-Dois"],
["23/02/2025","★★★★☆","Kiko Dinucci","Cecília Viva/Cine Jóia"],
["23/02/2025","★★★★★","Boogarins","Cecília Viva/Cine Jóia"],
["23/02/2025","★★★★★","Rakta","Cecília Viva/Cine Jóia"],
["16/03/2025","★★★★☆","Elipsismo","Guitarro Fest/A Porta Maldita"],
["16/03/2025","★★☆☆☆","Junkie","Guitarro Fest/A Porta Maldita"],
["16/03/2025","★★★★☆","ANIMAIS","Guitarro Fest/A Porta Maldita"],
["16/03/2025","★★★★★","Miragem","Guitarro Fest/A Porta Maldita"],
["16/03/2025","★★★☆☆","Onda Quadrada","Guitarro Fest/A Porta Maldita"],
["28/03/2025","★★★☆☆","morro fuji","Picles"],
["28/03/2025","★★★★☆","Miragem","Picles"],
["04/04/2025","★★★☆☆","Felipe Sanches","Cafundó"],
["04/04/2025","★★★★☆","Los Otros","Cafundó"],
["04/04/2025","★★★☆☆","Miragem","Cafundó"],
["26/04/2025","★★★★★","Gilberto Gil","Allianz Parque"],
["02/05/2025","★★★★☆","ottopapi","Porta"],
["02/05/2025","★★★★☆","Marrakesh","Porta"],
["11/05/2025","★★★☆☆","Paulinho Moska + Marina Lima + Arnaldo Antunes","Feira Nacional da Reforma Agrária/Pq. Agua Branca"],
["15/05/2025","★★★★★","Sophia Chablau e uma enorme perda de tempo","Prata da Casa/SESC Pompéia"],
["18/05/2025","★★★★★","Pelados","Casa Natura Cultural"],
["24/05/2025","★★★★☆","Peter Cat Recording Co.","C6 Fest/Parque do Ibirapuera"],
["24/05/2025","★★★★★","Perfume Genius","C6 Fest/Parque do Ibirapuera"],
["24/05/2025","★★★★☆","A. G. Cook","C6 Fest/Parque do Ibirapuera"],
["24/05/2025","★★★★★","AIR","C6 Fest/Arena Externa Heineken/Parque do Ibirapuera"],
["24/05/2025","★★★★☆","Novo Affair (dj set)","Virada Cultural/Pista Lgo. do Café"],
["25/05/2025","★★★☆☆","Selvagem (dj set)","Virada Cultural/Pista Arouche Flores"],
["25/05/2025","★★★★☆","Anelis Assumpção","Virada Cultural/Lgo. do Arouche"],
["25/05/2025","★★★★☆","Soul Vendors & Sound Dimension","Virada Cultural/República"],
["25/05/2025","★★★★☆","Fin Del Mundo","Virada Cultural/Pista Antônio Prado"],
["25/05/2025","★★★☆☆","The Last Dinner Party","C6 Fest/Parque do Ibirapuera"],
["25/05/2025","★★★★★","Wilco","C6 Fest/Parque do Ibirapuera"],
["25/05/2025","★★★★★","Nile Rodgers & Chic","C6 Fest/Arena Externa Heineken/Parque do Ibirapuera"],
["05/06/2025","★★★★☆","Los Otros","Fffront"],
["05/06/2025","★★★★☆","ottopapi","Casa Rockambole"],
["13/06/2025","★★★☆☆","Miragem","A Porta Maldita"],
["13/06/2025","★★☆☆☆","Nunca foi tão fácil","A Porta Maldita"],
["13/06/2025","★★★★☆","Schlop","A Porta Maldita"],
["26/07/2025","★★★★★","Lupe de Lupe","SESC Belenzinho/Teatro"],
["21/08/2025","★★★★☆","Madrugada & Kiko Dinucci","Porta"],
["12/09/2025","★★★☆☆","ottopapi","mamãebar"],
["13/09/2025","★★★★★","tutu naná","Casa Rockambole"],
["01/10/2025","★★★★☆","Rachel Chinouriri","Cine Jóia"],
["03/10/2025","★★★☆☆","Los Otros","Picles"],
["09/10/2025","★★★★★","maquinas","Fffront"],
["09/10/2025","★★★★☆","Pelados","Circuito - Nova Música/Cineclube Cortina"],
["26/10/2025","★★★☆☆","Evinha convida Marcos Valle","Sesc Jazz/SESC Pompéia"],
["30/10/2025","★★★★★","Boogarins","Cine Jóia"],
["02/11/2025","★★★★☆","Otoboke Beaver","Índigo apresenta/Parque Ibirapuera"],
["02/11/2025","★★★★☆","Judeline","Índigo apresenta/Parque Ibirapuera"],
["02/11/2025","★★★★☆","Mogwai","Índigo apresenta/Parque Ibirapuera"],
["02/11/2025","★★★★★","Bloc Party","Índigo apresenta/Parque Ibirapuera"],
["02/11/2025","★★★★★","Weezer","Índigo apresenta/Parque Ibirapuera"],
["04/11/2025","★★★★★","L'Impératrice","Audio"],
["08/11/2025","★★★★★","Cap'n Jazz","Cine Jóia"],
["09/11/2025","★★★★☆","Geordie Greep","Balaclava Fest/Tokio Marine Hall"],
["09/11/2025","★★★★★","Yo La Tengo","Balaclava Fest/Tokio Marine Hall"],
["09/11/2025","★★★★★","Stereolab","Balaclava Fest/Tokio Marine Hall"],
["12/11/2025","★★★★★","Nilüfer Yanya","Cine Jóia"],
["21/11/2025","★★★★★","Tutu naná","Picles"],
["22/11/2025","★★★☆☆","Richard Ashcroft","Morumbis"],
["22/11/2025","★★★★★","Oasis","Morumbis"],
["03/12/2025","★★★★☆","Zeca Baleiro","SESC Bom Retiro/Teatro"],
["26/01/2026","★★★★★","Diego Franco — Uma homenagem a Walter Franco","Teatro Oficina Uzyna Uzona"],
["31/01/2026","★★★★★","Boogarins","Teatro/SESC Pinheiros"],
["07/03/2026","★★★★★","Pelados","Teatro/SESC Pompéia"],
["13/03/2026","★★★★☆","Céu","Comedoria/SESC Pompéia"],
["20/03/2026","★★★★☆","Interpol","Lollapalooza Brasil/Palco Samsung Galaxy"],
["20/03/2026","★★★☆☆","Men I Trust","Lollapalooza Brasil/Palco Flying Fish"],
["20/03/2026","★★★★☆","Deftones","Lollapalooza Brasil/Palco Samsung Galaxy"],
["20/03/2026","★★★★☆","Sabrina Carpenter","Lollapalooza Brasil/Palco Budweiser"],
["21/03/2026","★★★★☆","Varanda","Lollapalooza Brasil/Palco Samsung Galaxy"],
["21/03/2026","★★★☆☆","Marina","Lollapalooza Brasil/Palco Budweiser"],
["21/03/2026","★★★☆☆","TV Girl","Lollapalooza Brasil/Palco Flying Fish"],
["21/03/2026","★★★★☆","Chappell Roan","Lollapalooza Brasil/Palco Budweiser"],
["22/03/2026","★★★★☆","Balu Brigada","Lollapalooza Brasil/Palco Flying Fish"],
["22/03/2026","★★☆☆☆","Royel Otis","Lollapalooza Brasil/Palco Samsung Galaxy"],
["22/03/2026","★★★★★","Addison Rae","Lollapalooza Brasil/Palco Samsung Galaxy"],
["22/03/2026","★★★★★","TURNSTILE","Lollapalooza Brasil/Palco Budweiser"],
["22/03/2026","★★★★★","Lorde","Lollapalooza Brasil/Palco Samsung Galaxy"],
["22/03/2026","★★☆☆☆","KATSEYE","Lollapalooza Brasil/Palco Flying Fish"],
["04/04/2026","★★★★☆","Mac DeMarco","Audio"]
];
const SHOWS_DATA = SHOWS_RAW.map(([date,stars,artista,local])=>{
  const {rating,elite}=parseStars(stars);
  const year=parseInt(date.split('/')[2]);
  return{date,year,artista,local,rating,elite};
});

// ── SHOWS FUNCTIONS ──────────────────────────────────────────────────────────
function initShowsPage(){
  const yearSel=document.getElementById('showsYear');
  if(!yearSel)return;
  const years=[...new Set(SHOWS_DATA.map(s=>s.year))].sort((a,b)=>b-a);
  yearSel.innerHTML='<option value="">Todos os anos</option>'+years.map(y=>`<option value="${y}">${y}</option>`).join('');
  const total=SHOWS_DATA.length;
  const artists=new Set(SHOWS_DATA.map(s=>s.artista)).size;
  const yrs=new Set(SHOWS_DATA.map(s=>s.year)).size;
  const fiveStars=SHOWS_DATA.filter(s=>s.rating===5).length;
  document.getElementById('showsStatBar').innerHTML=`
    <span class="shows-stat"><strong>${total}</strong> shows</span>
    <span class="shows-stat"><strong>${artists}</strong> artistas distintos</span>
    <span class="shows-stat"><strong>${yrs}</strong> anos</span>
    <span class="shows-stat"><strong>${fiveStars}</strong> shows ★★★★★</span>`;
  renderShows();
}
function renderShows(){
  const q=(document.getElementById('showsSearch')?.value||'').toLowerCase();
  const yf=document.getElementById('showsYear')?.value||'';
  const rf=parseInt(document.getElementById('showsRating')?.value||'0');
  let filtered=SHOWS_DATA.filter(s=>{
    if(yf&&String(s.year)!==yf)return false;
    if(rf&&s.rating<rf)return false;
    if(q&&!s.artista.toLowerCase().includes(q)&&!s.local.toLowerCase().includes(q))return false;
    return true;
  }).sort((a,b)=>{
    const da=a.date.split('/').reverse().join('');
    const db=b.date.split('/').reverse().join('');
    return db.localeCompare(da);
  });
  const byYear={};
  filtered.forEach(s=>{if(!byYear[s.year])byYear[s.year]=[];byYear[s.year].push(s);});
  const years=Object.keys(byYear).map(Number).sort((a,b)=>b-a);
  const el=document.getElementById('showsContent');
  if(!el)return;
  if(!filtered.length){el.innerHTML='<p style="color:var(--muted);padding:32px 16px">Nenhum show encontrado.</p>';return;}
  el.innerHTML=years.map(y=>`
    <div class="shows-year-header">${y} <span class="shows-year-count">${byYear[y].length} show${byYear[y].length>1?'s':''}</span></div>
    ${byYear[y].map(s=>{
      const starStr=s.elite?'<span style="color:#FFD700">✦ ★★★★★ ✦</span>':'★'.repeat(s.rating)+'☆'.repeat(5-s.rating);
      return`<div class="show-row${s.elite?' show-elite':''}">
        <span class="show-date">${s.date}</span>
        <span class="show-artist">${s.artista}</span>
        <span class="show-venue">${s.local}</span>
        <span class="show-stars">${starStr}</span>
      </div>`;
    }).join('')}
  `).join('');
}

// ── LASTFM MAIS OUVIDOS ──────────────────────────────────────────────────────
let lfmPeriod='overall',lfmTab='artists',lfmCache={},lfmProfileLoaded=false;
function setLfmPeriod(p,btn){
  lfmPeriod=p;
  document.querySelectorAll('.lfm-pill').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  lfmCache={};
  renderLfmContent();
}
function setLfmTab(t,btn){
  lfmTab=t;
  document.querySelectorAll('.lfm-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderLfmContent();
}
async function initLastfmPage(){
  const key=localStorage.getItem('lastfmApiKey');
  const el=document.getElementById('lfmContent');
  if(!key){
    if(el)el.innerHTML=`<div style="padding:40px 16px;text-align:center;color:var(--muted)">
      <p style="font-size:15px;margin-bottom:8px">⚙️ Chave de API do Last.fm não configurada</p>
      <p style="font-size:13px">Acesse <a href="#" onclick="navigate('about');return false" style="color:var(--accent)">Sobre</a> para adicionar sua Last.fm API Key.</p>
    </div>`;
    return;
  }
  if(!lfmProfileLoaded){
    try{
      const r=await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=y0re&api_key=${key}&format=json`);
      const d=await r.json();
      if(d.user){
        const u=d.user;
        const bar=document.getElementById('lfmProfileBar');
        if(bar){
          const yr=u.registered?.['#text']?new Date(u.registered['#text']*1000).getFullYear():'';
          bar.innerHTML=`<div class="lfm-profile">
            ${u.image?.[2]?.['#text']?`<img src="${u.image[2]['#text']}" style="width:52px;height:52px;border-radius:50%;object-fit:cover">`:'' }
            <div><div style="font-weight:700;font-size:15px">${u.name}</div><div style="font-size:12px;color:var(--muted)">desde ${yr}</div></div>
            <div class="lfm-pstat"><strong>${Number(u.playcount).toLocaleString('pt-BR')}</strong>scrobbles</div>
            <div class="lfm-pstat"><strong>${Number(u.artist_count||0).toLocaleString('pt-BR')}</strong>artistas</div>
            <div class="lfm-pstat"><strong>${Number(u.album_count||0).toLocaleString('pt-BR')}</strong>álbuns</div>
          </div>`;
        }
        lfmProfileLoaded=true;
      }
    }catch(e){}
  }
  renderLfmContent();
}
async function renderLfmContent(){
  const key=localStorage.getItem('lastfmApiKey');
  if(!key)return;
  const el=document.getElementById('lfmContent');
  if(!el)return;
  const ck=lfmTab+'-'+lfmPeriod;
  if(lfmCache[ck]){el.innerHTML=buildLfmList(lfmCache[ck],lfmTab);return;}
  el.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)">A carregar...</div>';
  try{
    const methodMap={artists:'user.gettopartists',albums:'user.gettopalbums',tracks:'user.gettoptracks'};
    const listKeyMap={artists:'artist',albums:'album',tracks:'track'};
    const rootKeyMap={artists:'topartists',albums:'topalbums',tracks:'toptracks'};
    const r=await fetch(`https://ws.audioscrobbler.com/2.0/?method=${methodMap[lfmTab]}&user=y0re&api_key=${key}&format=json&limit=50&period=${lfmPeriod}`);
    const d=await r.json();
    const items=d[rootKeyMap[lfmTab]]?.[listKeyMap[lfmTab]]||[];
    lfmCache[ck]=items;
    el.innerHTML=buildLfmList(items,lfmTab);
  }catch(e){el.innerHTML='<p style="padding:24px;color:var(--muted)">Erro ao carregar dados.</p>';}
}
function buildLfmList(items,tab){
  if(!items.length)return'<p style="padding:24px;color:var(--muted)">Sem dados disponíveis para este período.</p>';
  return items.map((item,i)=>{
    const img=item.image?.[2]?.['#text']||item.image?.[1]?.['#text']||'';
    const sub=tab!=='artists'?(item.artist?.name||''):'';
    const plays=Number(item.playcount).toLocaleString('pt-BR');
    return`<div class="lfm-item">
      <span class="lfm-rank">${i+1}</span>
      ${img?`<img class="lfm-img" src="${img}" alt="" loading="lazy" onerror="this.style.display='none'">`:
            `<div class="lfm-img"></div>`}
      <div style="flex:1;min-width:0">
        <div class="lfm-name">${item.name}</div>
        ${sub?`<div class="lfm-sub">${sub}</div>`:''}
      </div>
      <span class="lfm-plays">${plays} plays</span>
    </div>`;
  }).join('');
}


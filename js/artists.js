// ═══════════════════════════════════════════════════
//  BANDAS / ARTISTAS PAGE
// ═══════════════════════════════════════════════════
let artistsQuery       = '';
let artistsCache       = {};  // nome → { image, bio, tags, similar, topAlbums, formed, listeners, playcount }
let currentArtistPage  = 1;
const ARTISTS_PER_PAGE = 100;

function getArtistList() {
  const map = {};
  collection.forEach(a => {
    if (!a.artist) return;
    if (!map[a.artist]) map[a.artist] = { name: a.artist, albums: [], genres: new Set(), countries: new Set() };
    map[a.artist].albums.push(a);
    if (a.genre)    map[a.artist].genres.add(a.genre);
    if (a.country && a.country !== 'Sem tags') map[a.artist].countries.add(a.country);
  });
  return Object.values(map);
}

function getSortedArtists() {
  const sort = document.getElementById('artistsSortSel')?.value || 'name';
  let list = getArtistList().filter(a =>
    !artistsQuery || a.name.toLowerCase().includes(artistsQuery.toLowerCase())
  );
  if (sort === 'name')  list.sort((a,b) => a.name.localeCompare(b.name));
  if (sort === 'count') list.sort((a,b) => b.albums.length - a.albums.length);
  if (sort === 'rank')  list.sort((a,b) => {
    const ra = Math.min(...a.albums.map(x=>x.rank));
    const rb = Math.min(...b.albums.map(x=>x.rank));
    return ra - rb;
  });
  return list;
}

function onArtistsSearch(val) {
  artistsQuery = val;
  currentArtistPage = 1;
  renderArtistsPage();
}

function renderArtistsPage() {
  const allList    = getSortedArtists();
  const grid       = document.getElementById('artistGrid');
  const hero       = document.getElementById('artistsHeroCount');
  const label      = document.getElementById('artistsCountLabel');
  const total      = getArtistList().length;
  if (hero) hero.textContent = total;
  const totalPages = Math.max(1, Math.ceil(allList.length / ARTISTS_PER_PAGE));
  if (currentArtistPage > totalPages) currentArtistPage = totalPages;
  const start = (currentArtistPage - 1) * ARTISTS_PER_PAGE;
  const end   = Math.min(currentArtistPage * ARTISTS_PER_PAGE, allList.length);
  const list  = allList.slice(start, end);
  if (label) label.textContent = allList.length < total
    ? `${start + 1}–${end} de ${allList.length} (de ${total})`
    : `${start + 1}–${end} de ${total} artistas`;
  if (!grid) return;
  if (!allList.length) {
    grid.innerHTML = '<div class="empty"><div class="empty-icon">🎸</div><h3>Nenhum artista encontrado</h3></div>';
    renderArtistsPagination(0, 1);
    return;
  }
  grid.innerHTML = list.map(a => artistCardHTML(a)).join('');
  renderArtistsPagination(allList.length, totalPages);
}

function renderArtistsPagination(total, totalPages) {
  const bar = document.getElementById('artistPaginationBar');
  if (!bar) return;
  if (totalPages <= 1) { bar.innerHTML = ''; return; }
  const start = (currentArtistPage - 1) * ARTISTS_PER_PAGE + 1;
  const end   = Math.min(currentArtistPage * ARTISTS_PER_PAGE, total);
  const pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentArtistPage > 3) pages.push('…');
    for (let i = Math.max(2, currentArtistPage - 1); i <= Math.min(totalPages - 1, currentArtistPage + 1); i++) pages.push(i);
    if (currentArtistPage < totalPages - 2) pages.push('…');
    pages.push(totalPages);
  }
  bar.innerHTML = `<div class="pagination">
    <span class="pag-info">${start}–${end} de ${total} artistas</span>
    <div class="pag-pages">
      <button class="pag-btn" ${currentArtistPage===1?'disabled':''} onclick="goToArtistPage(${currentArtistPage-1})">←</button>
      ${pages.map(p => p==='…'
        ? `<span class="pag-ellipsis">…</span>`
        : `<button class="pag-btn${p===currentArtistPage?' active':''}" onclick="goToArtistPage(${p})">${p}</button>`
      ).join('')}
      <button class="pag-btn" ${currentArtistPage===totalPages?'disabled':''} onclick="goToArtistPage(${currentArtistPage+1})">→</button>
    </div>
  </div>`;
}

function goToArtistPage(p) {
  currentArtistPage = p;
  renderArtistsPage();
  document.getElementById('page-artists')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function artistCardHTML(artist) {
  const cached   = artistsCache[artist.name];
  const imgSrc   = cached?.image || '';
  const topGenre = [...artist.genres][0] || '';
  const bestRank = Math.min(...artist.albums.map(x=>x.rank));
  const imgEl    = imgSrc
    ? `<img class="artist-img" src="${esc(imgSrc)}" alt="" loading="lazy" onerror="this.style.display='none'">`
    : '';
  return `<div class="artist-card" data-aname="${esc(artist.name)}" onclick="openArtistCard(this)">
    <div class="artist-img-wrap">
      ${imgEl}
      <div class="artist-img-ph" ${imgSrc ? 'style="opacity:0"' : ''}>🎵</div>
    </div>
    <div class="artist-info">
      <div class="artist-name">${esc(artist.name)}</div>
      <div class="artist-meta">
        <span class="artist-count-n">${artist.albums.length}</span>
        álbum${artist.albums.length !== 1 ? 's' : ''}
        ${topGenre ? `<span style="color:var(--muted2)">·</span>${esc(topGenre)}` : ''}
      </div>
    </div>
  </div>`;
}

// Wrapper seguro para onclick nos cards (evita problema de aspas)
function openArtistCard(el) {
  openArtist(el.dataset.aname);
}

// ── Abrir artista ──
async function openArtist(artistName) {
  const artistList = getArtistList();
  const artist = artistList.find(a => a.name === artistName);
  if (!artist) return;

  const mc = document.getElementById('artistModalContent');
  const bg = document.getElementById('artistModalBackdrop');

  // Render skeleton imediato
  mc.innerHTML = artistModalSkeleton(artist);
  bg.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Usar cache se disponível
  if (artistsCache[artistName]) {
    mc.innerHTML = artistModalHTML(artist, artistsCache[artistName]);
    return;
  }

  // Buscar dados em paralelo (Wikipedia PT + Deezer + Last.fm + MusicBrainz)
  const [wikiRes, deezerRes, lfmRes, mbRes] = await Promise.allSettled([
    fetchWikipediaBio(artistName),
    fetchDeezerArtist(artistName),
    fetchLastfmArtistInfo(artistName),
    fetchMusicBrainzData(artistName),
  ]);

  const wiki   = wikiRes.value;    // string ou null
  const deezer = deezerRes.value;
  const lfm    = lfmRes.value;
  const mb     = mbRes.value;      // { mbid, type, formed, ended, area, members, disco } ou null

  // Imagem: Deezer (melhor qualidade) > Last.fm
  const lfmImages = lfm?.image || [];
  const lfmImg    = lfmImages.find(i => i.size === 'mega' || i.size === 'extralarge')?.['#text'] || '';
  const rawImg    = deezer?.picture_xl || deezer?.picture_big || lfmImg || '';
  const image     = rawImg.includes('2a96cbd8b46e442fc41c2b86b821562f') ? '' : rawImg;

  // Bio: preferência absoluta para Wikipedia PT (já priorizada em fetchWikipediaBio)
  // Last.fm como complemento se Wikipedia não retornou nada
  const lfmBio = cleanBio(lfm?.bio?.content || lfm?.bio?.summary || '');
  const bio    = wiki || lfmBio || '';
  const bioLang = wiki ? 'pt' : (lfmBio ? 'en' : '');

  // Tags
  const lfmTags = (lfm?.tags?.tag || []).map(t => t.name).slice(0, 5);
  const tags    = lfmTags.length ? lfmTags : [...artist.genres].slice(0, 5);

  // Artistas similares
  const similar = (lfm?.similar?.artist || []).slice(0, 10).map(a => a.name);

  // Formação e estatísticas
  const formed    = mb?.formed  || lfm?.bio?.yearformed || '';
  const ended     = mb?.ended   || null;
  const area      = mb?.area    || '';
  const mbType    = mb?.type    || '';
  const members   = mb?.members || [];
  const mbDisco   = mb?.disco   || [];
  const listeners = lfm?.stats?.listeners || '';
  const playcount = lfm?.stats?.playcount || '';

  // Discografia Last.fm (fallback se MusicBrainz não retornou)
  let topAlbums = [];
  if (!mbDisco.length && localStorage.getItem('lastfmApiKey')) {
    topAlbums = await fetchLastfmTopAlbums(artistName);
  }

  const info = { image, bio, bioLang, tags, similar, formed, ended, area, mbType, members, mbDisco, listeners, playcount, topAlbums };
  artistsCache[artistName] = info;

  // Atualizar card com imagem se a página de artistas estiver aberta
  if (currentPage === 'artists' && image) renderArtistsPage();

  // Atualizar modal
  if (bg.classList.contains('open')) {
    mc.innerHTML = artistModalHTML(artist, info);
  }
}

function closeArtistModal() {
  document.getElementById('artistModalBackdrop').classList.remove('open');
  document.body.style.overflow = '';
}
function closeArtistOutside(e) {
  if (e.target === document.getElementById('artistModalBackdrop')) closeArtistModal();
}

// ── Skeleton (loading) ──
function artistModalSkeleton(artist) {
  const albums = [...artist.albums].sort((a,b) => a.rank - b.rank);
  return `
    <div class="artist-hero">
      <div class="artist-hero-gradient"></div>
      <div class="artist-hero-content">
        <div class="artist-portrait-ph">🎵</div>
        <div class="artist-hero-info">
          <div class="artist-hero-eyebrow">Artista / Banda</div>
          <div class="artist-hero-name">${esc(artist.name)}</div>
          <div class="artist-hero-tags">
            ${[...artist.genres].slice(0,3).map(g=>`<span class="artist-hero-tag">${esc(g)}</span>`).join('')}
          </div>
          <div class="artist-hero-stats">
            <div><span class="ahs-num">${albums.length}</span><span class="ahs-lbl">Na Coleção</span></div>
            ${albums[0] ? `<div><span class="ahs-num">#${albums[0].rank}</span><span class="ahs-lbl">Melhor Rank</span></div>` : ''}
          </div>
        </div>
      </div>
    </div>
    <div class="artist-modal-body">
      <div class="a-section">
        <div class="a-section-title">Biografia</div>
        <div style="display:flex;align-items:center;gap:10px;color:var(--muted);font-size:13px">
          <div class="spinner"></div> Carregando informações...
        </div>
      </div>
    </div>`;
}

// ── Modal completo ──
function artistModalHTML(artist, info) {
  const albums   = [...artist.albums].sort((a,b) => a.rank - b.rank);
  const imgSrc   = info.image || '';
  const bio      = info.bio   || '';
  const tags     = info.tags?.length ? info.tags : [...artist.genres];
  const similar  = info.similar  || [];
  const topAlbums= info.topAlbums|| [];
  const formed   = info.formed   || '';
  const ended    = info.ended    || null;
  const area     = info.area     || '';
  const mbType   = info.mbType   || '';
  const members  = info.members  || [];
  const mbDisco  = info.mbDisco  || [];
  const listeners= info.listeners? Number(info.listeners).toLocaleString('pt-BR') : '';
  const curiosities = buildCuriosities(artist, info);

  const bgEl      = imgSrc ? `<img class="artist-hero-bg" src="${esc(imgSrc)}" alt="">` : '';
  const portraitEl= imgSrc
    ? `<img class="artist-portrait" src="${esc(imgSrc)}" alt="" onerror="this.outerHTML='<div class=\\'artist-portrait-ph\\'>🎵</div>'">`
    : `<div class="artist-portrait-ph">🎵</div>`;

  // Membros / Formação
  let membersHTML = '';
  if (members.length) {
    const active = members.filter(m => m.active);
    const former = members.filter(m => !m.active);
    const row = m => `<div class="member-row">
      <span class="member-name">${esc(m.name)}</span>
      ${(m.begin || m.end || m.active) ? `<span class="member-years">${m.begin||'?'}${m.end ? '–'+m.end : (m.active ? '–presente' : '')}</span>` : ''}
    </div>`;
    membersHTML = `<div class="a-section">
      <div class="a-section-title">Formação</div>
      <div class="members-wrap">
        ${active.length ? `<div class="members-group">
          <div class="members-group-label">Membros atuais</div>
          ${active.map(row).join('')}
        </div>` : ''}
        ${former.length ? `<div class="members-group">
          <div class="members-group-label">Ex-membros</div>
          ${former.map(row).join('')}
        </div>` : ''}
      </div>
    </div>`;
  }

  // Discografia: MusicBrainz (cronológica) > Last.fm (popularidade)
  let discoHTML = '';
  if (mbDisco.length) {
    const rows = mbDisco.map(alb => {
      const inCol = albums.find(a =>
        a.title.toLowerCase() === alb.title.toLowerCase() ||
        alb.title.toLowerCase().includes(a.title.toLowerCase()) ||
        a.title.toLowerCase().includes(alb.title.toLowerCase())
      );
      const click = inCol ? `onclick="closeArtistModal();openAlbum(${inCol.rank})" style="cursor:pointer"` : '';
      return `<div class="disco-row${inCol?' in-col':''}" ${click}>
        <div class="disco-year-badge">${alb.year||'?'}</div>
        <div class="disco-info">
          <div class="disco-name">${esc(alb.title)}</div>
        </div>
        ${inCol ? `<span class="disco-rank-badge">#${inCol.rank}</span>` : ''}
      </div>`;
    }).join('');
    discoHTML = `<div class="a-section">
      <div class="a-section-title">Discografia — Álbuns de estúdio</div>
      <div class="disco-list">${rows}</div>
    </div>`;
  } else if (topAlbums.length) {
    const rows = topAlbums.map(alb => {
      const inCol = albums.find(a => a.title.toLowerCase() === (alb.name||'').toLowerCase()
        || (alb.name||'').toLowerCase().includes(a.title.toLowerCase())
        || a.title.toLowerCase().includes((alb.name||'').toLowerCase()));
      const imgArr  = alb.image || [];
      const albImg  = (imgArr[3]?.['#text'] || imgArr[2]?.['#text'] || '').replace(/2a96cbd8b46e442fc41c2b86b821562f/,'');
      const coverEl = albImg
        ? `<img class="disco-img" src="${esc(albImg)}" loading="lazy" onerror="this.style.display='none'">`
        : `<div class="disco-ph">♪</div>`;
      const click   = inCol ? `onclick="closeArtistModal();openAlbum(${inCol.rank})"` : '';
      return `<div class="disco-row${inCol?' in-col':''}" ${click}>
        ${coverEl}
        <div class="disco-info">
          <div class="disco-name">${esc(alb.name||'')}</div>
          <div class="disco-sub">${alb.playcount ? Number(alb.playcount).toLocaleString('pt-BR') + ' plays' : ''}</div>
        </div>
        ${inCol ? `<span class="disco-rank-badge">#${inCol.rank}</span>` : ''}
      </div>`;
    }).join('');
    discoHTML = `<div class="a-section">
      <div class="a-section-title">Discografia — Top álbuns no Last.fm</div>
      <div class="disco-list">${rows}</div>
    </div>`;
  }

  // Artistas similares
  const artistNames = new Set(collection.map(a=>a.artist.toLowerCase()));
  const similarHTML = similar.length ? `<div class="a-section">
    <div class="a-section-title">Artistas Similares</div>
    <div class="similar-wrap">
      ${similar.map(s => {
        const inLib = artistNames.has(s.toLowerCase());
        return `<span class="similar-tag${inLib?'':' no-lib'}" data-aname="${esc(s)}" ${inLib?'onclick="closeArtistModal();openArtistCard(this)"':''}>${inLib?'🎵 ':''}${esc(s)}</span>`;
      }).join('')}
    </div>
  </div>` : '';

  return `
    <div class="artist-hero">
      ${bgEl}
      <div class="artist-hero-gradient"></div>
      <div class="artist-hero-content">
        ${portraitEl}
        <div class="artist-hero-info">
          <div class="artist-hero-eyebrow">Artista / Banda</div>
          <div class="artist-hero-name">${esc(artist.name)}</div>
          <div class="artist-hero-tags">
            ${tags.slice(0,4).map(t=>`<span class="artist-hero-tag">${esc(t)}</span>`).join('')}
            ${mbType && mbType !== 'Group' ? `<span class="artist-hero-tag">${esc(mbType)}</span>` : ''}
            ${formed ? `<span class="artist-hero-tag">${formed}${ended ? '–'+ended : ''}</span>` : ''}
            ${area ? `<span class="artist-hero-tag">📍 ${esc(area)}</span>` : ''}
          </div>
          <div class="artist-hero-stats">
            <div><span class="ahs-num">${albums.length}</span><span class="ahs-lbl">Na Coleção</span></div>
            ${albums[0] ? `<div><span class="ahs-num">#${albums[0].rank}</span><span class="ahs-lbl">Melhor Rank</span></div>` : ''}
            ${members.length ? `<div><span class="ahs-num">${members.length}</span><span class="ahs-lbl">Membros</span></div>` : ''}
            ${listeners ? `<div><span class="ahs-num" style="font-size:14px">${listeners}</span><span class="ahs-lbl">Ouvintes Last.fm</span></div>` : ''}
          </div>
        </div>
      </div>
    </div>

    <div class="artist-modal-body">

      ${bio ? `<div class="a-section">
        <div class="a-section-title" style="display:flex;align-items:center;justify-content:space-between">
          Biografia
          ${info.bioLang==='en' ? `<span style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:2px;background:rgba(232,55,60,0.1);color:var(--accent);border:1px solid rgba(232,55,60,0.25);letter-spacing:0.5px">🌐 Em inglês</span>` : ''}
        </div>
        <div class="a-bio">${formatBio(bio)}</div>
      </div>` : `<div class="a-section">
        <div class="a-section-title">Biografia</div>
        <p style="font-size:13px;color:var(--muted);line-height:1.6">Biografia não encontrada na Wikipedia. Configure sua chave Last.fm (⚙) para acessar mais informações sobre este artista.</p>
      </div>`}

      ${membersHTML}

      <div class="a-section">
        <div class="a-section-title">Álbuns na Coleção (${albums.length})</div>
        <div class="a-albums-grid">
          ${albums.map(a => {
            const coverEl = a.cover
              ? `<img class="a-album-mini-cover" src="${esc(a.cover)}" loading="lazy" onerror="this.style.display='none'">`
              : `<div class="a-album-mini-ph">♪</div>`;
            return `<div class="a-album-mini" onclick="closeArtistModal();openAlbum(${a.rank})">
              ${coverEl}
              <div class="a-album-mini-rank">#${a.rank}</div>
              <div class="a-album-mini-title">${esc(a.title)}</div>
              <div class="a-album-mini-year">${a.year||''}</div>
            </div>`;
          }).join('')}
        </div>
      </div>

      ${discoHTML}

      ${(()=>{
        if (!mbDisco.length) return '';
        const artistName = artist.name;
        const inCollection = new Set(collection.filter(a =>
          a.artist.toLowerCase().includes(artistName.toLowerCase()) ||
          artistName.toLowerCase().includes(a.artist.toLowerCase())
        ).map(a => a.title.toLowerCase()));
        const missing = mbDisco.filter(d => !inCollection.has(d.title.toLowerCase()));
        if (!missing.length) return '';
        return `<div class="a-section">
          <div class="section-heading"><h3 class="section-title" style="color:var(--accent);font-size:16px">Faltam na sua coleção (${missing.length})</h3></div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px">
            ${missing.map(d => `<span style="background:var(--surface2);border:1px solid var(--border);border-radius:3px;padding:3px 9px;font-size:12px;color:var(--text2)">${d.year ? d.year+' · ' : ''}${esc(d.title)}</span>`).join('')}
          </div>
        </div>`;
      })()}

      ${curiosities.length ? `<div class="a-section">
        <div class="a-section-title">Curiosidades</div>
        <div class="curiosity-list">
          ${curiosities.map(c=>`<div class="curiosity-row">
            <span class="curiosity-icon">${c.icon}</span>
            <span class="curiosity-text">${c.text}</span>
          </div>`).join('')}
        </div>
      </div>` : ''}

      ${similarHTML}

    </div>`;
}

// ── Curiosidades geradas automaticamente ──
function buildCuriosities(artist, info) {
  const cur    = [];
  const albums = [...artist.albums].sort((a,b) => a.rank - b.rank);
  const years  = albums.map(a=>a.year).filter(Boolean).sort((a,b)=>a-b);

  if (albums.length >= 1)
    cur.push({ icon: '🏆', text: `Melhor posição na coleção: <strong>#${albums[0].rank}</strong> com <em>${esc(albums[0].title)}</em>${albums[0].year ? ` (${albums[0].year})` : ''}.` });

  if (albums.length >= 3)
    cur.push({ icon: '💿', text: `<strong>${esc(artist.name)}</strong> é um dos artistas mais presentes, com <strong>${albums.length} álbuns</strong> na lista.` });

  if (years.length >= 2)
    cur.push({ icon: '📅', text: `Presença que abrange <strong>${years[years.length-1] - years[0]} anos</strong> de carreira (${years[0]}–${years[years.length-1]}).` });

  if (info?.formed && years[0])
    cur.push({ icon: '🎸', text: `Formado em <strong>${info.formed}</strong>. Primeiro álbum na coleção lançado em <strong>${years[0]}</strong>.` });

  if (info?.listeners) {
    const n = Number(info.listeners);
    if (n > 1000000)
      cur.push({ icon: '👥', text: `Um dos grandes nomes: mais de <strong>${(n/1000000).toFixed(1)}M de ouvintes</strong> mensais no Last.fm.` });
    else if (n > 0)
      cur.push({ icon: '👥', text: `Conta com <strong>${n.toLocaleString('pt-BR')} ouvintes</strong> mensais no Last.fm.` });
  }

  const genres = [...artist.genres];
  if (genres.length > 1)
    cur.push({ icon: '🎵', text: `Transita por gêneros distintos: <strong>${genres.join(', ')}</strong>.` });

  if (albums.length > 1) {
    const worstRank = albums[albums.length-1];
    cur.push({ icon: '📊', text: `Seus ${albums.length} álbuns na coleção vão do rank <strong>#${albums[0].rank}</strong> ao <strong>#${worstRank.rank}</strong>.` });
  }

  return cur;
}

// ── Bio helpers ──
function cleanBio(bio) {
  if (!bio) return '';
  return bio
    .replace(/<a\b[^>]*>Read more[^<]*<\/a>/gi, '')
    .replace(/<a\b[^>]*>([^<]*)<\/a>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function formatBio(bio) {
  const clean = bio;
  if (clean.length <= 700)
    return `<p>${clean.replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br>')}</p>`;
  const short = clean.slice(0, 700);
  const full  = clean;
  return `<div id="bioShort"><p>${short.replace(/\n\n/g,'</p><p>')}…
    <span style="color:var(--accent);cursor:pointer;font-weight:700"
      onclick="document.getElementById('bioShort').style.display='none';document.getElementById('bioFull').style.display='block'">
      Ver mais ↓
    </span></p></div>
    <div id="bioFull" style="display:none"><p>${full.replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br>')}</p></div>`;
}

// ── MusicBrainz: formação, membros e discografia ──
async function fetchMusicBrainzData(artistName) {
  try {
    // 1) Buscar MBID
    const sRes = await fetch(
      `https://musicbrainz.org/ws/2/artist?query=${encodeURIComponent('"' + artistName + '"')}&limit=5&fmt=json`,
      { headers: { 'User-Agent': 'AlbumCollection/1.0 (personal)' }, signal: AbortSignal.timeout(9000) }
    );
    if (!sRes.ok) return null;
    const sData = await sRes.json();
    const match = (sData.artists || []).find(a =>
      a.name.toLowerCase() === artistName.toLowerCase() ||
      (a.aliases || []).some(al => al.name.toLowerCase() === artistName.toLowerCase())
    ) || sData.artists?.[0];
    if (!match) return null;

    const mbid   = match.id;
    const type   = match.type   || '';
    const formed = match['life-span']?.begin?.slice(0, 4) || '';
    const ended  = match['life-span']?.ended
      ? (match['life-span'].end?.slice(0, 4) || 'sim') : null;
    const area   = match.area?.name || '';

    // 2) Membros + Álbuns em paralelo
    const [relRes, discoRes] = await Promise.allSettled([
      fetch(`https://musicbrainz.org/ws/2/artist/${mbid}?inc=artist-rels&fmt=json`, {
        headers: { 'User-Agent': 'AlbumCollection/1.0 (personal)' },
        signal: AbortSignal.timeout(9000),
      }),
      fetch(`https://musicbrainz.org/ws/2/release-group?artist=${mbid}&type=album&status=official&fmt=json&limit=30`, {
        headers: { 'User-Agent': 'AlbumCollection/1.0 (personal)' },
        signal: AbortSignal.timeout(9000),
      }),
    ]);

    // Membros
    let members = [];
    if (relRes.status === 'fulfilled' && relRes.value?.ok) {
      const rd = await relRes.value.json();
      members = (rd.relations || [])
        .filter(r => r.type === 'member of band' && r.direction === 'backward' && r.artist?.name)
        .map(r => ({
          name:   r.artist.name,
          active: !r.ended,
          begin:  r.begin?.slice(0, 4) || '',
          end:    r.end?.slice(0, 4)   || '',
        }))
        .sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0));
    }

    // Discografia (álbuns de estúdio, cronológica)
    let disco = [];
    if (discoRes.status === 'fulfilled' && discoRes.value?.ok) {
      const dd = await discoRes.value.json();
      disco = (dd['release-groups'] || [])
        .filter(rg => rg.title && rg['first-release-date'])
        .sort((a, b) => a['first-release-date'].localeCompare(b['first-release-date']))
        .map(rg => ({ title: rg.title, year: rg['first-release-date']?.slice(0, 4) }));
    }

    return { mbid, type, formed, ended, area, members, disco };
  } catch(e) { return null; }
}

// ── APIs ──
async function fetchDeezerArtist(name) {
  try {
    const url  = `https://api.deezer.com/search/artist?q=${encodeURIComponent(name)}&limit=8`;
    const data = await fetchJSON(url);
    const list = data.data || [];
    return list.find(r => r.name.toLowerCase() === name.toLowerCase()) || list[0] || null;
  } catch(e) { return null; }
}

async function fetchLastfmArtistInfo(name) {
  const apiKey = localStorage.getItem('lastfmApiKey') || '';
  if (!apiKey) return null;
  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getInfo` +
      `&artist=${encodeURIComponent(name)}&api_key=${encodeURIComponent(apiKey)}` +
      `&autocorrect=1&lang=pt&format=json`;
    const r = await fetch(url, { signal: AbortSignal.timeout(9000) });
    if (!r.ok) return null;
    const d = await r.json();
    return (!d.error && d.artist) ? d.artist : null;
  } catch(e) { return null; }
}

async function fetchLastfmTopAlbums(name) {
  const apiKey = localStorage.getItem('lastfmApiKey') || '';
  if (!apiKey) return [];
  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getTopAlbums` +
      `&artist=${encodeURIComponent(name)}&api_key=${encodeURIComponent(apiKey)}` +
      `&autocorrect=1&limit=24&format=json`;
    const r = await fetch(url, { signal: AbortSignal.timeout(9000) });
    if (!r.ok) return [];
    const d = await r.json();
    return (d.topalbums?.album || []).filter(a => a.name && a.name !== '(null)' && a.name !== '[Unknown]');
  } catch(e) { return []; }
}

async function fetchWikipediaBio(name) {
  // 1. Tenta direto na Wikipedia PT
  try {
    const url = `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`;
    const r   = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (r.ok) {
      const d = await r.json();
      if (d.extract && d.extract.length > 80 && d.type !== 'disambiguation') return d.extract;
    }
  } catch(e) {}

  // 2. Busca por nome na Wikipedia PT (artigo pode ter título diferente)
  try {
    const surl = `https://pt.wikipedia.org/w/api.php?action=query&list=search` +
      `&srsearch=${encodeURIComponent(name + ' banda músico')}&srlimit=3&format=json&origin=*`;
    const sr = await fetch(surl, { signal: AbortSignal.timeout(6000) });
    if (sr.ok) {
      const sd = await sr.json();
      const hits = sd.query?.search || [];
      for (const hit of hits) {
        const purl = `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(hit.title)}`;
        const pr   = await fetch(purl, { signal: AbortSignal.timeout(6000) });
        if (!pr.ok) continue;
        const pd = await pr.json();
        if (pd.extract && pd.extract.length > 80 && pd.type !== 'disambiguation') return pd.extract;
      }
    }
  } catch(e) {}

  // 3. Fallback: Wikipedia EN (tradução automática não disponível, mas melhor que nada)
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`;
    const r   = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (r.ok) {
      const d = await r.json();
      if (d.extract && d.extract.length > 80 && d.type !== 'disambiguation') return d.extract;
    }
  } catch(e) {}

  return null;
}

// Settings functions removed — Last.fm key can be set via:
// localStorage.setItem('lastfmApiKey', 'YOUR_KEY')

// ═══════════════════════════════════════════════════
//  COMMENTS
// ═══════════════════════════════════════════════════
let albumComments = JSON.parse(localStorage.getItem('albumComments') || '{}');
function saveComments() { localStorage.setItem('albumComments', JSON.stringify(albumComments)); }

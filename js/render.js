
// ═══════════════════════════════════════════════════
//  RENDER COLLECTION
// ═══════════════════════════════════════════════════
function renderCollection() {
  const allItems  = getFiltered();
  const totalPages = Math.max(1, Math.ceil(allItems.length / ALBUMS_PER_PAGE));
  if (currentAlbumPage > totalPages) currentAlbumPage = totalPages;
  const start = (currentAlbumPage - 1) * ALBUMS_PER_PAGE;
  const items = allItems.slice(start, start + ALBUMS_PER_PAGE);

  const grid  = document.getElementById('albumGrid');
  const empty = document.getElementById('emptyState');
  const count = document.getElementById('resultsCount');

  updateHero();
  updateHeaderStats();
  renderSortPills();
  updateFilterPills();

  if (collection.length === 0) {
    grid.style.display = 'none'; empty.style.display = 'block'; count.textContent = '';
    renderPagination(0, 0); return;
  }
  empty.style.display = 'none'; grid.style.display = '';

  const isFiltered = searchQuery || activeGenre!=='all' || activeCountry!=='all' || activeYear!=='all' || activeDecade!=='all';
  count.innerHTML = `<strong>${allItems.length}</strong> álbum${allItems.length!==1?'s':''}${isFiltered?' <span style="color:var(--muted2)">· filtrado</span>':''}`;

  if (currentView === 'grid') {
    grid.className = 'grid-view';
    grid.innerHTML = items.map(a => cardHTML(a)).join('');
  } else if (currentView === 'compact') {
    grid.className = 'compact-view';
    grid.innerHTML = items.map(a => cardHTML(a)).join('');
  } else {
    grid.className = 'list-view';
    grid.innerHTML = items.map(a => listItemHTML(a)).join('');
  }

  renderPagination(allItems.length, totalPages);
}

function renderPagination(total, totalPages) {
  const bar = document.getElementById('paginationBar');
  if (!bar) return;
  if (totalPages <= 1) { bar.innerHTML = ''; return; }

  const start = (currentAlbumPage - 1) * ALBUMS_PER_PAGE + 1;
  const end   = Math.min(currentAlbumPage * ALBUMS_PER_PAGE, total);

  // Montar lista de páginas com reticências
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentAlbumPage) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…');
    }
  }

  bar.innerHTML = `<div class="pagination">
    <span class="pag-info">${start}–${end} de ${total} álbuns</span>
    <div class="pag-pages">
      <button class="pag-btn" ${currentAlbumPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentAlbumPage - 1})">←</button>
      ${pages.map(p => typeof p === 'number'
        ? `<button class="pag-btn${p === currentAlbumPage ? ' active' : ''}" onclick="goToPage(${p})">${p}</button>`
        : `<span class="pag-ellipsis">…</span>`
      ).join('')}
      <button class="pag-btn" ${currentAlbumPage === totalPages ? 'disabled' : ''} onclick="goToPage(${currentAlbumPage + 1})">→</button>
    </div>
  </div>`;
}

function goToPage(p) {
  currentAlbumPage = p;
  renderCollection();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cardHTML(a) {
  const isTop10 = a.rank<=10 && (sortBy==='rank'||sortBy==='rank-desc') && activeGenre==='all' && activeCountry==='all' && activeYear==='all' && activeDecade==='all' && !searchQuery;
  const coverSrc = a.cover
    ? `<div class="cover-wrap" id="cw-${a.rank}">
         <img class="album-cover" src="${esc(a.cover)}" alt="${esc(a.title)}" loading="lazy"
           onload="this.classList.add('img-loaded');document.getElementById('cw-${a.rank}').classList.add('loaded')"
           onerror="this.classList.add('img-loaded');document.getElementById('cw-${a.rank}').classList.add('loaded');this.style.display='none'">
       </div>`
    : `<div class="cover-placeholder">♪</div>`;
  return `<div class="album-card${isTop10?' top-10':''}" data-rank="${a.rank}" onclick="openAlbum(${a.rank})">
    <div class="vinyl-wrap">
      <div class="vinyl-disc"><div class="vinyl-disc-label"></div></div>
      <div class="album-cover-wrap" data-rank="${a.rank}">
        ${coverSrc}
        <div class="album-overlay"></div>
        <div class="fav-btn${a.fav?' active':''}" onclick="toggleFav(event,${a.rank})">♥</div>
      </div>
    </div>
    <div class="album-info">
      <div class="album-rank-row">
        <span class="album-rank">#${a.rank}</span>
        ${isTop10?'<span class="top10-badge">Top 10</span>':''}
      </div>
      <div class="album-artist">${esc(a.artist)}</div>
      <div class="album-title">${esc(a.title)}</div>
      <div class="album-meta">
        ${a.year?`<span class="album-year">${a.year}</span>`:''}
        ${a.year&&a.genre?`<span class="meta-sep">·</span>`:''}
        ${a.genre?`<span class="album-genre-tag">${esc(a.genre)}</span>`:''}
      </div>
    </div>
  </div>`;
}

function listItemHTML(a) {
  const cover = a.cover
    ? `<img class="list-cover" src="${esc(a.cover)}" alt="" loading="lazy" onerror="this.style.display='none'">`
    : `<div class="list-cover list-cover-ph">♪</div>`;
  return `<div class="list-item" data-rank="${a.rank}" onclick="openAlbum(${a.rank})">
    <span class="list-rank">${a.rank}</span>
    ${cover}
    <div class="list-info">
      <div class="list-title">${esc(a.title)}</div>
      <div class="list-artist">${esc(a.artist)}</div>
    </div>
    <div class="list-right">
      ${a.year?`<span class="list-year">${a.year}</span>`:''}
      ${a.genre?`<span class="list-genre">${esc(a.genre)}</span>`:''}
      <span class="list-fav${a.fav?' active':''}" onclick="toggleFav(event,${a.rank})">♥</span>
    </div>
  </div>`;
}

function updateHero() {
  const n = collection.length;
  const el = document.getElementById('heroCount');
  if (el) el.textContent = n;
  renderCarousels();
}

function renderCineHero(){ /* deprecated — hero removed */ }

function _carouselCardHTML(a, oversize){
  const cover = a.cover
    ? `<img class="album-cover" src="${esc(a.cover)}" alt="" loading="lazy" onerror="this.style.display='none';this.parentElement.innerHTML='<div class=\\'cover-placeholder\\'>♪</div>'">`
    : `<div class="cover-placeholder">♪</div>`;
  return `<div class="carousel-card${oversize?' oversize':''}" onclick="openAlbum(${a.rank})">
    <div class="vinyl-wrap">
      <div class="vinyl-disc"><div class="vinyl-disc-label"></div></div>
      <div class="album-cover-wrap" data-rank="${a.rank}">${cover}</div>
    </div>
    <div class="album-info">
      <div class="c-title">${esc(a.title)}</div>
      <div class="c-artist">${esc(a.artist)}${a.year?' · '+a.year:''}</div>
    </div>
  </div>`;
}

function renderCarousels(){
  const wrap = document.getElementById('carouselsWrap');
  if (!wrap) return;
  const isFiltered = searchQuery || activeGenre!=='all' || activeCountry!=='all' || activeYear!=='all' || activeDecade!=='all';
  if (isFiltered || collection.length === 0){ wrap.innerHTML=''; return; }

  // Teaser/exploration rows — NO Top 10, NO spoilers. Each row is a provocation to dig in.
  // Shuffle helper (stable per load)
  const shuf = (arr) => arr.map(v=>[Math.random(),v]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);

  // "Do meio da lista" — obscured rank surprise from 100-500
  const midList = shuf(collection.filter(a=>a.rank>=100 && a.rank<=500)).slice(0, 18);
  // "Raridades" — stuff after #500
  const deep    = shuf(collection.filter(a=>a.rank>500)).slice(0, 18);
  // Brazil but from any rank
  const brazil  = shuf(collection.filter(a=>a.country==='Brasil')).slice(0, 18);
  // 70s golden era
  const seventies = shuf(collection.filter(a=>a.year>=1970 && a.year<=1979)).slice(0, 18);
  // Modern / recent decade
  const recent  = shuf(collection.filter(a=>a.year>=2020)).slice(0, 18);
  // 60s
  const sixties = shuf(collection.filter(a=>a.year>=1960 && a.year<=1969)).slice(0, 18);
  // Genre depth — first non-empty among jazz, electronic, hip-hop
  const pickGenre = (re, label) => {
    const hits = shuf(collection.filter(a => re.test((a.genre||'').toLowerCase())));
    return hits.length > 8 ? { items: hits.slice(0,18), label } : null;
  };
  const genreRow = pickGenre(/hip[\s-]?hop|rap/, 'Hip-hop') ||
                   pickGenre(/jazz/, 'Jazz') ||
                   pickGenre(/electronic|eletr|techno|ambient|idm/, 'Eletrônico');

  const sections = [
    midList.length ? { key:'middle', eyebrow:'Caça ao tesouro', title:'Do <em>meio</em> da lista', sub:'Entre a posição 100 e 500 mora muita coisa boa — bem longe dos holofotes do topo.', items: midList } : null,
    brazil.length  ? { key:'brazil', eyebrow:'🇧🇷 Brasil', title:'Brasilidade <em>eterna</em>', sub:'Do samba ao tropicalismo, do MPB ao rap nacional — sem ordem, pra descobrir.', items: brazil } : null,
    seventies.length ? { key:'70s', eyebrow:'Era dourada', title:'Os anos <em>70</em>', sub:'A década que redefiniu o álbum como forma de arte. Escolhidos aleatoriamente.', items: seventies } : null,
    deep.length    ? { key:'deep', eyebrow:'Profundezas', title:'Além do <em>№ 500</em>', sub:'Cada disco aqui ainda entrou entre os mil favoritos — vale muito a pena olhar pra baixo da lista.', items: deep } : null,
    recent.length  ? { key:'recent', eyebrow:'Agora', title:'Esta <em>década</em>', sub:'Lançamentos de 2020 em diante — a música acontecendo em tempo real.', items: recent } : null,
    sixties.length ? { key:'60s', eyebrow:'Fundamentos', title:'Os anos <em>60</em>', sub:'Onde tudo começou — da beatlemania ao nascimento do rock progressivo.', items: sixties } : null,
    genreRow       ? { key:'genre', eyebrow:'Gênero em foco', title:`<em>${genreRow.label}</em> na coleção`, sub:'Uma amostra aleatória do estilo — reviravoltas esperadas.', items: genreRow.items } : null,
  ].filter(Boolean);

  wrap.innerHTML = sections.map(s => `
    <section class="carousel-section" data-key="${s.key}">
      <div class="carousel-header">
        <div>
          <div class="carousel-eyebrow">${s.eyebrow}</div>
          <h2 class="carousel-title">${s.title}</h2>
          <p class="carousel-sub">${s.sub}</p>
        </div>
        <div class="carousel-ctrls">
          <button class="carousel-ctrl" onclick="_carScroll(this,-1)" aria-label="Anterior">‹</button>
          <button class="carousel-ctrl" onclick="_carScroll(this,1)" aria-label="Próximo">›</button>
        </div>
      </div>
      <div class="carousel-track">
        ${s.items.map(a => _carouselCardHTML(a, false)).join('')}
      </div>
    </section>
  `).join('');
}

function _carScroll(btn, dir){
  const track = btn.closest('.carousel-section').querySelector('.carousel-track');
  track.scrollBy({ left: dir * track.clientWidth * 0.82, behavior:'smooth' });
}
function updateHeaderStats() {
  const artists = new Set(collection.map(a=>a.artist)).size;
  const genres  = new Set(collection.map(a=>a.genre).filter(Boolean)).size;
  const countries = new Set(collection.map(a=>a.country).filter(c=>c&&c!=='Sem tags')).size;
  const el = document.getElementById('header-stats');
  if (el) el.textContent = `${collection.length} álbuns · ${artists} artistas · ${genres} gêneros · ${countries} países`;
}
function updateFilters() {
  // mantido vazio — filtros agora são geridos por updateFilterPills() + populateFPanel()
  updateFilterPills();
  renderSortPills();
}

// ═══════════════════════════════════════════════════
//  ALBUM DETAIL MODAL
// ═══════════════════════════════════════════════════
async function openAlbum(rank) {
  const album = collection.find(a => a.rank === rank);
  if (!album) return;

  history.replaceState(null, '', '#/album/' + rank);

  // Atualiza lista de navegação (usa a coleção filtrada/ordenada atual)
  modalAlbumList  = getFiltered();
  modalAlbumIndex = modalAlbumList.findIndex(a => a.rank === rank);
  updateModalNav();

  const mc = document.getElementById('modalContent');
  const bg = document.getElementById('modalBackdrop');

  const coverBg = album.cover ? `<img class="modal-hero-bg" src="${esc(album.cover)}" />` : '';
  // Immersive vinyl rig — sleeve + rotating disc peeks out on click
  const sleeveInner = album.cover
    ? `<img src="${esc(album.cover)}" alt="" />`
    : `<div class="modal-cover-placeholder" style="width:100%;height:100%;display:grid;place-items:center;font-size:56px;color:var(--accent)">♪</div>`;
  const coverWrap = `<div class="modal-vinyl-rig" id="modalVinylRig" onclick="toggleModalVinyl()" title="Clique pra tirar o vinil da capa">
    <div class="mv-disc"></div>
    <div class="mv-spindle"></div>
    <div class="mv-sleeve">${sleeveInner}</div>
    <div class="mv-hint" id="mvHint">▸ clique pra girar</div>
    <label class="cover-upload-btn" title="Alterar capa" style="z-index:5" onclick="event.stopPropagation()">
      📷<input type="file" accept="image/*" style="display:none" onchange="uploadAlbumCover(event,${rank})">
    </label>
  </div>`;

  // Check if album is in vinyl collection
  const vinylAlbums = JSON.parse(localStorage.getItem('discogsVinylCache') || '[]');
  const hasVinyl = vinylAlbums.some(v => {
    const vTitle = (v.basic_information?.title || '').toLowerCase();
    return vTitle.includes(album.title.toLowerCase().slice(0,10)) ||
           album.title.toLowerCase().includes(vTitle.slice(0,10));
  });
  const vinylBadge = hasVinyl ? `<span style="background:#1DB954;color:#fff;font-size:11px;padding:2px 8px;border-radius:3px;font-weight:600">🖤 Tenho no vinil</span>` : '';

  mc.innerHTML = `
    <div class="modal-hero">
      ${coverBg}
      <div class="modal-hero-content">
        ${coverWrap}
        <div class="modal-title-group">
          <div class="modal-rank-badge">Rank #${album.rank}</div>
          <div class="modal-album-title">${esc(album.title)}</div>
          <div class="modal-album-artist" data-artist="${esc(album.artist)}" onclick="goToArtistFromModal(this)" title="Ver artista">
            ${esc(album.artist)} <span style="font-size:9px;opacity:0.6">↗</span>
          </div>
          <div class="modal-tags">
            ${album.genre ? `<span class="modal-tag">${esc(album.genre)}</span>` : ''}
            ${album.year  ? `<span class="modal-tag year">${album.year}</span>` : ''}
            ${album.country && album.country!=='Sem tags'
              ? `<span class="modal-tag map-link" data-country="${esc(album.country)}" onclick="goToCountryFromModal(this)" title="Ver no mapa">🗺 ${esc(album.country)}</span>`
              : ''}
            ${vinylBadge}
          </div>
        </div>
      </div>
    </div>
    <div class="modal-body">
      <div class="modal-actions">
        <button class="btn btn-primary" onclick="toggleFavModal(${rank})" id="favBtnModal">
          ${album.fav ? '♥ Favorito' : '♡ Favoritar'}
        </button>
      </div>
      ${streamingLinksHTML(album)}
      <div id="albumTagsSection" data-rank="${rank}">
        <div style="display:flex;align-items:center;gap:6px;color:var(--muted);font-size:11px">
          <div class="spinner" style="width:10px;height:10px;border-width:1.5px"></div>
        </div>
      </div>
      <div class="detail-grid">
        <div class="detail-item">
          <div class="detail-item-label">Álbum</div>
          <div class="detail-item-value">${esc(album.title)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-item-label">Artista</div>
          <div class="detail-item-value link" data-artist="${esc(album.artist)}" onclick="goToArtistFromModal(this)">${esc(album.artist)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-item-label">Ano</div>
          <div class="detail-item-value">${album.year||'—'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-item-label">Gênero</div>
          <div class="detail-item-value">${esc(album.genre)||'—'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-item-label">País</div>
          <div class="detail-item-value${album.country&&album.country!=='Sem tags'?' link':''}"
            ${album.country&&album.country!=='Sem tags'?`data-country="${esc(album.country)}" onclick="goToCountryFromModal(this)"`:''}
          >${album.country&&album.country!=='Sem tags'?esc(album.country):'—'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-item-label">Ranking</div>
          <div class="detail-item-value" style="color:var(--accent)">#${album.rank}</div>
        </div>
      </div>
      <div id="tracklistSection">
        <div class="modal-loading"><div class="spinner"></div> Carregando faixas...</div>
      </div>
      ${renderCommentSection(rank)}
    </div>`;

  bg.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Buscar faixas e tags em paralelo
  const [, tagsRes] = await Promise.allSettled([
    fetchAndRenderTracklist(album),
    fetchAlbumTags(album),
  ]);
  // Renderizar tags (fetched + custom)
  const tagEl = document.getElementById('albumTagsSection');
  if (tagEl) {
    const fetched = tagsRes.value || [];
    const custom  = customAlbumTags[rank] || [];
    tagEl.dataset.fetched = JSON.stringify(fetched);
    tagEl.innerHTML = renderTagsHTML(rank, fetched, custom);
  }
}

async function fetchAndRenderTracklist(album) {
  if (!album.itunesId) {
    const el = document.getElementById('tracklistSection');
    if (el) el.innerHTML = '';
    return;
  }
  try {
    const url   = `https://itunes.apple.com/lookup?id=${album.itunesId}&entity=song&limit=30`;
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const r = await fetch(proxy, { signal: AbortSignal.timeout(10000) });
    const j = await r.json();
    const data = JSON.parse(j.contents);
    const tracks = data.results.filter(x => x.wrapperType==='track');
    const el = document.getElementById('tracklistSection');
    if (!el) return;
    if (tracks.length) {
      el.innerHTML = `
        <div class="tracks-header">Faixas</div>
        <div class="tracks-list">
          ${tracks.map(t=>`
            <div class="track-item">
              <span class="track-num">${t.trackNumber||'·'}</span>
              <span class="track-name">${esc(t.trackName)}</span>
              <span class="track-dur">${fmtMs(t.trackTimeMillis)}</span>
            </div>`).join('')}
        </div>`;
    } else {
      el.innerHTML = '';
    }
  } catch(e) {
    const el = document.getElementById('tracklistSection');
    if (el) el.innerHTML = '';
  }
}

// ─── Tags do álbum (Last.fm → MusicBrainz) ───
async function fetchAlbumTags(album) {
  // 1. Last.fm album.getInfo
  const apiKey = localStorage.getItem('lastfmApiKey') || '';
  if (apiKey) {
    try {
      const url = `https://ws.audioscrobbler.com/2.0/?method=album.getInfo` +
        `&api_key=${encodeURIComponent(apiKey)}` +
        `&artist=${encodeURIComponent(album.artist)}` +
        `&album=${encodeURIComponent(album.title)}` +
        `&autocorrect=1&format=json`;
      const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (r.ok) {
        const d = await r.json();
        const IGNORE = ['albums i own','seen live','favourite albums','favorites','my library'];
        const tags = (d.album?.tags?.tag || [])
          .map(t => t.name)
          .filter(t => !IGNORE.includes(t.toLowerCase()))
          .slice(0, 8);
        if (tags.length) return tags;
      }
    } catch(e) {}
  }

  // 2. MusicBrainz release-group tags
  try {
    const q = `"${album.title}" AND artist:"${album.artist}"`;
    const url = `https://musicbrainz.org/ws/2/release-group?query=${encodeURIComponent(q)}&limit=1&inc=tags&fmt=json`;
    const r = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'PersonalAlbumList/1.0 (personal-project)' }
    });
    if (r.ok) {
      const d = await r.json();
      const rg = d['release-groups']?.[0];
      if (rg?.tags?.length) {
        return rg.tags.sort((a,b) => b.count - a.count).slice(0, 8).map(t => t.name);
      }
    }
  } catch(e) {}

  return [];
}

// ─── Modal nav helpers ───
function updateModalNav() {
  const prev = document.getElementById('modalPrevBtn');
  const next = document.getElementById('modalNextBtn');
  const pos  = document.getElementById('modalNavPos');
  const nav  = document.getElementById('modalFloatNav');
  if (!prev || !next) return;
  prev.disabled = modalAlbumIndex <= 0;
  next.disabled = modalAlbumIndex >= modalAlbumList.length - 1;
  if (pos) pos.textContent = modalAlbumList.length
    ? `${modalAlbumIndex + 1} / ${modalAlbumList.length}`
    : '';
  if (nav) nav.classList.add('visible');
}

function navigateModal(dir) {
  const newIdx = modalAlbumIndex + dir;
  if (newIdx < 0 || newIdx >= modalAlbumList.length) return;
  openAlbum(modalAlbumList[newIdx].rank);
}

function goToArtistFromModal(el) {
  const name = el.dataset.artist;
  closeModalBtn();
  navigate('artists');
  setTimeout(() => openArtist(name), 200);
}

function goToCountryFromModal(el) {
  const country = el.dataset.country;
  closeModalBtn();
  navigate('map');
  setTimeout(() => showCountryAlbums(country), 300);
}

function uploadAlbumCover(event, rank) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const album = collection.find(a => a.rank === rank);
    if (!album) return;
    album.cover = e.target.result;
    coverCache[coverKey(album.title, album.artist)] = e.target.result;
    save(); saveCoverCache();
    openAlbum(rank);
    toast('Capa atualizada! 📷', 2000);
  };
  reader.readAsDataURL(file);
}

function closeModal(e) { if (e.target===document.getElementById('modalBackdrop')) closeModalBtn(); }
function closeModalBtn() {
  document.getElementById('modalBackdrop').classList.remove('open');
  document.getElementById('modalFloatNav')?.classList.remove('visible');
  modalAlbumList = []; modalAlbumIndex = -1;
  document.body.style.overflow='';
  history.replaceState(null, '', '#/pagina/' + (currentPage || 'collection'));
}

function toggleFavModal(rank) {
  const album = collection.find(a=>a.rank===rank);
  if (!album) return;
  album.fav = !album.fav;
  save(); renderCollection();
  const btn = document.getElementById('favBtnModal');
  if (btn) btn.textContent = album.fav ? '♥ Favorito' : '♡ Favoritar';
}


function renderCommentSection(rank) {
  const list = albumComments[rank] || [];
  const listHTML = list.length
    ? list.map(c => {
        const initials = (c.name||'?').slice(0,2).toUpperCase();
        const dt = new Date(c.ts).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' });
        return `<div class="comment-item">
          <div class="comment-avatar">${initials}</div>
          <div class="comment-bubble">
            <div class="comment-meta">
              <span class="comment-author">${esc(c.name)}</span>
              <span class="comment-time">${dt}</span>
              <span class="comment-del" onclick="deleteComment(${rank},'${c.id}')">✕</span>
            </div>
            <div class="comment-text">${esc(c.text)}</div>
          </div>
        </div>`;
      }).join('')
    : `<p style="font-size:13px;color:var(--muted);margin-bottom:12px">Nenhum comentário ainda. Seja o primeiro!</p>`;

  return `<div class="comments-section">
    <div class="comments-section-hdr">
      Comentários <span class="comment-count-badge">${list.length}</span>
    </div>
    <div id="cList_${rank}">${listHTML}</div>
    <div class="comment-form">
      <input class="comment-name-inp" id="cName_${rank}" placeholder="Seu nome..." maxlength="50" />
      <div class="comment-textarea-wrap">
        <textarea class="comment-textarea" id="cText_${rank}" maxlength="120"
          placeholder="Deixe seu comentário... (máx. 120 caracteres)"
          oninput="updateCommentCount(${rank},this)"></textarea>
        <span class="comment-char-left" id="cCount_${rank}">120</span>
      </div>
      <button class="btn btn-ghost comment-submit" onclick="submitComment(${rank})">Publicar</button>
    </div>
  </div>`;
}

function updateCommentCount(rank, el) {
  const left = 120 - el.value.length;
  const span = document.getElementById(`cCount_${rank}`);
  if (span) { span.textContent = left; span.classList.toggle('warn', left <= 20); }
}

function submitComment(rank) {
  const nameEl = document.getElementById(`cName_${rank}`);
  const textEl = document.getElementById(`cText_${rank}`);
  if (!nameEl || !textEl) return;
  const name = nameEl.value.trim();
  const text = textEl.value.trim();
  if (!name) { nameEl.focus(); toast('Informe seu nome para comentar.', 2500); return; }
  if (!text) { textEl.focus(); toast('Escreva um comentário!', 2500); return; }
  const id = Math.random().toString(36).slice(2);
  if (!albumComments[rank]) albumComments[rank] = [];
  albumComments[rank].push({ id, name, text, ts: Date.now() });
  saveComments();
  nameEl.value = ''; textEl.value = '';
  // Re-render comment list only
  const listEl = document.getElementById(`cList_${rank}`);
  if (listEl) {
    const rendered = renderCommentSection(rank);
    const parser = new DOMParser();
    const doc = parser.parseFromString(rendered, 'text/html');
    listEl.innerHTML = doc.getElementById(`cList_${rank}`)?.innerHTML || listEl.innerHTML;
    // Update badge
    document.querySelector('.comment-count-badge')?.setAttribute('data-c', albumComments[rank].length);
    document.querySelectorAll('.comment-count-badge').forEach(b => b.textContent = albumComments[rank].length);
  }
  toast('Comentário publicado! 💬', 2000);
}

function deleteComment(rank, id) {
  if (!albumComments[rank]) return;
  albumComments[rank] = albumComments[rank].filter(c => c.id !== id);
  saveComments();
  const listEl = document.getElementById(`cList_${rank}`);
  if (listEl) {
    const list = albumComments[rank];
    listEl.innerHTML = list.length
      ? list.map(c => {
          const initials = (c.name||'?').slice(0,2).toUpperCase();
          const dt = new Date(c.ts).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' });
          return `<div class="comment-item">
            <div class="comment-avatar">${initials}</div>
            <div class="comment-bubble">
              <div class="comment-meta">
                <span class="comment-author">${esc(c.name)}</span>
                <span class="comment-time">${dt}</span>
                <span class="comment-del" onclick="deleteComment(${rank},'${c.id}')">✕</span>
              </div>
              <div class="comment-text">${esc(c.text)}</div>
            </div>
          </div>`;
        }).join('')
      : `<p style="font-size:13px;color:var(--muted);margin-bottom:12px">Nenhum comentário ainda. Seja o primeiro!</p>`;
    document.querySelectorAll('.comment-count-badge').forEach(b => b.textContent = list.length);
  }
}


// ═══════════════════════════════════════════════════
//  LAZY COVER FETCHING (iTunes → Deezer fallback)
// ═══════════════════════════════════════════════════
let coverFetchQueue  = [];
let coverFetchActive = false;

function enqueueCoverFetch() {
  coverFetchQueue = collection.filter(a=>!a.cover).map(a=>a.rank);
  if (coverFetchQueue.length === 0) return;
  processCoverQueue();
}

async function fetchWithProxy(url) {
  const proxies = [
    `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
  ];
  for (const proxy of proxies) {
    try {
      const r = await fetch(proxy, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) continue;
      const text = await r.text();
      // allorigins wraps in {contents:...}, corsproxy returns raw
      try {
        const j = JSON.parse(text);
        if (j.contents) return JSON.parse(j.contents);
        return j;
      } catch(e) { return JSON.parse(text); }
    } catch(e) { continue; }
  }
  throw new Error('All proxies failed');
}

async function fetchJSON(url) {
  // Try direct first (works for iTunes, sometimes Deezer)
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (r.ok) return await r.json();
  } catch(e) { /* fallthrough to proxy */ }
  return fetchWithProxy(url);
}

async function tryItunes(album) {
  const q   = `${album.artist} ${album.title}`;
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=album&limit=8&country=US`;
  try {
    const data = await fetchJSON(url);
    const results = (data.results || []);
    const norm = s => (s||'').toLowerCase().replace(/[^\w\s]/g,'').trim();
    const at = norm(album.title);
    // Tenta match exato, depois parcial, depois qualquer resultado
    let best = results.find(r => norm(r.collectionName) === at)
      || results.find(r => norm(r.collectionName).includes(at) || at.includes(norm(r.collectionName)))
      || results[0];
    if (!best?.artworkUrl100) return null;
    return {
      cover:     best.artworkUrl100.replace('100x100bb','600x600bb').replace('100x100','600x600bb'),
      itunesId:  String(best.collectionId),
      itunesUrl: best.collectionViewUrl || '',
    };
  } catch(e) { return null; }
}

async function tryDeezer(album) {
  const q   = `artist:"${album.artist}" album:"${album.title}"`;
  const url = `https://api.deezer.com/search/album?q=${encodeURIComponent(q)}&limit=5`;
  try {
    const data = await fetchJSON(url);
    const results = data.data || [];
    let best = results.find(r =>
      (r.title||'').toLowerCase().includes(album.title.toLowerCase()) ||
      album.title.toLowerCase().includes((r.title||'').toLowerCase())
    ) || results[0];
    if (!best) return null;
    return {
      cover:     best.cover_xl || best.cover_big || best.cover_medium || best.cover || '',
      deezerUrl: best.link || '',
    };
  } catch(e) { return null; }
}

// Last.fm placeholder MD5 – rejeitar imagens genéricas
const LASTFM_PLACEHOLDER = '2a96cbd8b46e442fc41c2b86b821562f';

async function tryLastFm(album) {
  const apiKey = localStorage.getItem('lastfmApiKey') || '';
  if (!apiKey) return null;
  try {
    // Last.fm permite CORS diretamente – sem proxy!
    const url = `https://ws.audioscrobbler.com/2.0/?method=album.getInfo` +
      `&api_key=${encodeURIComponent(apiKey)}` +
      `&artist=${encodeURIComponent(album.artist)}` +
      `&album=${encodeURIComponent(album.title)}` +
      `&autocorrect=1&format=json`;
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const data = await r.json();
    if (data.error || !data.album) return null;
    const images = data.album.image || [];
    // Pegar a maior imagem disponível
    const sizes = ['mega','extralarge','large','medium'];
    let cover = '';
    for (const sz of sizes) {
      const img = images.find(i => i.size === sz);
      if (img?.['#text'] && !img['#text'].includes(LASTFM_PLACEHOLDER)) {
        cover = img['#text']; break;
      }
    }
    if (!cover) return null;
    return { cover, lastfmUrl: data.album.url || '' };
  } catch(e) { return null; }
}

// Processa em batches paralelos de 4 (4x mais rápido)
async function processCoverQueue() {
  if (coverFetchActive) return;
  coverFetchActive = true;
  try {
    while (coverFetchQueue.length > 0) {
      const batch = coverFetchQueue.splice(0, 4);
      await Promise.allSettled(batch.map(rank => fetchOneCover(rank)));
      saveCoverCache();
      await new Promise(res => setTimeout(res, 350));
    }
  } catch(e) { console.warn('Cover queue error:', e); }
  finally {
    save(); saveCoverCache(); renderCollection();
    coverFetchActive = false;
  }
}

async function fetchOneCover(rank) {
  const album = collection.find(a => a.rank === rank);
  if (!album || album.cover) return;
  const key = coverKey(album.title, album.artist);

  // ── 1. Last.fm (se tiver chave) ──
  const hasLastfm = !!localStorage.getItem('lastfmApiKey');
  if (hasLastfm) {
    try {
      const lfm = await tryLastFm(album);
      if (lfm?.cover) {
        album.cover = lfm.cover; coverCache[key] = lfm.cover;
        patchCoverInDOM(rank, lfm.cover); return;
      }
    } catch(e) {}
  }

  // ── 2. iTunes direto (suporta CORS nativamente) ──
  try {
    const itunes = await tryItunes(album);
    if (itunes?.cover) {
      album.cover = itunes.cover; coverCache[key] = itunes.cover;
      album.itunesId  = album.itunesId  || itunes.itunesId;
      album.itunesUrl = album.itunesUrl || itunes.itunesUrl;
      itunesCache[String(rank)] = { id: album.itunesId, url: album.itunesUrl };
      patchCoverInDOM(rank, itunes.cover); return;
    }
  } catch(e) {}

  // ── 3. Deezer ──
  try {
    const deezer = await tryDeezer(album);
    if (deezer?.cover) {
      album.cover = deezer.cover; coverCache[key] = deezer.cover;
      album.deezerUrl = album.deezerUrl || deezer.deezerUrl;
      deezerCache[String(rank)] = { url: album.deezerUrl };
      patchCoverInDOM(rank, deezer.cover);
    }
  } catch(e) {}
}

function patchCoverInDOM(rank, coverUrl) {
  const card = document.querySelector(`.album-card[data-rank="${rank}"]`);
  if (card) {
    const wrap = card.querySelector('.album-cover-wrap');
    if (wrap && !wrap.querySelector('.album-cover')) {
      const ph = wrap.querySelector('.cover-placeholder');
      if (ph) ph.remove();
      const img = document.createElement('img');
      img.className='album-cover'; img.src=coverUrl; img.loading='lazy';
      img.onerror=()=>img.remove();
      wrap.insertBefore(img, wrap.firstChild);
    }
  }
  const listItem = document.querySelector(`.list-item[data-rank="${rank}"]`);
  if (listItem) {
    const ph = listItem.querySelector('.list-cover-ph');
    if (ph) {
      const img = document.createElement('img');
      img.className='list-cover'; img.src=coverUrl; img.loading='lazy';
      ph.replaceWith(img);
    }
  }
  const caItem = document.querySelector(`.country-album-item .ca-cover-ph`);
  // Also patch country panel if visible
}

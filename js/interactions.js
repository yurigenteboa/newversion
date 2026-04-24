(function(){
  /* ── Spotlight cursor glow on Collection page ── */
  document.addEventListener('mousemove', (e) => {
    const p = document.getElementById('page-collection');
    if (!p || !p.classList.contains('active')) return;
    p.style.setProperty('--mx', e.clientX + 'px');
    p.style.setProperty('--my', e.clientY + 'px');
  });

  /* ── Genre marquee ── */
  function buildGenreStrip(){
    const track = document.getElementById('genreStripTrack');
    if (!track || !window.collection) return;
    const genres = {};
    collection.forEach(a => { const g=(a.genre||'').trim(); if(g) genres[g]=(genres[g]||0)+1; });
    const top = Object.entries(genres).sort((a,b)=>b[1]-a[1]).slice(0,16);
    if (top.length === 0) { document.getElementById('genreStrip').style.display='none'; return; }
    // Duplicate for seamless loop
    const html = top.map(([g,n]) => `<span class="genre-strip-item" onclick="filterGenre('${g.replace(/'/g,"\\'")}')">${g} <span class="gs-count">${n}</span></span>`).join('');
    track.innerHTML = html + html;
  }
  // Initial — wait for collection load
  const origUpdateHero = window.updateHero;
  window.updateHero = function(){
    if (origUpdateHero) origUpdateHero.apply(this, arguments);
    buildGenreStrip();
    applyStagger();
  };

  /* ── Staggered drop-in animation index ── */
  function applyStagger(){
    document.querySelectorAll('#albumGrid .album-card, #albumGrid .list-item').forEach((el, i) => {
      el.style.setProperty('--idx', Math.min(i, 40));
    });
  }

  /* ── Turntable mini-player ── */
  const tt = document.getElementById('turntable');
  const ttCover = document.getElementById('ttCover');
  const ttTitle = document.getElementById('ttTitle');
  const ttArtist = document.getElementById('ttArtist');
  let currentTTAlbum = null;

  // Restore last-loaded album
  try {
    const saved = localStorage.getItem('turntableAlbum');
    if (saved) {
      const a = JSON.parse(saved);
      setTurntable(a, false);
    }
  } catch(e){}

  function setTurntable(album, andPlay){
    if (!album) return;
    currentTTAlbum = album;
    tt.classList.add('has-album', 'expanded');
    tt.classList.remove('hint');
    if (album.cover) { ttCover.src = album.cover; ttCover.style.display=''; ttCover.style.opacity=''; }
    else { ttCover.style.display='none'; }
    ttTitle.textContent = album.title || '—';
    ttArtist.textContent = album.artist || '—';
    if (andPlay){
      tt.classList.add('playing');
    }
    try { localStorage.setItem('turntableAlbum', JSON.stringify({rank:album.rank,title:album.title,artist:album.artist,cover:album.cover})); } catch(e){}
  }

  // Hook into openAlbum — mark as "now spinning"
  const origOpenAlbum = window.openAlbum;
  if (origOpenAlbum){
    window.openAlbum = async function(rank){
      const r = await origOpenAlbum.apply(this, arguments);
      const a = (window.collection||[]).find(x=>x.rank===rank);
      if (a) setTurntable(a, true);
      return r;
    };
  }

  // Click turntable → open that album
  tt.addEventListener('click', () => {
    if (!tt.classList.contains('expanded')){
      tt.classList.add('expanded','hint');
      return;
    }
    if (currentTTAlbum && window.openAlbum){
      window.openAlbum(currentTTAlbum.rank);
    }
  });
  // Collapse when mouse leaves (if no album playing)
  tt.addEventListener('mouseleave', () => {
    if (!currentTTAlbum) { tt.classList.remove('expanded'); tt.classList.add('hint'); }
  });

  /* ── Modal vinyl interaction (spin/stop) ── */
  window.toggleModalVinyl = function(){
    const rig = document.getElementById('modalVinylRig');
    if (!rig) return;
    rig.classList.toggle('spinning');
    const hint = document.getElementById('mvHint');
    if (hint) hint.textContent = rig.classList.contains('spinning') ? '▸ tocando…' : '▸ clique pra girar';
  };
  // Auto-spin when modal opens
  const origOpenAlbum2 = window.openAlbum;
  window.openAlbum = async function(rank){
    const r = await origOpenAlbum2.apply(this, arguments);
    setTimeout(() => {
      const rig = document.getElementById('modalVinylRig');
      if (rig && !rig.classList.contains('spinning')){
        rig.classList.add('spinning');
        const hint = document.getElementById('mvHint');
        if (hint) hint.textContent = '▸ tocando…';
      }
    }, 200);
    return r;
  };

  /* ── Keyboard shortcuts ── */
  document.addEventListener('keydown', (e) => {
    // Skip if typing in an input
    const tag = (e.target.tagName||'').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key === '/') {
      e.preventDefault();
      document.getElementById('searchInput')?.focus();
    } else if (e.key.toLowerCase() === 'r') {
      if (window.openRandomAlbum) window.openRandomAlbum();
    } else if (e.key.toLowerCase() === 't') {
      if (window.toggleTheme) window.toggleTheme();
    } else if (e.key.toLowerCase() === 'g') {
      window.scrollTo({top:0, behavior:'smooth'});
    }
  });

  /* ── Hide kbd-hint after first scroll ── */
  let scrolled = false;
  window.addEventListener('scroll', () => {
    if (scrolled) return;
    if (window.scrollY > 200) {
      scrolled = true;
      document.getElementById('kbdHint')?.classList.add('hide');
    }
  }, { passive: true });
  // also hide after 12s anyway
  setTimeout(() => document.getElementById('kbdHint')?.classList.add('hide'), 12000);

  /* ── Apply stagger to any grid-rebuild (MutationObserver) ── */
  const grid = document.getElementById('albumGrid');
  if (grid){
    const mo = new MutationObserver(() => applyStagger());
    mo.observe(grid, { childList: true });
  }

  /* ── After DOM settles, build genre strip ── */
  setTimeout(buildGenreStrip, 800);
  setTimeout(applyStagger, 500);
})();


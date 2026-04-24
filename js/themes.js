(function(){
  const ACCENT_PRESETS = {
    amber:  { accent:'#E9B864', hot:'#F3C879', deep:'#B8894A', glow:'rgba(233,184,100,0.22)', wash:'rgba(233,184,100,0.08)', borderA:'rgba(236,197,116,0.08)', borderB:'rgba(236,197,116,0.22)' },
    red:    { accent:'#E8373C', hot:'#F55A5F', deep:'#a82125', glow:'rgba(232,55,60,0.22)', wash:'rgba(232,55,60,0.08)', borderA:'rgba(232,55,60,0.08)', borderB:'rgba(232,55,60,0.22)' },
    teal:   { accent:'#5FD7C4', hot:'#7FE8D6', deep:'#2a9a8a', glow:'rgba(95,215,196,0.22)', wash:'rgba(95,215,196,0.08)', borderA:'rgba(95,215,196,0.1)', borderB:'rgba(95,215,196,0.24)' },
    violet: { accent:'#B794F6', hot:'#CFB5FF', deep:'#7e57c2', glow:'rgba(183,148,246,0.22)', wash:'rgba(183,148,246,0.08)', borderA:'rgba(183,148,246,0.1)', borderB:'rgba(183,148,246,0.24)' },
    mono:   { accent:'#F5EFE2', hot:'#ffffff', deep:'#8f8573', glow:'rgba(245,239,226,0.18)', wash:'rgba(245,239,226,0.06)', borderA:'rgba(255,255,255,0.08)', borderB:'rgba(255,255,255,0.22)' },
  };
  const saved = JSON.parse(localStorage.getItem('tweaksV2') || '{}');
  window.__tweaks = Object.assign({ accent:'amber', density:'comfortable', cardStyle:'default', vinyl:'on' }, saved);

  function apply(){
    const t = window.__tweaks;
    const p = ACCENT_PRESETS[t.accent] || ACCENT_PRESETS.amber;
    const r = document.documentElement.style;
    r.setProperty('--accent', p.accent);
    r.setProperty('--accent-hot', p.hot);
    r.setProperty('--accent-deep', p.deep);
    r.setProperty('--accent-glow', p.glow);
    r.setProperty('--accent-wash', p.wash);
    r.setProperty('--border', p.borderA);
    r.setProperty('--border2', p.borderB);
    document.documentElement.setAttribute('data-density', t.density);
    document.documentElement.setAttribute('data-card-style', t.cardStyle);
    document.documentElement.setAttribute('data-vinyl', t.vinyl);
    // Sync UI
    document.querySelectorAll('#twSwatches .tw-sw').forEach(el => el.classList.toggle('active', el.dataset.accent===t.accent));
    document.querySelectorAll('#twDensity .tw-chip').forEach(el => el.classList.toggle('active', el.dataset.d===t.density));
    document.querySelectorAll('#twCardStyle .tw-chip').forEach(el => el.classList.toggle('active', el.dataset.cs===t.cardStyle));
    document.querySelectorAll('#twVinyl .tw-chip').forEach(el => el.classList.toggle('active', el.dataset.v===t.vinyl));
    localStorage.setItem('tweaksV2', JSON.stringify(t));
  }

  document.addEventListener('click', e => {
    const sw = e.target.closest('#twSwatches .tw-sw');
    if (sw) { window.__tweaks.accent = sw.dataset.accent; apply(); return; }
    const dc = e.target.closest('#twDensity .tw-chip');
    if (dc) { window.__tweaks.density = dc.dataset.d; apply(); return; }
    const cs = e.target.closest('#twCardStyle .tw-chip');
    if (cs) { window.__tweaks.cardStyle = cs.dataset.cs; apply(); return; }
    const v  = e.target.closest('#twVinyl .tw-chip');
    if (v) { window.__tweaks.vinyl = v.dataset.v; apply(); return; }
  });

  apply();
  // Show FAB
  setTimeout(()=>{ document.getElementById('tweaksFab').style.display=''; }, 400);
})();


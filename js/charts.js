// ═══════════════════════════════════════════════════
//  STATS PAGE
// ═══════════════════════════════════════════════════
function renderStats() {
  const n       = collection.length;
  const artists = new Set(collection.map(a=>a.artist)).size;
  const genres  = [...new Set(collection.map(a=>a.genre).filter(Boolean))];
  const years   = collection.map(a=>a.year).filter(Boolean);
  const avgYear = years.length ? Math.round(years.reduce((s,y)=>s+y,0)/years.length) : '—';
  const favs    = collection.filter(a=>a.fav).length;
  const decades = [...new Set(years.map(y=>Math.floor(y/10)*10))].length;

  document.getElementById('statsCards').innerHTML = [
    ['Álbuns na Coleção', n,            `${Math.round(n/10)}% da meta de 1000`],
    ['Artistas Únicos',  artists,       'artistas diferentes'],
    ['Gêneros',          genres.length, 'estilos musicais'],
    ['Ano Médio',        avgYear,       'da coleção'],
    ['Favoritos ♥',     favs,          'álbuns favoritados'],
    ['Décadas',          decades,       'décadas representadas'],
  ].map(([label,val,sub])=>`
    <div class="stat-card">
      <div class="stat-card-label">${label}</div>
      <div class="stat-card-value">${val}</div>
      <div class="stat-card-sub">${sub}</div>
    </div>`).join('');

  const genreCount = {};
  collection.forEach(a=>{ if(a.genre) genreCount[a.genre]=(genreCount[a.genre]||0)+1; });
  const sorted = Object.entries(genreCount).sort((a,b)=>b[1]-a[1]).slice(0,15);
  const maxG = sorted[0]?.[1]||1;
  document.getElementById('genreBars').innerHTML = sorted.map(([g,cnt])=>`
    <div class="genre-bar-item">
      <div class="genre-bar-label"><span>${esc(g)}</span><span class="genre-bar-count">${cnt}</span></div>
      <div class="genre-bar-track"><div class="genre-bar-fill" style="width:${(cnt/maxG)*100}%"></div></div>
    </div>`).join('');

  const decCount = {};
  collection.forEach(a=>{ if(a.year){ const d=Math.floor(a.year/10)*10; decCount[d]=(decCount[d]||0)+1; }});
  document.getElementById('decadeGrid').innerHTML = Object.entries(decCount).sort().map(([d,c])=>`
    <div class="decade-card" onclick="navigate('collection');filterDecade('${d}')">
      <div class="decade-num">${d}s</div>
      <div class="decade-count">${c} álbuns</div>
    </div>`).join('');

  // Todos os gráficos
  renderAllCharts();
}

// ─── Chart helpers ───────────────────────────────────
const PIE_PALETTE = [
  '#E8373C','#FF8C42','#FFD166','#06D6A0','#118AB2',
  '#845EC2','#FF6B9D','#C4FCEF','#F9C74F','#90BE6D',
  '#43AA8B','#577590','#F94144','#F3722C','#277DA1',
];

function chartTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  return {
    isDark,
    gridColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
    tickColor: isDark ? '#888888' : '#999999',
    tooltip: {
      backgroundColor: isDark ? '#111111' : '#ffffff',
      titleColor:      isDark ? '#ffffff' : '#111111',
      bodyColor:       isDark ? '#cccccc' : '#444444',
      borderColor:     isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
      borderWidth: 1,
    },
  };
}

function mkChart(canvas, config) {
  if (canvas._chartInst) canvas._chartInst.destroy();
  canvas._chartInst = new Chart(canvas, config);
  return canvas._chartInst;
}
// ─────────────────────────────────────────────────────

function renderAllCharts() {
  renderYearChart();
  renderArtistChart();
  renderGenreDonutChart();
  renderCountryChart();
  renderDecadeGenreChart();
}

function renderYearChart() {
  const canvas = document.getElementById('yearChart');
  if (!canvas) return;
  const t = chartTheme();

  const yearMap = {};
  collection.forEach(a => { if (a.year) yearMap[a.year] = (yearMap[a.year] || 0) + 1; });
  const sortedYears = Object.keys(yearMap).map(Number).sort((a,b)=>a-b);
  if (!sortedYears.length) return;

  const minY = sortedYears[0], maxY = sortedYears[sortedYears.length - 1];
  const labels = [], data = [];
  for (let y = minY; y <= maxY; y++) { labels.push(y); data.push(yearMap[y] || 0); }

  mkChart(canvas, {
    type: 'bar',
    data: { labels, datasets: [{
      data,
      backgroundColor: 'rgba(232,55,60,0.75)',
      hoverBackgroundColor: '#E8373C',
      borderRadius: 2, borderSkipped: false,
    }]},
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: { ...t.tooltip, callbacks: {
          title: ctx => String(ctx[0].label),
          label: ctx => ` ${ctx.parsed.y} álbum${ctx.parsed.y !== 1 ? 's' : ''}`,
        }},
      },
      scales: {
        x: { ticks: { color: t.tickColor, font: { size: 10, family: 'Inter' }, maxRotation: 45, autoSkip: true, maxTicksLimit: 30 }, grid: { color: t.gridColor } },
        y: { beginAtZero: true, ticks: { color: t.tickColor, font: { size: 11, family: 'Inter' }, stepSize: 1 }, grid: { color: t.gridColor } },
      },
    },
  });
}

function renderArtistChart() {
  const canvas = document.getElementById('artistChart');
  if (!canvas) return;
  const t = chartTheme();

  const artistCount = {};
  collection.forEach(a => { if (a.artist) artistCount[a.artist] = (artistCount[a.artist] || 0) + 1; });
  const sorted = Object.entries(artistCount).sort((a,b) => b[1]-a[1]).slice(0,15);
  const labels = sorted.map(([name]) => name);
  const data   = sorted.map(([,cnt]) => cnt);

  // Color bars — top 3 accent, rest muted
  const colors = data.map((_, i) => i < 3 ? '#E8373C' : (t.isDark ? 'rgba(232,55,60,0.45)' : 'rgba(232,55,60,0.35)'));

  mkChart(canvas, {
    type: 'bar',
    data: { labels, datasets: [{ data, backgroundColor: colors, hoverBackgroundColor: '#E8373C', borderRadius: 3, borderSkipped: false }]},
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { ...t.tooltip, callbacks: {
          label: ctx => ` ${ctx.parsed.x} álbum${ctx.parsed.x !== 1 ? 's' : ''}`,
        }},
      },
      scales: {
        x: { beginAtZero: true, ticks: { color: t.tickColor, font: { size: 11, family: 'Inter' }, stepSize: 1 }, grid: { color: t.gridColor } },
        y: { ticks: { color: t.tickColor, font: { size: 12, family: 'Inter' } }, grid: { display: false } },
      },
    },
  });
}

function renderGenreDonutChart() {
  const canvas = document.getElementById('genreDonutChart');
  if (!canvas) return;
  const t = chartTheme();

  const genreCount = {};
  collection.forEach(a => { if (a.genre) genreCount[a.genre] = (genreCount[a.genre] || 0) + 1; });
  const sorted = Object.entries(genreCount).sort((a,b) => b[1]-a[1]);
  const top12  = sorted.slice(0, 12);
  const others = sorted.slice(12).reduce((s, [,v]) => s + v, 0);
  if (others) top12.push(['Outros', others]);

  mkChart(canvas, {
    type: 'doughnut',
    data: {
      labels:   top12.map(([g]) => g),
      datasets: [{ data: top12.map(([,c]) => c), backgroundColor: PIE_PALETTE, borderWidth: 2, borderColor: t.isDark ? '#111' : '#fff' }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '58%',
      plugins: {
        legend: { position: 'right', labels: { color: t.tickColor, font: { size: 11, family: 'Inter' }, boxWidth: 12, padding: 9 } },
        tooltip: { ...t.tooltip, callbacks: {
          label: ctx => ` ${ctx.label}: ${ctx.parsed} álbuns (${Math.round(ctx.parsed / collection.length * 100)}%)`,
        }},
      },
    },
  });
}

function renderCountryChart() {
  const canvas = document.getElementById('countryChart');
  if (!canvas) return;
  const t = chartTheme();

  const flags = {
    'Estados Unidos':'🇺🇸','Reino Unido':'🇬🇧','Brasil':'🇧🇷','Alemanha':'🇩🇪',
    'França':'🇫🇷','Japão':'🇯🇵','Canadá':'🇨🇦','Austrália':'🇦🇺',
    'Islândia':'🇮🇸','Irlanda':'🇮🇪','Suécia':'🇸🇪','Jamaica':'🇯🇲',
    'Nigéria':'🇳🇬','Argentina':'🇦🇷','Itália':'🇮🇹','Espanha':'🇪🇸',
    'México':'🇲🇽','Noruega':'🇳🇴','Dinamarca':'🇩🇰','Holanda':'🇳🇱',
    'Países Baixos':'🇳🇱','Coréia do Sul':'🇰🇷','Coreia do Sul':'🇰🇷',
  };

  const countryCount = {};
  collection.forEach(a => {
    if (a.country && a.country !== 'Sem tags') countryCount[a.country] = (countryCount[a.country] || 0) + 1;
  });
  const sorted = Object.entries(countryCount).sort((a,b) => b[1]-a[1]).slice(0,10);
  const labels = sorted.map(([name]) => (flags[name] || '🌐') + '  ' + name);
  const data   = sorted.map(([,cnt]) => cnt);

  const colors = data.map((_, i) => i < 3 ? '#E8373C' : (t.isDark ? 'rgba(232,55,60,0.45)' : 'rgba(232,55,60,0.35)'));

  mkChart(canvas, {
    type: 'bar',
    data: { labels, datasets: [{ data, backgroundColor: colors, hoverBackgroundColor: '#E8373C', borderRadius: 3, borderSkipped: false }]},
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { ...t.tooltip, callbacks: {
          label: ctx => ` ${ctx.parsed.x} álbum${ctx.parsed.x !== 1 ? 's' : ''}`,
        }},
      },
      scales: {
        x: { beginAtZero: true, ticks: { color: t.tickColor, font: { size: 11, family: 'Inter' }, stepSize: 1 }, grid: { color: t.gridColor } },
        y: { ticks: { color: t.tickColor, font: { size: 12, family: 'Inter' } }, grid: { display: false } },
      },
    },
  });
}

function renderDecadeGenreChart() {
  const canvas = document.getElementById('decadeGenreChart');
  if (!canvas) return;
  const t = chartTheme();

  // Top 8 gêneros por volume
  const genreCount = {};
  collection.forEach(a => { if (a.genre) genreCount[a.genre] = (genreCount[a.genre] || 0) + 1; });
  const topGenres = Object.entries(genreCount).sort((a,b) => b[1]-a[1]).slice(0, 8).map(([g]) => g);

  // Décadas presentes
  const decadeSet = new Set();
  collection.forEach(a => { if (a.year) decadeSet.add(Math.floor(a.year / 10) * 10); });
  const decades = [...decadeSet].sort((a,b) => a-b);

  // Matriz década × gênero
  const matrix = {};
  decades.forEach(d => {
    matrix[d] = {};
    topGenres.forEach(g => matrix[d][g] = 0);
    matrix[d]['Outros'] = 0;
  });
  collection.forEach(a => {
    if (!a.year) return;
    const d = Math.floor(a.year / 10) * 10;
    if (!matrix[d]) return;
    const g = topGenres.includes(a.genre) ? a.genre : 'Outros';
    matrix[d][g] = (matrix[d][g] || 0) + 1;
  });

  const allGenres = [...topGenres, 'Outros'];
  const datasets = allGenres.map((genre, i) => ({
    label: genre,
    data:  decades.map(d => matrix[d][genre] || 0),
    backgroundColor: PIE_PALETTE[i % PIE_PALETTE.length],
    borderWidth: 0,
    borderRadius: 2,
  }));

  mkChart(canvas, {
    type: 'bar',
    data: { labels: decades.map(d => `${d}s`), datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: t.tickColor, font: { size: 11, family: 'Inter' }, boxWidth: 13, padding: 12 } },
        tooltip: { ...t.tooltip, mode: 'index', intersect: false },
      },
      scales: {
        x: { stacked: true, ticks: { color: t.tickColor, font: { size: 13, family: 'Inter' } }, grid: { color: t.gridColor } },
        y: { stacked: true, ticks: { color: t.tickColor, font: { size: 11, family: 'Inter' } }, grid: { color: t.gridColor } },
      },
    },
  });
}


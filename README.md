# 🎵 1000 Álbuns — Projeto Modularizado

## Estrutura de arquivos

```
projeto/
├── index.html              ← HTML limpo (611 linhas)
├── css/
│   └── styles.css          ← Todo o CSS (2861 linhas)
└── js/
    ├── albums_data.js      ← Dados dos 1000 álbuns
    │
    ├── state.js            ← Constantes e variáveis globais
    ├── utils.js            ← Funções utilitárias (esc, toast, tema, cache)
    ├── nav.js              ← Navegação entre páginas
    ├── filters.js          ← Filtros de gênero, país, ano, década
    ├── render.js           ← Renderização de cards e carrosséis
    ├── modal.js            ← Modal do álbum + comentários + tags
    ├── covers.js           ← Busca de capas (iTunes, Deezer, Last.fm)
    ├── charts.js           ← Gráficos estatísticos (Chart.js)
    ├── artists.js          ← Página de artistas
    ├── pages.js            ← Mapa, quiz, timeline, shows, last.fm...
    ├── init.js             ← Busca, favoritos, teclado, inicialização
    │
    ├── themes.js           ← Personalização visual (cores, densidade)
    └── interactions.js     ← Turntable, animações, atalhos extras
```

## Como rodar localmente

```bash
# Opção 1: Python
python3 -m http.server 8000

# Opção 2: Node
npx serve .

# Opção 3: VS Code Live Server
# Instale a extensão "Live Server" e clique em "Go Live"
```

## Como publicar no GitHub Pages

1. Crie um repositório no GitHub
2. Faça upload de todos os arquivos
3. Vá em Settings → Pages → Source: main branch
4. Seu site estará em `https://seu-usuario.github.io/nome-do-repo`

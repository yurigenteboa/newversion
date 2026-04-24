// ═══════════════════════════════════════════════════
//  COUNTRY MAPPINGS
// ═══════════════════════════════════════════════════
// jsvectormap world.js usa códigos ISO em MAIÚSCULAS ('US', 'GB', ...)
const PT_TO_ISO = {
  'Estados Unidos': 'US', 'Reino Unido': 'GB', 'Brasil': 'BR',
  'Alemanha': 'DE', 'França': 'FR', 'Japão': 'JP', 'Canadá': 'CA',
  'Austrália': 'AU', 'Islândia': 'IS', 'Irlanda': 'IE', 'Suécia': 'SE',
  'Jamaica': 'JM', 'Nigéria': 'NG', 'Nigeria': 'NG', 'Argentina': 'AR',
  'Itália': 'IT', 'Espanha': 'ES', 'México': 'MX', 'Suíça': 'CH',
  'Noruega': 'NO', 'Dinamarca': 'DK', 'Nova Zelândia': 'NZ',
  'Coréia do Sul': 'KR', 'Coreia do Sul': 'KR', 'China': 'CN', 'Índia': 'IN',
  'África do Sul': 'ZA', 'Cuba': 'CU', 'Portugal': 'PT', 'Bélgica': 'BE',
  'Holanda': 'NL', 'Países Baixos': 'NL', 'Polônia': 'PL', 'Rússia': 'RU',
  'Venezuela': 'VE', 'Chile': 'CL', 'Colômbia': 'CO', 'Peru': 'PE',
  'Senegal': 'SN', 'Mali': 'ML', 'Gana': 'GH', 'Etiópia': 'ET',
  'Quênia': 'KE', 'Israel': 'IL', 'Turquia': 'TR', 'Hungria': 'HU',
  'República Checa': 'CZ', 'Áustria': 'AT', 'Finlândia': 'FI',
  'Grécia': 'GR', 'Ucrânia': 'UA', 'Bahamas': 'BS', 'Panamá': 'PA',
  'Singapura': 'SG', 'Escócia': 'GB', 'País de Gales': 'GB',
};
// ISO (maiúscula) → nome em português
const ISO_TO_PT = {};
Object.entries(PT_TO_ISO).forEach(([pt, iso]) => { if (!ISO_TO_PT[iso]) ISO_TO_PT[iso] = pt; });

// Flags indexadas em MAIÚSCULAS para casar com jsvectormap
const COUNTRY_FLAGS = {
  'US':'🇺🇸','GB':'🇬🇧','BR':'🇧🇷','DE':'🇩🇪','FR':'🇫🇷','JP':'🇯🇵','CA':'🇨🇦',
  'AU':'🇦🇺','IS':'🇮🇸','IE':'🇮🇪','SE':'🇸🇪','JM':'🇯🇲','NG':'🇳🇬','AR':'🇦🇷',
  'IT':'🇮🇹','ES':'🇪🇸','MX':'🇲🇽','CH':'🇨🇭','NO':'🇳🇴','DK':'🇩🇰','NZ':'🇳🇿',
  'KR':'🇰🇷','CN':'🇨🇳','IN':'🇮🇳','ZA':'🇿🇦','CU':'🇨🇺','PT':'🇵🇹','BE':'🇧🇪',
  'NL':'🇳🇱','PL':'🇵🇱','RU':'🇷🇺','VE':'🇻🇪','CL':'🇨🇱','CO':'🇨🇴','PE':'🇵🇪',
  'SN':'🇸🇳','ML':'🇲🇱','GH':'🇬🇭','ET':'🇪🇹','KE':'🇰🇪','IL':'🇮🇱','TR':'🇹🇷',
  'HU':'🇭🇺','CZ':'🇨🇿','AT':'🇦🇹','FI':'🇫🇮','GR':'🇬🇷','UA':'🇺🇦',
  'BS':'🇧🇸','PA':'🇵🇦','SG':'🇸🇬',
};

// ═══════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════
let collection    = JSON.parse(localStorage.getItem('album1000') || '[]');
let currentPage   = 'collection';
let currentView   = 'grid';
let activeGenre   = 'all';
let activeCountry = 'all';
let activeYear    = 'all';
let activeDecade  = 'all';
let searchQuery   = '';
let sortBy        = 'rank-desc';
let mapInstance   = null;
let showOnlyFavs  = false;

// ─── Nav History ───
const navHistory = [];

// Pagination
let currentAlbumPage = 1;
const ALBUMS_PER_PAGE = 100;

// Modal navigation
let modalAlbumList  = [];
let modalAlbumIndex = -1;


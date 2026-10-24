// Datos y textos comunes de las monedas.

export const ERAS = [
  { id: 'antigua', label: 'Antigua' },
  { id: 'medieval', label: 'Medieval' },
  { id: 'moderna', label: 'Moderna' },
  { id: 'contemporanea', label: 'Contemporánea' },
];
export const eraLabel = (id) => ERAS.find((e) => e.id === id)?.label || id || '—';

export const GRADES = [
  { id: 'RC', label: 'RC', long: 'Regular' },
  { id: 'BC', label: 'BC', long: 'Bien conservada' },
  { id: 'MBC', label: 'MBC', long: 'Muy bien conservada' },
  { id: 'EBC', label: 'EBC', long: 'Extraordinariamente bien conservada' },
  { id: 'SC', label: 'SC', long: 'Sin circular' },
  { id: 'FDC', label: 'FDC', long: 'Flor de cuño' },
];
export const gradeLong = (id) => GRADES.find((g) => g.id === id)?.long || id;

export const METALS = [
  'oro', 'plata', 'cobre', 'bronce', 'latón', 'cuproníquel', 'níquel',
  'aluminio', 'acero', 'zinc', 'bimetálica', 'otro',
];

// Color del canto de cada moneda en la bandeja, según su metal
export const METAL_COLOR = {
  oro: '#D4AF37', plata: '#C3C8CE', cobre: '#B4693A', bronce: '#9E7A3E', latón: '#C9AA50',
  cuproníquel: '#AEB3B8', níquel: '#A3A8AD', aluminio: '#D2D6DB', acero: '#8E949B',
  zinc: '#9AA0A6', bimetálica: '#C9AA50', otro: '#8C93A0',
};

export const STATUSES = [
  { id: 'collection', label: 'En la colección' },
  { id: 'forSale', label: 'En venta' },
  { id: 'sold', label: 'Vendida' },
  { id: 'wishlist', label: 'La busco' },
];
export const statusLabel = (id) => STATUSES.find((s) => s.id === id)?.label || id;

const eur0 = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const eur2 = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function formatEur(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  return Math.abs(n) < 100 ? eur2.format(n) : eur0.format(n);
}

export function flag(code) {
  if (!code || code.length !== 2 || code === 'XX') return '';
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

export function formatYear(coin) {
  if (coin.yearText) return coin.yearText;
  if (coin.year == null) return 's/f';
  return coin.year < 0 ? `${-coin.year} a. C.` : String(coin.year);
}

export const coinValue = (c) => (c.valuation?.mid ?? 0) * (c.quantity || 1);

function keywords(c) {
  const text = [c.title, c.countryName, c.period, c.ruler, c.issuer, c.denomination?.unit, c.year, c.mint, ...(c.events || []), ...(c.tags || [])]
    .filter((x) => x != null && x !== '')
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  return [...new Set(text.split(/[^a-z0-9ñ]+/).filter((w) => w.length > 1))].slice(0, 60);
}

export function normalizeText(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Documento de Firestore a partir de la respuesta del backend
export function coinFromIdentification(ai, valuation, thumbs) {
  const c = {
    title: ai.title,
    countryCode: ai.countryCode,
    countryName: ai.countryName,
    issuer: ai.issuer,
    year: ai.year,
    yearText: ai.yearText,
    yearVisible: ai.yearVisible,
    era: ai.era,
    period: ai.period,
    ruler: ai.ruler,
    denomination: ai.denomination,
    metal: ai.metal,
    finenessPermille: ai.finenessPermille,
    weightG: ai.weightG,
    diameterMm: ai.diameterMm,
    mint: ai.mint,
    mintMark: ai.mintMark,
    isCommemorative: ai.isCommemorative,
    events: ai.events || [],
    tags: [],
    grade: ai.grade,
    gradeSource: 'ai',
    gradeNotes: ai.gradeNotes,
    quantity: 1,
    purchase: { price: null, date: '', place: '' },
    storage: '',
    status: 'collection',
    notes: '',
    description: ai.description,
    identification: {
      model: ai.model,
      confidence: ai.confidence,
      searchQueryEn: ai.searchQueryEn,
      searchQueryEs: ai.searchQueryEs,
    },
    aiEstimate: ai.aiEstimate,
    catalogRef: ai.catalogRef || null,
    valuation,
    thumbs,
  };
  c.searchKeywords = keywords(c);
  return c;
}

export function withKeywords(c) {
  return { ...c, searchKeywords: keywords(c) };
}

// Lo que el backend necesita para recalcular el precio
export function valuationInput(c) {
  return {
    title: c.title,
    year: c.year,
    countryName: c.countryName,
    denomination: c.denomination,
    metal: c.metal,
    finenessPermille: c.finenessPermille,
    weightG: c.weightG,
    mintMark: c.mintMark,
    grade: c.grade,
    catalogRef: c.catalogRef,
    aiEstimate: c.aiEstimate,
    searchQueryEn: c.identification?.searchQueryEn,
    searchQueryEs: c.identification?.searchQueryEs,
  };
}

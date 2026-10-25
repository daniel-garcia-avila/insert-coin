// Monedas de ejemplo para el modo demostración (imágenes dibujadas, no fotos reales).

function coinSvg(face, rim, text, sub) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
<rect width="240" height="240" fill="#10201a"/>
<circle cx="120" cy="120" r="104" fill="${rim}"/>
<circle cx="120" cy="120" r="94" fill="${face}"/>
<circle cx="120" cy="120" r="84" fill="none" stroke="${rim}" stroke-width="2" stroke-dasharray="2 5"/>
<text x="120" y="128" font-family="Georgia,serif" font-size="46" text-anchor="middle" fill="${rim}">${text}</text>
<text x="120" y="164" font-family="Georgia,serif" font-size="16" text-anchor="middle" fill="${rim}">${sub}</text>
</svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

const base = (o) => ({
  issuer: '', ruler: '', mint: '', mintMark: '', diameterMm: null, isCommemorative: false, events: [],
  gradeNotes: 'Desgaste leve en relieves altos.', model: 'demo', confidence: 0.9, yearVisible: true,
  description: { obverse: '', reverse: '', history: '', variants: '' },
  ...o,
});

export const SAMPLES = [
  {
    img: coinSvg('#c8ccd1', '#7d838a', '5', 'PESETAS'),
    coin: base({
      title: '5 pesetas 1949 Franco', countryCode: 'ES', countryName: 'España', issuer: 'Estado Español',
      year: 1949, yearText: '1949 (*19-50)', era: 'contemporanea', period: 'Franco', ruler: 'Francisco Franco',
      denomination: { value: 5, unit: 'pesetas' }, metal: 'cuproníquel', finenessPermille: 0, weightG: 15, mint: 'Madrid',
      grade: 'MBC', aiEstimate: { low: 1.5, high: 4 },
      description: { obverse: 'Busto de Franco a derecha.', reverse: 'Escudo de España con águila.', history: 'Conocido popularmente como "duro", fue la moneda de 5 pesetas más común de la posguerra.', variants: 'Las estrellas 19-52 son más escasas.' },
      searchQueryEn: '5 pesetas Francisco Franco', searchQueryEs: 'moneda 5 pesetas 1949 franco',
    }),
    sources: { numista: 2.5, ebay: [2, 3, 4.5] },
  },
  {
    img: coinSvg('#dfe2e6', '#8f969d', '100', 'PESETAS'),
    coin: base({
      title: '100 pesetas 1966 Franco', countryCode: 'ES', countryName: 'España', issuer: 'Estado Español',
      year: 1966, yearText: '1966 (*19-68)', era: 'contemporanea', period: 'Franco', ruler: 'Francisco Franco',
      denomination: { value: 100, unit: 'pesetas' }, metal: 'plata', finenessPermille: 800, weightG: 19, mint: 'Madrid',
      grade: 'EBC', aiEstimate: { low: 14, high: 22 },
      description: { obverse: 'Busto de Franco a derecha.', reverse: 'Escudo coronado.', history: 'Última moneda española de plata de uso corriente.', variants: 'La variante con estrellas *19-70 es rara y muy cotizada.' },
      searchQueryEn: '100 pesetas Francisco Franco silver', searchQueryEs: 'moneda 100 pesetas 1966 plata',
    }),
    sources: { numista: 16, ebay: [13, 17, 21] },
    melt: 12.9,
  },
  {
    img: coinSvg('#d9bd6a', '#8c7538', '2', 'EURO'),
    coin: base({
      title: '2 euros 2005 Don Quijote', countryCode: 'ES', countryName: 'España', issuer: 'Reino de España',
      year: 2005, yearText: '2005', era: 'contemporanea', period: 'Euro', ruler: 'Juan Carlos I',
      denomination: { value: 2, unit: 'euros' }, metal: 'bimetálica', finenessPermille: 0, weightG: 8.5,
      isCommemorative: true, events: ['IV centenario del Quijote'], grade: 'SC', aiEstimate: { low: 3, high: 6 },
      description: { obverse: 'Don Quijote con lanza y pluma.', reverse: 'Mapa de Europa.', history: 'Primera moneda conmemorativa de 2 euros emitida por España.', variants: '' },
      searchQueryEn: '2 euro Don Quixote', searchQueryEs: 'moneda 2 euros 2005 quijote',
    }),
    sources: { numista: 4, ebay: [3.5, 4.5, 6] },
  },
  {
    img: coinSvg('#cfd3d8', '#80868d', '8', 'REALES'),
    coin: base({
      title: '8 reales 1781 Carlos III', countryCode: 'MX', countryName: 'México', issuer: 'Virreinato de Nueva España',
      year: 1781, yearText: '1781 FF', era: 'moderna', period: 'Carlos III', ruler: 'Carlos III',
      denomination: { value: 8, unit: 'reales' }, metal: 'plata', finenessPermille: 903, weightG: 27.07, mint: 'México', mintMark: 'Mo',
      grade: 'BC', aiEstimate: { low: 60, high: 110 },
      description: { obverse: 'Busto laureado de Carlos III.', reverse: 'Escudo entre columnas de Hércules.', history: 'El "real de a ocho" circuló por medio mundo y sirvió de base al dólar.', variants: 'Comprueba los ensayadores: FF es la más común.' },
      searchQueryEn: '8 reales Carlos III Mexico', searchQueryEs: '8 reales 1781 carlos III',
    }),
    sources: { numista: 85, ebay: [70, 90, 120] },
    melt: 25.6,
  },
  {
    img: coinSvg('#d4d6d9', '#868b91', 'IMP', 'TRAIANVS'),
    coin: base({
      title: 'Denario de Trajano', countryCode: 'IT', countryName: 'Italia', issuer: 'Imperio Romano',
      year: 112, yearText: '103-111', yearVisible: false, era: 'antigua', period: 'Alto Imperio', ruler: 'Trajano',
      denomination: { value: 1, unit: 'denario' }, metal: 'plata', finenessPermille: 900, weightG: 3.3, mint: 'Roma',
      grade: 'MBC', aiEstimate: { low: 70, high: 130 },
      description: { obverse: 'Busto laureado de Trajano.', reverse: 'Figura alegórica en pie.', history: 'Trajano, nacido en Itálica (Sevilla), llevó el Imperio a su máxima extensión.', variants: 'El reverso concreto define el valor.' },
      searchQueryEn: 'Trajan denarius', searchQueryEs: 'denario trajano plata',
    }),
    sources: { numista: null, ebay: [65, 95, 140] },
    melt: 3.1,
  },
];

export function sampleIdentification(i) {
  const s = SAMPLES[i % SAMPLES.length];
  const [lo, med, hi] = s.sources.ebay;
  const ai = s.coin.aiEstimate;
  const pts = [s.sources.numista, med, (ai.low + ai.high) / 2].filter((x) => x != null).sort((a, b) => a - b);
  const mid = pts.length % 2 ? pts[(pts.length - 1) / 2] : (pts[pts.length / 2 - 1] + pts[pts.length / 2]) / 2;
  const sources = {
    ebay: { count: 12, low: lo, median: med, high: hi, searchUrl: `https://www.ebay.es/sch/i.html?_nkw=${encodeURIComponent(s.coin.searchQueryEs)}&LH_Sold=1&LH_Complete=1` },
    ai,
  };
  if (s.sources.numista != null) sources.numista = { price: s.sources.numista, grade: 'vf', url: 'https://es.numista.com/' };
  if (s.melt) sources.metal = { melt: s.melt, pureGrams: +(s.coin.weightG * s.coin.finenessPermille / 1000).toFixed(2), spotEurPerGram: 0.9 };
  return {
    coin: { ...s.coin, catalogRef: null },
    valuation: {
      low: Math.max(Math.min(lo, ai.low, ...pts), s.melt || 0),
      mid: Math.round(Math.max(mid, s.melt || 0) * 100) / 100,
      high: Math.max(hi, ai.high, ...pts),
      currency: 'EUR',
      sources,
      sourceCount: Object.keys(sources).length,
      updatedAt: new Date().toISOString(),
    },
  };
}

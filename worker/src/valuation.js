// Combina las fuentes en un rango de precio con su procedencia.

const round2 = (n) => Math.round(n * 100) / 100;

function median(values) {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function combineValuation({ numista, ebay, metal, ai, errors = {} }) {
  const points = [];
  const lows = [];
  const highs = [];
  const sources = {};

  if (numista?.priceForGrade != null) {
    points.push(numista.priceForGrade);
    sources.numista = {
      price: numista.priceForGrade,
      grade: numista.grade,
      prices: numista.prices,
      url: numista.url,
    };
  } else if (numista) {
    sources.numista = { price: null, prices: numista.prices, url: numista.url };
  }

  if (ebay?.count >= 3) {
    points.push(ebay.median);
    lows.push(ebay.low);
    highs.push(ebay.high);
  }
  if (ebay) sources.ebay = ebay;

  if (ai?.low != null && ai?.high != null) {
    points.push((ai.low + ai.high) / 2);
    lows.push(ai.low);
    highs.push(ai.high);
    sources.ai = ai;
  }

  if (metal?.melt) sources.metal = metal;

  if (!points.length && !metal?.melt) {
    return { low: null, mid: null, high: null, currency: 'EUR', sources, sourceCount: 0, errors, updatedAt: new Date().toISOString() };
  }

  let mid = points.length ? median(points) : metal.melt;
  let low = Math.min(...points, ...lows);
  let high = Math.max(...points, ...highs);
  if (!points.length) low = high = mid;

  // El valor del metal es un suelo: nadie vende una moneda de plata por debajo de su plata.
  if (metal?.melt) {
    low = Math.max(low, metal.melt);
    mid = Math.max(mid, metal.melt);
    high = Math.max(high, mid);
  }

  const sourceCount =
    (numista?.priceForGrade != null ? 1 : 0) +
    (ebay?.count >= 3 ? 1 : 0) +
    (sources.ai ? 1 : 0) +
    (metal?.melt ? 1 : 0);

  return {
    low: round2(low),
    mid: round2(mid),
    high: round2(high),
    currency: 'EUR',
    sources,
    sourceCount,
    errors,
    updatedAt: new Date().toISOString(),
  };
}

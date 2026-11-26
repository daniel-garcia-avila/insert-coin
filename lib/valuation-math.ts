/**
 * Cálculos de tasación compartidos por servidor y navegador (sin llamadas externas).
 */
import { GRADES, type Grade, type SaleLink, type Valuation } from "./types";

function round(value: number): number {
  return value >= 10 ? Math.round(value) : Math.round(value * 100) / 100;
}

/** Precio del estado indicado o, si no hay dato, el del estado disponible más cercano. */
function priceNear(prices: Partial<Record<Grade, number>>, index: number): number | null {
  for (let d = 0; d < GRADES.length; d++) {
    for (const i of [index - d, index + d]) {
      const p = i >= 0 && i < GRADES.length ? prices[GRADES[i]] : undefined;
      if (typeof p === "number" && p > 0) return p;
    }
  }
  return null;
}

/**
 * Rango de valor para un estado de conservación: va desde el punto medio con el estado
 * inferior hasta el punto medio con el superior. Sin estado, se usa el tramo BC–EBC.
 */
export function computeValueRange(valuation: Valuation | null, grade: Grade | null): { min: number; max: number } | null {
  if (!valuation) return null;
  const prices = valuation.grade_prices;
  if (!Object.values(prices).some((p) => typeof p === "number" && p > 0)) return null;

  if (!grade) {
    const low = priceNear(prices, GRADES.indexOf("BC"));
    const high = priceNear(prices, GRADES.indexOf("EBC"));
    if (low == null || high == null) return null;
    return { min: round(Math.min(low, high)), max: round(Math.max(low, high)) };
  }

  const i = GRADES.indexOf(grade);
  const center = priceNear(prices, i);
  if (center == null) return null;
  const below = i > 0 ? prices[GRADES[i - 1]] : undefined;
  const above = i < GRADES.length - 1 ? prices[GRADES[i + 1]] : undefined;
  const min = typeof below === "number" && below > 0 && below < center ? (below + center) / 2 : center * 0.8;
  const max = typeof above === "number" && above > center ? (above + center) / 2 : center * 1.2;
  return { min: round(min), max: round(max) };
}

/** Enlaces para ver precios reales de venta. */
export function buildSaleLinks(query: string, numistaUrl: string | null): SaleLink[] {
  const q = encodeURIComponent(query.trim());
  const links: SaleLink[] = [];
  if (numistaUrl) links.push({ label: "Ficha en Numista", url: numistaUrl });
  else links.push({ label: "Buscar en Numista", url: `https://es.numista.com/catalogue/index.php?r=${q}` });
  links.push({ label: "En venta en todocoleccion", url: `https://www.todocoleccion.net/buscador?bu=${q}` });
  links.push({ label: "Vendidas en eBay", url: `https://www.ebay.es/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1` });
  links.push({ label: "Subastas en Catawiki", url: `https://www.catawiki.com/es/s?q=${q}` });
  return links;
}

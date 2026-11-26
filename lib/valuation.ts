import "server-only";
import { AppError, getCoinRow, updateCoin } from "./coins";
import { estimateValueWithGemini } from "./gemini";
import { findNumistaPrices } from "./numista";
import { buildSaleLinks, computeValueRange } from "./valuation-math";
import type { AiRaw, Coin, CoinRow, Grade, Valuation } from "./types";
import type { CoinUpdate } from "./validation";

/** Texto con el que se busca la moneda (Numista y tiendas). */
function searchQuery(row: CoinRow): string {
  const ai = row.ai_raw as Partial<AiRaw> | null;
  return (
    ai?.numista_query ||
    [row.denomination, row.country, row.year_text ?? row.year].filter(Boolean).join(" ") ||
    row.title ||
    "moneda"
  );
}

function describeForAi(row: CoinRow): string {
  const lines: [string, unknown][] = [
    ["Nombre", row.title],
    ["País", row.country],
    ["Emisor", row.issuer],
    ["Valor facial", row.denomination],
    ["Año", row.year_text ?? row.year],
    ["Ceca", row.mint_mark],
    ["Periodo", row.period],
    ["Material", row.material],
    ["Catálogo", row.km_number],
    ["Estado actual", row.grade],
  ];
  return lines
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");
}

/**
 * Tasa una moneda: primero con los precios de catálogo de Numista (si hay clave y coincidencia)
 * y, si no, con una estimación de la IA. Guarda el detalle y el rango para su estado actual.
 */
export async function valueCoin(id: string): Promise<Coin | null> {
  const row = await getCoinRow(id);
  if (!row) return null;
  if (!row.title && !row.denomination) {
    throw new AppError("Identifica la moneda (o rellena al menos el nombre) antes de tasarla.", 400);
  }

  const query = searchQuery(row);
  let valuation: Valuation;

  const numista = await findNumistaPrices(query, row.year, row.mint_mark, row.year_text);
  if (numista) {
    valuation = {
      source: "numista",
      currency: "EUR",
      grade_prices: numista.grade_prices,
      numista: {
        type_id: numista.type_id,
        issue_id: numista.issue_id,
        title: numista.title,
        url: numista.url,
        issue_label: numista.issue_label,
      },
      notes: null,
      model: null,
      updated_at: new Date().toISOString(),
    };
  } else {
    const { model, estimate } = await estimateValueWithGemini(describeForAi(row));
    const { notes, ...prices } = estimate;
    const grade_prices: Partial<Record<Grade, number>> = {};
    for (const [grade, value] of Object.entries(prices)) if (value != null) grade_prices[grade as Grade] = value;
    valuation = {
      source: "ia",
      currency: "EUR",
      grade_prices,
      numista: null,
      notes,
      model,
      updated_at: new Date().toISOString(),
    };
  }

  const range = computeValueRange(valuation, row.grade);
  return updateCoin(id, {
    valuation,
    value_min: range?.min ?? null,
    value_max: range?.max ?? null,
    value_source: valuation.source === "numista" ? "Numista (catálogo)" : "Estimación IA",
    valued_at: valuation.updated_at,
    numista_id: valuation.numista?.type_id ?? row.numista_id,
    sale_links: buildSaleLinks(query, valuation.numista?.url ?? null),
  });
}

/**
 * Guarda los cambios del formulario. Si cambia el estado de conservación, recalcula el rango
 * de valor con los precios ya guardados (sin gastar llamadas a Numista ni a la IA).
 */
export async function updateCoinFromForm(id: string, changes: CoinUpdate): Promise<Coin | null> {
  if (changes.grade === undefined) return updateCoin(id, changes);
  const row = await getCoinRow(id);
  if (!row) return null;
  const range = computeValueRange(row.valuation, changes.grade);
  return updateCoin(id, {
    ...changes,
    ...(row.valuation ? { value_min: range?.min ?? null, value_max: range?.max ?? null } : {}),
  });
}

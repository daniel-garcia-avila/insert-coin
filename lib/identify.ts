import "server-only";
import { AppError, downloadPhoto, getCoinRow, updateCoin } from "./coins";
import { identifyWithGemini } from "./gemini";
import type { AiRaw, Coin, CoinRow } from "./types";

/**
 * Identifica una moneda con IA y rellena su ficha.
 * - Siempre se sobrescriben los datos de identificación con lo que propone la IA
 *   (el usuario los revisa después en el formulario).
 * - El estado elegido por el usuario (grade) no se toca si ya lo había fijado.
 * - La moneda queda en 'borrador' hasta que el usuario confirma.
 */
export async function identifyCoin(id: string): Promise<Coin | null> {
  const row = await getCoinRow(id);
  if (!row) return null;

  const [obverse, reverse] = await Promise.all([downloadPhoto(row.obverse_path), downloadPhoto(row.reverse_path)]);
  const { model, identification: idf, raw } = await identifyWithGemini([obverse, reverse]);

  const aiRaw: AiRaw = {
    model,
    identified_at: new Date().toISOString(),
    is_coin: idf.is_coin,
    grade_reason: idf.grade_reason,
    notes_for_user: idf.notes_for_user,
    alternatives: idf.alternatives,
    numista_query: idf.numista_query,
    response: raw,
  };

  if (!idf.is_coin) {
    // Guardamos el resultado para mostrar el aviso, pero no tocamos la ficha.
    const coin = await updateCoin(id, { ai_raw: aiRaw, ai_confidence: idf.confidence });
    if (!coin) throw new AppError("Moneda no encontrada.", 404);
    return coin;
  }

  const changes: Partial<CoinRow> = {
    title: idf.title,
    country: idf.country,
    issuer: idf.issuer,
    denomination: idf.denomination,
    year: idf.year,
    year_text: idf.year_text,
    mint_mark: idf.mint_mark,
    era: idf.era,
    period: idf.period,
    ruler: idf.ruler,
    material: idf.material,
    weight_g: idf.weight_g,
    diameter_mm: idf.diameter_mm,
    km_number: idf.km_number,
    description: idf.description,
    interesting_facts: idf.interesting_facts,
    grade_suggested: idf.grade_suggested,
    grade: row.grade ?? idf.grade_suggested,
    ai_confidence: idf.confidence,
    ai_raw: aiRaw,
    status: "borrador",
  };

  return updateCoin(id, changes);
}

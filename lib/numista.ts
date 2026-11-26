import "server-only";
import { getSupabaseAdmin } from "./supabase";
import { GRADES, type Grade } from "./types";

/**
 * Cliente mínimo de la API v3 de Numista (plan gratuito: ~2.000 llamadas/mes).
 * Todas las respuestas se guardan en la tabla numista_cache para no gastar cuota.
 */

const API_BASE = process.env.NUMISTA_API_BASE?.trim() || "https://api.numista.com/v3";
const REQUEST_TIMEOUT_MS = 15_000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function getNumistaKey(): string | null {
  return process.env.NUMISTA_API_KEY?.trim() || null;
}

/** Correspondencia aproximada entre la escala española y la de Numista. */
const NUMISTA_GRADE: Record<Grade, string[]> = {
  MC: ["g"],
  RC: ["vg"],
  BC: ["f"],
  MBC: ["vf"],
  EBC: ["xf"],
  SC: ["au", "unc"],
  FDC: ["unc"],
};

async function cachedGet(path: string, params: Record<string, string>, ttlMs: number): Promise<unknown | null> {
  const apiKey = getNumistaKey();
  if (!apiKey) return null;
  const query = new URLSearchParams(params).toString();
  const key = `${path}?${query}`;
  const supabase = getSupabaseAdmin();

  const { data: cached } = await supabase.from("numista_cache").select("payload, fetched_at").eq("key", key).maybeSingle();
  if (cached && Date.now() - new Date(cached.fetched_at).getTime() < ttlMs) return cached.payload;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE}${path}?${query}`, {
      headers: { "Numista-API-Key": apiKey },
      signal: controller.signal,
    });
    if (response.status === 404) return null;
    if (!response.ok) {
      console.error(`[numista] ${path} HTTP ${response.status}`);
      return cached?.payload ?? null; // si falla, mejor un dato antiguo que nada
    }
    const payload = (await response.json()) as unknown;
    await supabase.from("numista_cache").upsert({ key, payload, fetched_at: new Date().toISOString() });
    return payload;
  } catch (err) {
    console.error(`[numista] Error en ${path}:`, err instanceof Error ? err.message : err);
    return cached?.payload ?? null;
  } finally {
    clearTimeout(timeout);
  }
}

interface NumistaType {
  id: number;
  title: string;
  min_year?: number;
  max_year?: number;
}
interface NumistaIssue {
  id: number;
  year?: number;
  gregorian_year?: number;
  mint_letter?: string;
  comment?: string;
}

export interface NumistaValuation {
  type_id: number;
  issue_id: number | null;
  title: string;
  url: string;
  issue_label: string | null;
  grade_prices: Partial<Record<Grade, number>>;
}

/** Busca la moneda en Numista y devuelve sus precios por estado, o null si no hay coincidencia o precios. */
export async function findNumistaPrices(
  query: string,
  year: number | null,
  mintMark: string | null,
  yearText: string | null = null,
): Promise<NumistaValuation | null> {
  if (!getNumistaKey() || !query.trim()) return null;

  const search = (await cachedGet("/types", { q: query, category: "coin", lang: "es", count: "10" }, 90 * DAY_MS)) as {
    types?: NumistaType[];
  } | null;
  const types = Array.isArray(search?.types) ? search.types : [];
  if (types.length === 0) return null;

  // Prioriza los tipos cuyo rango de años incluye el año de la moneda.
  const type =
    (year != null && types.find((t) => (t.min_year ?? -9999) <= year && year <= (t.max_year ?? 9999))) || types[0];

  const issuesRaw = await cachedGet(`/types/${type.id}/issues`, { lang: "es" }, 90 * DAY_MS);
  const issues = (Array.isArray(issuesRaw) ? issuesRaw : []) as NumistaIssue[];
  const yearIssues = year != null ? issues.filter((i) => (i.gregorian_year ?? i.year) === year) : [];
  const mint = mintMark?.trim().toLowerCase();
  // En pesetas el año de las estrellas (p. ej. "*19-68") distingue emisiones del mismo año.
  const digits = (v: string | undefined | null) => (v ?? "").replace(/\D/g, "");
  const stars = digits(yearText?.match(/\*\s*\d{2}\s*-?\s*\d{2}/)?.[0]);
  const issue =
    (stars && yearIssues.find((i) => digits(i.comment).includes(stars))) ||
    (mint && yearIssues.find((i) => i.mint_letter?.toLowerCase() === mint)) ||
    yearIssues[0] ||
    (issues.length === 1 ? issues[0] : null);

  const grade_prices: Partial<Record<Grade, number>> = {};
  if (issue) {
    const pricesRaw = (await cachedGet(`/types/${type.id}/issues/${issue.id}/prices`, { currency: "EUR", lang: "es" }, 30 * DAY_MS)) as {
      prices?: { grade?: string; price?: number }[];
    } | null;
    const byNumistaGrade = new Map<string, number>();
    for (const p of pricesRaw?.prices ?? []) {
      if (typeof p.grade === "string" && typeof p.price === "number" && p.price > 0) byNumistaGrade.set(p.grade.toLowerCase(), p.price);
    }
    for (const grade of GRADES) {
      const found = NUMISTA_GRADE[grade].map((g) => byNumistaGrade.get(g)).find((v) => v != null);
      if (found != null) grade_prices[grade] = found;
    }
  }

  if (Object.keys(grade_prices).length === 0) return null;
  const issueLabel = issue ? [issue.gregorian_year ?? issue.year, issue.mint_letter, issue.comment].filter(Boolean).join(" ") || null : null;
  return {
    type_id: type.id,
    issue_id: issue?.id ?? null,
    title: type.title,
    url: `https://es.numista.com/catalogue/pieces${type.id}.html`,
    issue_label: issueLabel,
    grade_prices,
  };
}

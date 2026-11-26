import "server-only";
import { z } from "zod";
import { getGeminiConfig } from "./env";
import { AppError } from "./coins";
import { ERAS, GRADES } from "./types";

/**
 * Identificación de monedas con la API de Gemini (plan gratuito).
 * Se llama por REST (sin SDK) y se pide una respuesta JSON con un esquema fijo.
 * Si el modelo principal no tiene cuota o no existe, se prueba con el de reserva.
 */

const API_BASE = process.env.GEMINI_API_BASE?.trim() || "https://generativelanguage.googleapis.com/v1beta/models";
const REQUEST_TIMEOUT_MS = 60_000;

export interface InlineImage {
  base64: string;
  mimeType: string;
}

// ---------------------------------------------------------------------------
// Esquema de la respuesta (formato OpenAPI que entiende Gemini)
// ---------------------------------------------------------------------------
const str = (description: string) => ({ type: "STRING", nullable: true, description });
const num = (description: string) => ({ type: "NUMBER", nullable: true, description });

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    is_coin: { type: "BOOLEAN", description: "true si las fotos muestran una moneda (o medalla/ficha numismática)" },
    title: str("Nombre corto y claro, p. ej. '1 peseta 1966 (*19-68) Franco' o 'Antoniniano de Aureliano'"),
    country: str("País o entidad emisora en castellano, p. ej. 'España', 'Imperio Romano'"),
    issuer: str("Autoridad emisora concreta si difiere del país, p. ej. 'Estado Español', 'Ceca de Roma'"),
    denomination: str("Valor facial en castellano, p. ej. '1 peseta', '2 euros', 'Denario'"),
    year: { type: "INTEGER", nullable: true, description: "Año de acuñación como entero (negativo para a.C.). null si no se puede determinar" },
    year_text: str("Año tal y como debe mostrarse: '1966 (*19-68)', 'c. 270-275 d.C.', 's. XIV'"),
    mint_mark: str("Ceca o marca de ceca si se ve, p. ej. 'Madrid', 'D', 'M'"),
    era: { type: "STRING", nullable: true, enum: [...ERAS], description: "antigua (<500 d.C.), medieval (500-1492), moderna (1492-1808), contemporanea (>1808)" },
    period: str("Periodo histórico o reinado, p. ej. 'Franquismo', 'Felipe II', 'Euro'"),
    ruler: str("Gobernante representado o reinante, si aplica"),
    material: str("Metal o aleación, p. ej. 'Aluminio-bronce', 'Plata 900', 'Bimetálica'"),
    weight_g: num("Peso típico en gramos según catálogo"),
    diameter_mm: num("Diámetro típico en mm según catálogo"),
    km_number: str("Número de catálogo Krause (KM#) si lo conoces con seguridad"),
    description: str("Descripción del anverso y reverso: leyendas, motivos y diseño. 2-4 frases"),
    interesting_facts: str("1-3 curiosidades históricas o numismáticas interesantes sobre esta moneda"),
    grade_suggested: { type: "STRING", nullable: true, enum: [...GRADES], description: "Estado de conservación estimado en escala española" },
    grade_reason: str("Por qué ese estado: desgaste visible, brillo, golpes… (1-2 frases)"),
    confidence: { type: "NUMBER", description: "Confianza en la identificación entre 0 y 1" },
    alternatives: { type: "ARRAY", items: { type: "STRING" }, description: "Otras identificaciones posibles si hay dudas (máx. 3)" },
    numista_query: str("Texto de búsqueda corto para el catálogo Numista, p. ej. 'peseta 1966 Franco'"),
    notes_for_user: str("Avisos útiles para el usuario: qué no se ve bien, si conviene repetir la foto, etc."),
  },
  required: ["is_coin", "confidence", "alternatives"],
  propertyOrdering: [
    "is_coin", "title", "country", "issuer", "denomination", "year", "year_text", "mint_mark", "era", "period",
    "ruler", "material", "weight_g", "diameter_mm", "km_number", "description", "interesting_facts",
    "grade_suggested", "grade_reason", "confidence", "alternatives", "numista_query", "notes_for_user",
  ],
} as const;

const PROMPT = `Eres un numismático experto. Analiza estas dos fotos de la MISMA pieza: la primera es el ANVERSO y la segunda el REVERSO.

Tareas:
1. Identifica la moneda con la mayor precisión posible: país, valor facial, año, ceca, periodo y gobernante.
2. Lee las leyendas y fechas visibles. En pesetas de Franco o Juan Carlos I, indica el año del cuño y el de las estrellas, p. ej. "1966 (*19-68)", si se ven.
3. Estima el estado de conservación con la escala española:
   MC (muy circulada, apenas se distinguen detalles), RC (regular, desgaste fuerte), BC (bien conservada, desgaste claro pero se lee todo),
   MBC (muy bien conservada, desgaste ligero en los puntos altos), EBC (excelentemente bien conservada, desgaste mínimo),
   SC (sin circular, sin desgaste pero con posibles roces), FDC (flor de cuño, perfecta).
   Sé prudente: con una foto se suele sobrestimar el estado. Ante la duda, elige el grado inferior.
4. Aporta datos de catálogo (material, peso, diámetro, KM#) SOLO si los conoces con seguridad; si no, deja null.

Reglas:
- Responde en castellano de España.
- No inventes. Si algo no se puede determinar, usa null y explícalo en notes_for_user.
- "confidence" debe ser realista: < 0.5 si dudas entre varias piezas, > 0.85 solo si la identificación es inequívoca.
- Si las fotos no muestran una moneda, pon is_coin=false y explica el motivo en notes_for_user.`;

// ---------------------------------------------------------------------------
// Validación de la respuesta (por si el modelo devuelve algo inesperado)
// ---------------------------------------------------------------------------
const nullableString = z.string().trim().nullish().transform((v) => (v ? v : null));
const nullableNumber = z.number().nullish().transform((v) => (typeof v === "number" && Number.isFinite(v) ? v : null));

export const identificationSchema = z.object({
  is_coin: z.boolean(),
  title: nullableString,
  country: nullableString,
  issuer: nullableString,
  denomination: nullableString,
  year: z.number().int().nullish().catch(null).transform((v) => v ?? null),
  year_text: nullableString,
  mint_mark: nullableString,
  era: z.enum(ERAS).nullish().catch(null).transform((v) => v ?? null),
  period: nullableString,
  ruler: nullableString,
  material: nullableString,
  weight_g: nullableNumber.catch(null),
  diameter_mm: nullableNumber.catch(null),
  km_number: nullableString,
  description: nullableString,
  interesting_facts: nullableString,
  grade_suggested: z.enum(GRADES).nullish().catch(null).transform((v) => v ?? null),
  grade_reason: nullableString,
  confidence: z.number().catch(0).transform((v) => Math.min(1, Math.max(0, v))),
  alternatives: z.array(z.string()).catch([]).transform((a) => a.filter(Boolean).slice(0, 3)),
  numista_query: nullableString,
  notes_for_user: nullableString,
});

export type Identification = z.infer<typeof identificationSchema>;

// ---------------------------------------------------------------------------
// Llamada a la API
// ---------------------------------------------------------------------------
class ModelUnavailableError extends Error {}

type Part = { text: string } | { inline_data: { mime_type: string; data: string } };

async function callModel(model: string, apiKey: string, parts: Part[], schema: object): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts,
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      }),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new AppError("La IA ha tardado demasiado en responder. Inténtalo de nuevo.", 504);
    }
    throw new AppError("No se pudo contactar con el servicio de IA.", 502);
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 429 || response.status === 404 || response.status === 503) {
    // Sin cuota, modelo inexistente o saturado: se probará el modelo de reserva.
    throw new ModelUnavailableError(`${model}: HTTP ${response.status}`);
  }
  if (response.status === 400 || response.status === 401 || response.status === 403) {
    const body = await response.text().catch(() => "");
    console.error(`[gemini] ${model} HTTP ${response.status}:`, body.slice(0, 500));
    if (/API key not valid|API_KEY_INVALID|PERMISSION_DENIED/i.test(body) || response.status !== 400) {
      throw new AppError("La clave de Gemini no es válida. Revisa GEMINI_API_KEY.", 500);
    }
    throw new AppError("La IA no pudo procesar las fotos.", 502);
  }
  if (!response.ok) {
    console.error(`[gemini] ${model} HTTP ${response.status}`);
    throw new AppError("El servicio de IA ha devuelto un error. Inténtalo más tarde.", 502);
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
  };
  if (data.promptFeedback?.blockReason) {
    throw new AppError("La IA rechazó analizar estas fotos. Prueba con otras.", 422);
  }
  const text = data.candidates?.[0]?.content?.parts
    ?.filter((p) => !p.thought && typeof p.text === "string")
    .map((p) => p.text)
    .join("");
  if (!text) throw new AppError("La IA no devolvió ninguna respuesta. Inténtalo de nuevo.", 502);

  try {
    return JSON.parse(text);
  } catch {
    console.error("[gemini] Respuesta no JSON:", text.slice(0, 500));
    throw new AppError("La respuesta de la IA no tenía el formato esperado. Inténtalo de nuevo.", 502);
  }
}

/** Llama a Gemini pidiendo JSON con un esquema y lo valida; prueba el modelo de reserva si hace falta. */
async function generateJson<T>(
  parts: Part[],
  schema: object,
  validator: z.ZodType<T>,
): Promise<{ model: string; data: T; raw: unknown }> {
  const config = getGeminiConfig();
  if (!config) {
    throw new AppError("Falta configurar GEMINI_API_KEY para usar la IA.", 503);
  }

  for (const model of config.models) {
    try {
      const raw = await callModel(model, config.apiKey, parts, schema);
      const parsed = validator.safeParse(raw);
      if (!parsed.success) {
        console.error("[gemini] Respuesta con formato inválido:", parsed.error.issues.slice(0, 3));
        throw new AppError("La respuesta de la IA no tenía el formato esperado. Inténtalo de nuevo.", 502);
      }
      return { model, data: parsed.data, raw };
    } catch (err) {
      if (err instanceof ModelUnavailableError) {
        console.warn("[gemini] Modelo no disponible, probando el siguiente:", err.message);
        continue;
      }
      throw err;
    }
  }
  throw new AppError(
    "Se ha agotado la cuota gratuita de la IA por ahora. Espera un rato (o hasta mañana) y vuelve a intentarlo.",
    429,
  );
}

export async function identifyWithGemini(
  images: InlineImage[],
): Promise<{ model: string; identification: Identification; raw: unknown }> {
  const parts: Part[] = [
    { text: PROMPT },
    ...images.map((img) => ({ inline_data: { mime_type: img.mimeType, data: img.base64 } })),
  ];
  const { model, data, raw } = await generateJson(parts, RESPONSE_SCHEMA, identificationSchema);
  return { model, identification: data, raw };
}

// ---------------------------------------------------------------------------
// Estimación de precio por la IA (cuando no hay datos de Numista)
// ---------------------------------------------------------------------------
const gradePrice = (g: string) => ({ type: "NUMBER", nullable: true, description: `Precio de mercado en EUR en estado ${g}` });

const VALUE_SCHEMA = {
  type: "OBJECT",
  properties: {
    MC: gradePrice("MC"),
    RC: gradePrice("RC"),
    BC: gradePrice("BC"),
    MBC: gradePrice("MBC"),
    EBC: gradePrice("EBC"),
    SC: gradePrice("SC"),
    FDC: gradePrice("FDC"),
    notes: { type: "STRING", nullable: true, description: "1-2 frases: de qué depende el precio, rareza, si solo vale su valor facial o su metal…" },
  },
  required: ["notes"],
  propertyOrdering: ["MC", "RC", "BC", "MBC", "EBC", "SC", "FDC", "notes"],
} as const;

const price = z.number().nullish().catch(null).transform((v) => (typeof v === "number" && v > 0 && Number.isFinite(v) ? v : null));
const valueEstimateSchema = z.object({
  MC: price, RC: price, BC: price, MBC: price, EBC: price, SC: price, FDC: price,
  notes: z.string().nullish().catch(null).transform((v) => v?.trim() || null),
});
export type ValueEstimate = z.infer<typeof valueEstimateSchema>;

export async function estimateValueWithGemini(coinDescription: string): Promise<{ model: string; estimate: ValueEstimate }> {
  const prompt = `Eres un tasador numismático en España. Estima el valor de mercado ACTUAL, en euros, de esta moneda según su estado de conservación (escala española MC, RC, BC, MBC, EBC, SC, FDC).

Moneda:
${coinDescription}

Reglas:
- Precio realista al que se vende entre coleccionistas en España/Europa (tiendas, todocoleccion, eBay, subastas), no precios de catálogo inflados.
- Las monedas comunes de circulación suelen valer muy poco (su valor facial o unos céntimos/euros). Dilo en notes.
- Si es de plata u oro, el valor mínimo es el de su metal.
- Deja null los estados en los que no tenga sentido o no puedas estimar.
- Sé prudente: si dudas, da cifras conservadoras. Responde en castellano.`;
  const { model, data } = await generateJson([{ text: prompt }], VALUE_SCHEMA, valueEstimateSchema);
  return { model, estimate: data };
}

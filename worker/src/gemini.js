// Identificación de la moneda con Gemini (plan gratuito de Google AI Studio).
// La IA decide todos los datos por sí misma; el usuario no tiene que confirmar nada.

import { HttpError } from './auth.js';

const ERAS = ['antigua', 'medieval', 'moderna', 'contemporanea'];
const METALS = [
  'oro', 'plata', 'cobre', 'bronce', 'latón', 'cuproníquel', 'níquel',
  'aluminio', 'acero', 'zinc', 'bimetálica', 'otro',
];
const GRADES = ['RC', 'BC', 'MBC', 'EBC', 'SC', 'FDC'];

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    isCoin: { type: 'BOOLEAN', description: 'false si la imagen no muestra una moneda' },
    title: { type: 'STRING', description: 'Nombre corto en español: valor, año y emisor. Ej: "5 pesetas 1949 Franco"' },
    countryName: { type: 'STRING', description: 'País actual en español. Ej: "España"' },
    countryCode: { type: 'STRING', description: 'ISO 3166-1 alfa-2 del país actual; "XX" si no aplica' },
    issuer: { type: 'STRING', description: 'Entidad emisora histórica. Ej: "Estado Español", "Imperio Romano"' },
    year: { type: 'INTEGER', description: 'Año de acuñación (negativo para a. C.). Si no se lee, el más probable' },
    yearText: { type: 'STRING', description: 'Año tal como aparece o rango probable. Ej: "1949 (*19-50)" o "1700-1746"' },
    yearVisible: { type: 'BOOLEAN' },
    era: { type: 'STRING', enum: ERAS },
    period: { type: 'STRING', description: 'Reinado o etapa. Ej: "Franco", "Alfonso XIII", "II República", "Euro"' },
    ruler: { type: 'STRING' },
    denominationValue: { type: 'NUMBER' },
    denominationUnit: { type: 'STRING', description: 'Ej: "pesetas", "euros", "reales", "denario"' },
    metal: { type: 'STRING', enum: METALS },
    finenessPermille: { type: 'INTEGER', description: 'Ley en milésimas para oro o plata (ej. 900); 0 si no es metal precioso' },
    weightG: { type: 'NUMBER', description: 'Peso teórico en gramos según catálogo' },
    diameterMm: { type: 'NUMBER' },
    mint: { type: 'STRING', description: 'Ceca. Ej: "Madrid"' },
    mintMark: { type: 'STRING', description: 'Marca de ceca o estrellas visibles' },
    isCommemorative: { type: 'BOOLEAN' },
    events: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Eventos o conmemoraciones. Ej: "Mundial 82"' },
    grade: { type: 'STRING', enum: GRADES, description: 'Estado de conservación, escala española' },
    gradeNotes: { type: 'STRING', description: 'Desgaste, golpes, limpieza, pátina' },
    obverseDescription: { type: 'STRING' },
    reverseDescription: { type: 'STRING' },
    historicalNote: { type: 'STRING', description: '2 o 3 frases de contexto histórico' },
    variantsToCheck: { type: 'STRING', description: 'Variantes, estrellas o errores que cambian mucho el valor' },
    searchQueryEn: { type: 'STRING', description: 'Búsqueda para el catálogo Numista en inglés, sin año. Ej: "5 pesetas Francisco Franco"' },
    searchQueryEs: { type: 'STRING', description: 'Búsqueda para eBay España con año. Ej: "moneda 5 pesetas 1949 Franco plata"' },
    estimatedValueEur: {
      type: 'OBJECT',
      properties: { low: { type: 'NUMBER' }, high: { type: 'NUMBER' } },
      required: ['low', 'high'],
    },
    confidence: { type: 'NUMBER', description: 'Confianza de la identificación de 0 a 1' },
  },
  required: [
    'isCoin', 'title', 'countryName', 'countryCode', 'year', 'yearText', 'yearVisible', 'era',
    'period', 'denominationValue', 'denominationUnit', 'metal', 'finenessPermille', 'weightG',
    'isCommemorative', 'events', 'grade', 'gradeNotes', 'historicalNote', 'searchQueryEn',
    'searchQueryEs', 'estimatedValueEur', 'confidence',
  ],
};

const PROMPT = `Eres un numismático experto que cataloga colecciones en España.
Analiza las fotos (anverso y, si está, reverso) y determina TODOS los datos de la moneda tú mismo,
sin pedir confirmación: país, emisor, año, época, reinado o etapa, valor facial, metal, ley, peso,
ceca, si es conmemorativa y a qué evento, y su estado de conservación.

Reglas:
- Lee las leyendas, fechas y marcas de ceca. Si el año no se lee, deduce el más probable por el diseño
  y marca yearVisible=false. En pesetas de Franco o Juan Carlos, el año de acuñación real es el de las
  estrellas si se ven.
- era: antigua (hasta 476), medieval (476-1492), moderna (1492-1789), contemporanea (desde 1789).
- grade en escala española: RC, BC, MBC, EBC, SC, FDC. Juzga solo por lo que se ve en la foto.
- estimatedValueEur: rango de precio de mercado en euros en España hoy para ESTA moneda en ESTE estado
  (lo que se paga entre coleccionistas o en tienda). Si es una moneda corriente sin valor numismático,
  da su valor real (puede ser céntimos). No exageres.
- Si no es una moneda, isCoin=false y rellena el resto con valores vacíos o 0.
Responde solo con el JSON pedido.`;

async function callModel(model, images, env) {
  const parts = [{ text: PROMPT }];
  images.forEach((img, i) => {
    parts.push({ text: i === 0 ? 'Anverso:' : 'Reverso:' });
    parts.push({ inline_data: { mime_type: img.mimeType || 'image/jpeg', data: img.data } });
  });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: SCHEMA,
          temperature: 0.2,
        },
      }),
    },
  );
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(text.slice(0, 300));
    err.status = res.status;
    throw err;
  }
  const data = JSON.parse(text);
  const out = (data.candidates?.[0]?.content?.parts || [])
    .filter((p) => !p.thought && typeof p.text === 'string')
    .map((p) => p.text)
    .join('');
  if (!out) throw new HttpError(502, 'La IA no devolvió resultado; prueba con otra foto');
  return JSON.parse(out);
}

export async function identifyCoin(images, env) {
  if (!env.GEMINI_API_KEY) throw new HttpError(500, 'Falta configurar GEMINI_API_KEY en el backend');
  if (!Array.isArray(images) || !images.length || images.length > 2) {
    throw new HttpError(400, 'Envía una o dos fotos (anverso y reverso)');
  }
  const models = [env.GEMINI_MODEL || 'gemini-flash-latest', env.GEMINI_FALLBACK_MODEL || 'gemini-flash-lite-latest']
    .filter((m, i, a) => m && a.indexOf(m) === i);

  let lastErr;
  for (const model of models) {
    try {
      const result = await callModel(model, images, env);
      return { ...normalize(result), model };
    } catch (e) {
      lastErr = e;
      // Con límite gratuito agotado (429) o modelo no disponible (404), probamos el de respaldo.
      if (![404, 429, 500, 503].includes(e.status)) break;
    }
  }
  if (lastErr?.status === 429) {
    throw new HttpError(429, 'Se ha alcanzado el límite gratuito de la IA por ahora. Espera un minuto y vuelve a intentarlo.');
  }
  if (lastErr instanceof HttpError) throw lastErr;
  throw new HttpError(502, `No se pudo identificar la moneda: ${lastErr?.message || 'error de la IA'}`);
}

function num(v, fallback = null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalize(r) {
  const low = num(r.estimatedValueEur?.low, null);
  const high = num(r.estimatedValueEur?.high, null);
  return {
    isCoin: r.isCoin !== false,
    title: String(r.title || 'Moneda sin identificar').slice(0, 200),
    countryName: r.countryName || '',
    countryCode: String(r.countryCode || 'XX').toUpperCase().slice(0, 2),
    issuer: r.issuer || '',
    year: num(r.year, null),
    yearText: r.yearText || (r.year ? String(r.year) : ''),
    yearVisible: r.yearVisible !== false,
    era: ERAS.includes(r.era) ? r.era : 'contemporanea',
    period: r.period || '',
    ruler: r.ruler || '',
    denomination: { value: num(r.denominationValue, null), unit: r.denominationUnit || '' },
    metal: METALS.includes(r.metal) ? r.metal : 'otro',
    finenessPermille: num(r.finenessPermille, 0),
    weightG: num(r.weightG, null),
    diameterMm: num(r.diameterMm, null),
    mint: r.mint || '',
    mintMark: r.mintMark || '',
    isCommemorative: !!r.isCommemorative,
    events: Array.isArray(r.events) ? r.events.filter(Boolean).slice(0, 20) : [],
    grade: GRADES.includes(r.grade) ? r.grade : 'MBC',
    gradeNotes: r.gradeNotes || '',
    description: {
      obverse: r.obverseDescription || '',
      reverse: r.reverseDescription || '',
      history: r.historicalNote || '',
      variants: r.variantsToCheck || '',
    },
    searchQueryEn: r.searchQueryEn || r.title || '',
    searchQueryEs: r.searchQueryEs || r.title || '',
    aiEstimate:
      low !== null && high !== null
        ? { low: Math.min(low, high), high: Math.max(low, high) }
        : null,
    confidence: Math.max(0, Math.min(1, num(r.confidence, 0.5))),
  };
}

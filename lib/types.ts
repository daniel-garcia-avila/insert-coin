export const GRADES = ["MC", "RC", "BC", "MBC", "EBC", "SC", "FDC"] as const;
export type Grade = (typeof GRADES)[number];

export const GRADE_LABELS: Record<Grade, string> = {
  MC: "Muy circulada",
  RC: "Regular conservación",
  BC: "Bien conservada",
  MBC: "Muy bien conservada",
  EBC: "Excelentemente bien conservada",
  SC: "Sin circular",
  FDC: "Flor de cuño",
};

export const ERAS = ["antigua", "medieval", "moderna", "contemporanea"] as const;
export type Era = (typeof ERAS)[number];

export const ERA_LABELS: Record<Era, string> = {
  antigua: "Antigua",
  medieval: "Medieval",
  moderna: "Moderna",
  contemporanea: "Contemporánea",
};

export type CoinStatus = "borrador" | "confirmada";

export interface SaleLink {
  label: string;
  url: string;
}

/** Fila tal y como está en la base de datos. */
export interface CoinRow {
  id: string;
  created_at: string;
  updated_at: string;
  status: CoinStatus;
  obverse_path: string;
  reverse_path: string;
  country: string | null;
  issuer: string | null;
  denomination: string | null;
  year: number | null;
  year_text: string | null;
  mint_mark: string | null;
  era: Era | null;
  period: string | null;
  ruler: string | null;
  material: string | null;
  weight_g: number | null;
  diameter_mm: number | null;
  numista_id: number | null;
  km_number: string | null;
  title: string | null;
  description: string | null;
  interesting_facts: string | null;
  grade: Grade | null;
  grade_suggested: Grade | null;
  value_min: number | null;
  value_max: number | null;
  value_source: string | null;
  valued_at: string | null;
  quantity: number;
  notes: string | null;
  ai_confidence: number | null;
  sale_links: SaleLink[];
  ai_raw: unknown;
  valuation: Valuation | null;
}

export type ValuationSource = "numista" | "ia";

/** Detalle de la tasación guardado en coins.valuation. Los precios son en EUR. */
export interface Valuation {
  source: ValuationSource;
  currency: "EUR";
  /** Precio estimado por estado de conservación (escala española). */
  grade_prices: Partial<Record<Grade, number>>;
  /** Ficha de Numista usada, si la fuente es Numista. */
  numista: { type_id: number; issue_id: number | null; title: string; url: string; issue_label: string | null } | null;
  /** Comentario de la IA sobre el precio (rareza, si vale su valor facial…). */
  notes: string | null;
  model: string | null;
  updated_at: string;
}

/** Resumen de la última identificación por IA que se muestra al usuario. */
export interface AiSummary {
  model: string;
  identified_at: string;
  is_coin: boolean;
  grade_reason: string | null;
  notes_for_user: string | null;
  alternatives: string[];
}

/** Lo que se guarda en coins.ai_raw tras identificar. */
export interface AiRaw extends AiSummary {
  numista_query: string | null;
  response: unknown;
}

/** Moneda que se envía al navegador: sin datos internos y con URLs firmadas de las fotos. */
export type Coin = Omit<CoinRow, "ai_raw" | "obverse_path" | "reverse_path"> & {
  obverse_url: string | null;
  reverse_url: string | null;
  ai: AiSummary | null;
};

export interface ApiError {
  error: string;
}

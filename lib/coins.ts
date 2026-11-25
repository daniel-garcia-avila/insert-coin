import "server-only";
import { randomUUID } from "node:crypto";
import { getSupabaseAdmin, PHOTO_BUCKET } from "./supabase";
import { EXTENSION_BY_TYPE } from "./validation";
import type { AiRaw, AiSummary, Coin, CoinRow } from "./types";
import type { CoinUpdate } from "./validation";

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hora

/** Error con mensaje apto para mostrar al usuario y código HTTP. */
export class AppError extends Error {
  constructor(message: string, public readonly status = 500) {
    super(message);
  }
}

async function attachSignedUrls(rows: CoinRow[]): Promise<Coin[]> {
  if (rows.length === 0) return [];
  const supabase = getSupabaseAdmin();
  const paths = rows.flatMap((r) => [r.obverse_path, r.reverse_path]);
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (error) console.error("[coins] Error firmando URLs:", error.message);

  const urlByPath = new Map<string, string>();
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) urlByPath.set(item.path, item.signedUrl);
  }

  return rows.map((row) => {
    const { ai_raw, obverse_path, reverse_path, ...rest } = row;
    return {
      ...rest,
      obverse_url: urlByPath.get(obverse_path) ?? null,
      reverse_url: urlByPath.get(reverse_path) ?? null,
      ai: toAiSummary(ai_raw),
    };
  });
}

function toAiSummary(raw: unknown): AiSummary | null {
  if (!raw || typeof raw !== "object" || !("identified_at" in raw)) return null;
  const r = raw as AiRaw;
  return {
    model: r.model,
    identified_at: r.identified_at,
    is_coin: r.is_coin,
    grade_reason: r.grade_reason ?? null,
    notes_for_user: r.notes_for_user ?? null,
    alternatives: Array.isArray(r.alternatives) ? r.alternatives : [],
  };
}

/** Fila completa (con rutas de fotos y ai_raw). Solo para uso interno del servidor. */
export async function getCoinRow(id: string): Promise<CoinRow | null> {
  const { data, error } = await getSupabaseAdmin().from("coins").select("*").eq("id", id).maybeSingle();
  if (error) {
    console.error("[coins] Error leyendo fila:", error.message);
    throw new AppError("No se pudo cargar la moneda.");
  }
  return (data as CoinRow | null) ?? null;
}

/** Actualiza campos de una moneda. Devuelve null si no existe. */
export async function updateCoin(id: string, changes: CoinUpdate | Partial<CoinRow>): Promise<Coin | null> {
  const { data, error } = await getSupabaseAdmin().from("coins").update(changes).eq("id", id).select("*").maybeSingle();
  if (error) {
    console.error("[coins] Error actualizando:", error.message);
    throw new AppError("No se pudieron guardar los cambios.");
  }
  if (!data) return null;
  const [coin] = await attachSignedUrls([data as CoinRow]);
  return coin;
}

/** Descarga una foto del almacén privado (para enviarla a la IA). */
export async function downloadPhoto(path: string): Promise<{ base64: string; mimeType: string }> {
  const { data, error } = await getSupabaseAdmin().storage.from(PHOTO_BUCKET).download(path);
  if (error || !data) {
    console.error("[coins] Error descargando foto:", error?.message);
    throw new AppError("No se pudieron leer las fotos de la moneda.");
  }
  const buffer = Buffer.from(await data.arrayBuffer());
  const mimeType = data.type || (path.endsWith(".png") ? "image/png" : path.endsWith(".jpg") ? "image/jpeg" : "image/webp");
  return { base64: buffer.toString("base64"), mimeType };
}

export async function listCoins(): Promise<Coin[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("coins")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[coins] Error listando:", error.message);
    throw new AppError("No se pudo cargar el inventario.");
  }
  return attachSignedUrls((data ?? []) as CoinRow[]);
}

export async function getCoin(id: string): Promise<Coin | null> {
  const { data, error } = await getSupabaseAdmin().from("coins").select("*").eq("id", id).maybeSingle();
  if (error) {
    console.error("[coins] Error leyendo:", error.message);
    throw new AppError("No se pudo cargar la moneda.");
  }
  if (!data) return null;
  const [coin] = await attachSignedUrls([data as CoinRow]);
  return coin;
}

/** Sube las dos fotos y crea la moneda en estado 'borrador'. Si algo falla, limpia lo subido. */
export async function createCoinFromPhotos(obverse: File, reverse: File): Promise<Coin> {
  const supabase = getSupabaseAdmin();
  const id = randomUUID();
  const ext = (f: File) => EXTENSION_BY_TYPE[f.type as keyof typeof EXTENSION_BY_TYPE];
  const obversePath = `${id}/anverso.${ext(obverse)}`;
  const reversePath = `${id}/reverso.${ext(reverse)}`;
  const storage = supabase.storage.from(PHOTO_BUCKET);

  const uploads = await Promise.all([
    storage.upload(obversePath, obverse, { contentType: obverse.type, upsert: false }),
    storage.upload(reversePath, reverse, { contentType: reverse.type, upsert: false }),
  ]);
  const uploadError = uploads.find((u) => u.error)?.error;
  if (uploadError) {
    console.error("[coins] Error subiendo fotos:", uploadError.message);
    await storage.remove([obversePath, reversePath]);
    throw new AppError("No se pudieron guardar las fotos. Inténtalo de nuevo.");
  }

  const { data, error } = await supabase
    .from("coins")
    .insert({ id, obverse_path: obversePath, reverse_path: reversePath, status: "borrador" })
    .select("*")
    .single();
  if (error || !data) {
    console.error("[coins] Error creando registro:", error?.message);
    await storage.remove([obversePath, reversePath]);
    throw new AppError("No se pudo crear la moneda en el inventario.");
  }

  const [coin] = await attachSignedUrls([data as CoinRow]);
  return coin;
}

/** Borra la moneda y sus fotos. Devuelve false si no existía. */
export async function deleteCoin(id: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("coins")
    .select("obverse_path, reverse_path")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[coins] Error buscando para borrar:", error.message);
    throw new AppError("No se pudo borrar la moneda.");
  }
  if (!data) return false;

  const { error: deleteError } = await supabase.from("coins").delete().eq("id", id);
  if (deleteError) {
    console.error("[coins] Error borrando:", deleteError.message);
    throw new AppError("No se pudo borrar la moneda.");
  }

  const { error: storageError } = await supabase.storage
    .from(PHOTO_BUCKET)
    .remove([data.obverse_path, data.reverse_path]);
  if (storageError) console.error("[coins] Fotos huérfanas, no se pudieron borrar:", storageError.message);
  return true;
}

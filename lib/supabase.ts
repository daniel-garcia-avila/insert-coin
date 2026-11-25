import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "./env";

export const PHOTO_BUCKET = "coin-photos";

let client: SupabaseClient | null = null;

/**
 * Cliente de Supabase con la clave SECRETA. Solo se usa en el servidor:
 * salta las políticas RLS, así que nunca debe llegar al navegador.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;
  const env = getServerEnv();
  client = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

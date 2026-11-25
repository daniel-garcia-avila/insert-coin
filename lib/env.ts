import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
  APP_PASSWORD: z.string().min(8, "APP_PASSWORD debe tener al menos 8 caracteres"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET debe tener al menos 32 caracteres"),
  SUPABASE_URL: z.url("SUPABASE_URL debe ser una URL válida"),
  SUPABASE_SECRET_KEY: z.string().min(20, "Falta SUPABASE_SECRET_KEY"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

/**
 * Lee y valida las variables de entorno del servidor.
 * Lanza un error claro si falta alguna, en lugar de fallar más tarde de forma confusa.
 */
export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `- ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Configuración incompleta. Revisa tu archivo .env.local:\n${details}`);
  }
  cached = parsed.data;
  return cached;
}

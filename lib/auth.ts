import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Autenticación mínima de la v1: una contraseña única (APP_PASSWORD).
 * Tras acertarla se guarda una cookie httpOnly firmada con HMAC (SESSION_SECRET)
 * que caduca a los 30 días. No hay usuarios ni base de datos de sesiones.
 *
 * Este módulo no importa "server-only" porque también lo usa proxy.ts,
 * pero solo debe ejecutarse en el servidor (usa node:crypto y secretos).
 */

export const SESSION_COOKIE = "ic_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 días

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  // Comparamos hashes de igual longitud para no filtrar información por tiempos.
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function isPasswordValid(candidate: string, expected: string): boolean {
  return safeEqual(candidate, expected);
}

export function createSessionToken(secret: string, now = Date.now()): string {
  const expiresAt = Math.floor(now / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload = String(expiresAt);
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySessionToken(token: string | undefined, secret: string | undefined, now = Date.now()): boolean {
  if (!token || !secret) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  if (!safeEqual(signature, sign(payload, secret))) return false;
  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && expiresAt > Math.floor(now / 1000);
}

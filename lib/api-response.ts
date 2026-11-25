import "server-only";
import { AppError } from "./coins";

export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

/** Convierte cualquier error en una respuesta JSON segura (sin filtrar detalles internos). */
export function handleRouteError(error: unknown): Response {
  if (error instanceof AppError) return jsonError(error.message, error.status);
  console.error("[api] Error inesperado:", error);
  const message =
    error instanceof Error && error.message.startsWith("Configuración incompleta")
      ? "El servidor no está configurado. Revisa las variables de entorno (.env.local)."
      : "Ha ocurrido un error inesperado.";
  return jsonError(message, 500);
}

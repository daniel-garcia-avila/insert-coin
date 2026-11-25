import { z } from "zod";

export const ALLOWED_IMAGE_TYPES = ["image/webp", "image/jpeg", "image/png"] as const;

/** Límite por foto en el servidor. Las fotos se comprimen antes en el navegador (~150–400 KB). */
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB

export const EXTENSION_BY_TYPE: Record<(typeof ALLOWED_IMAGE_TYPES)[number], string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export const loginSchema = z.object({
  password: z.string().min(1, "Escribe la contraseña").max(200, "Contraseña demasiado larga"),
});

export const coinIdSchema = z.uuid("Identificador de moneda no válido");

/** Valida un archivo de imagen recibido en un formulario multipart. Devuelve un mensaje de error o null. */
export function validateImageFile(value: FormDataEntryValue | null, label: string): string | null {
  if (!value || typeof value === "string") return `Falta la foto del ${label}.`;
  if (value.size === 0) return `La foto del ${label} está vacía.`;
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(value.type)) {
    return `La foto del ${label} debe ser WebP, JPEG o PNG.`;
  }
  if (value.size > MAX_IMAGE_BYTES) return `La foto del ${label} supera los 2 MB.`;
  return null;
}

import { z } from "zod";
import { ERAS, GRADES } from "./types";

// Mensajes de error de zod en castellano
z.config(z.locales.es());

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

// ---------------------------------------------------------------------------
// Edición de una moneda (formulario de revisión/confirmación)
// ---------------------------------------------------------------------------

/** Texto opcional: recorta espacios y convierte "" en null. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .nullable()
    .optional()
    .transform((v) => (v === "" ? null : v));

const optionalNumber = (min: number, max: number, label: string) =>
  z
    .number({ error: `${label} debe ser un número` })
    .min(min, `${label} no puede ser menor que ${min}`)
    .max(max, `${label} no puede ser mayor que ${max}`)
    .nullable()
    .optional();

export const coinUpdateSchema = z
  .object({
    status: z.enum(["borrador", "confirmada"]).optional(),
    title: optionalText(160),
    country: optionalText(120),
    issuer: optionalText(160),
    denomination: optionalText(120),
    year: z
      .number({ error: "El año debe ser un número entero" })
      .int("El año debe ser un número entero")
      .min(-3000, "Año no válido")
      .max(new Date().getFullYear() + 1, "El año no puede ser futuro")
      .nullable()
      .optional(),
    year_text: optionalText(60),
    mint_mark: optionalText(60),
    era: z.enum(ERAS).nullable().optional(),
    period: optionalText(120),
    ruler: optionalText(120),
    material: optionalText(120),
    weight_g: optionalNumber(0, 5000, "El peso"),
    diameter_mm: optionalNumber(0, 500, "El diámetro"),
    km_number: optionalText(40),
    description: optionalText(4000),
    interesting_facts: optionalText(4000),
    grade: z.enum(GRADES).nullable().optional(),
    quantity: z.number().int("La cantidad debe ser un número entero").min(1, "La cantidad mínima es 1").max(100000).optional(),
    notes: optionalText(4000),
  })
  .strict();

export type CoinUpdate = z.infer<typeof coinUpdateSchema>;

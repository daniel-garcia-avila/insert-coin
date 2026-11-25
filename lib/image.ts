/**
 * Compresión de fotos en el navegador antes de subirlas.
 * Reduce a un máximo de 1600 px por lado y convierte a WebP (o JPEG si el
 * navegador no sabe generar WebP). Una foto de móvil de 4–8 MB queda en ~150–400 KB.
 */

const MAX_SIDE_PX = 1600;
const QUALITY = 0.82;
const MAX_INPUT_BYTES = 30 * 1024 * 1024; // 30 MB

export class ImageProcessingError extends Error {}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      // 'from-image' respeta la orientación EXIF de las fotos del móvil.
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Algunos navegadores fallan con ciertos formatos: probamos con <img>.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new ImageProcessingError("El archivo seleccionado no es una imagen.");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new ImageProcessingError("La imagen es demasiado grande (máx. 30 MB).");
  }

  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await decode(file);
  } catch {
    throw new ImageProcessingError(
      "No se pudo leer la imagen. Si es HEIC (iPhone), cambia en Ajustes › Cámara › Formatos a «Más compatible» o usa una captura JPEG.",
    );
  }

  const width = "naturalWidth" in source ? source.naturalWidth : source.width;
  const height = "naturalHeight" in source ? source.naturalHeight : source.height;
  if (!width || !height) throw new ImageProcessingError("La imagen está vacía o dañada.");

  const scale = Math.min(1, MAX_SIDE_PX / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageProcessingError("Tu navegador no permite procesar imágenes.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  if ("close" in source) source.close();

  let blob = await canvasToBlob(canvas, "image/webp");
  if (!blob || blob.type !== "image/webp") blob = await canvasToBlob(canvas, "image/jpeg");
  if (!blob) throw new ImageProcessingError("No se pudo comprimir la imagen.");

  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  return new File([blob], `foto.${ext}`, { type: blob.type });
}

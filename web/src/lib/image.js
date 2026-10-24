// Reduce las fotos en el móvil antes de guardarlas: Firestore admite documentos de hasta 1 MB
// y así cabe la colección entera en el plan gratuito (1 GB).

async function loadBitmap(file) {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* algunos navegadores no aceptan la opción */
    }
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo leer la foto'));
    img.src = URL.createObjectURL(file);
  });
}

function draw(bitmap, maxSide) {
  const w = bitmap.width;
  const h = bitmap.height;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const g = canvas.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function toJpeg(canvas, maxChars, quality) {
  let q = quality;
  let url = canvas.toDataURL('image/jpeg', q);
  while (url.length > maxChars && q > 0.35) {
    q -= 0.1;
    url = canvas.toDataURL('image/jpeg', q);
  }
  return url;
}

// Miniatura cuadrada centrada, para la bandeja del inventario
function squareThumb(bitmap, side) {
  const s = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = side;
  const g = canvas.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(bitmap, (bitmap.width - s) / 2, (bitmap.height - s) / 2, s, s, 0, 0, side, side);
  return canvas;
}

export async function preparePhoto(file) {
  const bitmap = await loadBitmap(file);
  const full = toJpeg(draw(bitmap, 1024), 420_000, 0.8);
  const thumb = toJpeg(squareThumb(bitmap, 240), 24_000, 0.72);
  return { full, thumb };
}

export function dataUrlToPart(dataUrl) {
  const [meta, data] = dataUrl.split(',');
  return { mimeType: /data:(.*?);/.exec(meta)?.[1] || 'image/jpeg', data };
}

export async function dataUrlToFile(dataUrl, name) {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], name, { type: blob.type });
}

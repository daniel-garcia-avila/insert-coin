"use client";

import { useEffect, useRef, useState } from "react";
import { compressImage, ImageProcessingError } from "@/lib/image";
import { btnPrimary, btnSecondary, card } from "@/lib/ui";
import { Spinner } from "./States";

interface PhotoSlotProps {
  label: string; // "Anverso" | "Reverso"
  hint: string;
  file: File | null;
  disabled?: boolean;
  onChange: (file: File | null) => void;
}

/**
 * Hueco para una foto: permite hacerla con la cámara trasera (móvil)
 * o elegirla de la galería/disco (móvil y PC). Comprime al vuelo y muestra vista previa.
 */
export function PhotoSlot({ label, hint, file, disabled, onChange }: PhotoSlotProps) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Crea/libera la URL de vista previa cuando cambia el archivo.
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con un recurso externo (object URL)
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
      setPreviewUrl(null);
    };
  }, [file]);

  async function handleSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    event.target.value = ""; // permite volver a elegir la misma foto
    if (!selected) return;
    setError(null);
    setProcessing(true);
    try {
      onChange(await compressImage(selected));
    } catch (err) {
      setError(err instanceof ImageProcessingError ? err.message : "No se pudo procesar la foto.");
    } finally {
      setProcessing(false);
    }
  }

  const busy = disabled || processing;

  return (
    <section className={`${card} flex flex-col overflow-hidden`} aria-label={`Foto del ${label.toLowerCase()}`}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-arcade text-[10px] text-gold sm:text-xs">{label.toUpperCase()}</h2>
        {file && !processing && <span className="text-xs font-semibold text-success">✓ Lista</span>}
      </div>

      <div className="relative flex aspect-square items-center justify-center bg-surface-2">
        {processing ? (
          <Spinner label="Procesando foto…" />
        ) : previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:)
          <img src={previewUrl} alt={`Vista previa del ${label.toLowerCase()}`} className="h-full w-full object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            <div className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-dashed border-border text-muted">
              <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
            </div>
            <p className="text-xs text-muted">{hint}</p>
          </div>
        )}
      </div>

      <div className="space-y-2 p-3">
        {error && (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={btnPrimary} disabled={busy} onClick={() => cameraInput.current?.click()}>
            {file ? "Repetir" : "Hacer foto"}
          </button>
          <button type="button" className={btnSecondary} disabled={busy} onClick={() => galleryInput.current?.click()}>
            Galería
          </button>
        </div>
      </div>

      {/* capture="environment" abre la cámara trasera en móvil; en PC abre el selector de archivos. */}
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleSelected} />
      <input ref={galleryInput} type="file" accept="image/*" className="hidden" onChange={handleSelected} />
    </section>
  );
}

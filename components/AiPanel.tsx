"use client";

import type { Coin } from "@/lib/types";
import { btnSecondary, card } from "@/lib/ui";
import { formatDate } from "@/lib/format";

function confidenceInfo(value: number | null): { label: string; className: string } {
  if (value == null) return { label: "Sin dato", className: "text-muted border-border" };
  const pct = `${Math.round(value * 100)} %`;
  if (value >= 0.8) return { label: `Alta · ${pct}`, className: "text-success border-success/40" };
  if (value >= 0.5) return { label: `Media · ${pct}`, className: "text-gold border-gold/40" };
  return { label: `Baja · ${pct}`, className: "text-danger border-danger/40" };
}

/** Resumen de lo que ha dicho la IA: confianza, avisos y alternativas. */
export function AiPanel({ coin, onReidentify, busy }: { coin: Coin; onReidentify: () => void; busy: boolean }) {
  const ai = coin.ai;
  if (!ai) return null;
  const confidence = confidenceInfo(coin.ai_confidence);

  return (
    <section className={`${card} space-y-3 p-4`} aria-label="Resultado de la identificación">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-arcade text-[10px] text-cyan">IDENTIFICACION IA</h2>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${confidence.className}`}>Confianza {confidence.label}</span>
      </div>

      {!ai.is_coin && (
        <p className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          La IA no reconoce una moneda en estas fotos. Puedes repetir las fotos o rellenar la ficha a mano.
        </p>
      )}
      {ai.notes_for_user && <p className="text-sm">{ai.notes_for_user}</p>}
      {ai.grade_reason && (
        <p className="text-sm text-muted">
          <span className="font-semibold text-text">Estado sugerido{coin.grade_suggested ? ` (${coin.grade_suggested})` : ""}:</span> {ai.grade_reason}
        </p>
      )}
      {ai.alternatives.length > 0 && (
        <div className="text-sm">
          <p className="font-semibold">También podría ser:</p>
          <ul className="mt-1 list-disc pl-5 text-muted">
            {ai.alternatives.map((alt) => (
              <li key={alt}>{alt}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <p className="text-xs text-muted">
          {ai.model} · {formatDate(ai.identified_at)}
        </p>
        <button type="button" className={`${btnSecondary} px-3 py-1.5 text-xs`} onClick={onReidentify} disabled={busy}>
          ↻ Volver a identificar
        </button>
      </div>
    </section>
  );
}

/** Estado de carga mientras la IA trabaja. */
export function IdentifyingState() {
  return (
    <div role="status" className={`${card} flex flex-col items-center gap-4 px-6 py-10 text-center`}>
      <div className="flex gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-3 w-3 animate-bounce rounded-sm bg-gold" style={{ animationDelay: `${i * 150}ms` }} />
        ))}
      </div>
      <p className="font-arcade text-[10px] text-gold sm:text-xs">ANALIZANDO MONEDA…</p>
      <p className="max-w-xs text-sm text-muted">La IA está leyendo el anverso y el reverso. Suele tardar entre 5 y 30 segundos.</p>
    </div>
  );
}

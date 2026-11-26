"use client";

import { formatDate, formatEUR, formatValueRange } from "@/lib/format";
import { GRADES, type Coin } from "@/lib/types";
import { btnPrimary, btnSecondary, card } from "@/lib/ui";

interface ValueCardProps {
  coin: Coin;
  valuing: boolean;
  error: string | null;
  onValue: () => void;
}

/** Tasación de la moneda: rango para su estado, precios por estado, fuente y enlaces a mercado real. */
export function ValueCard({ coin, valuing, error, onValue }: ValueCardProps) {
  const valuation = coin.valuation;
  const range = formatValueRange(coin.value_min, coin.value_max);
  const canValue = Boolean(coin.title || coin.denomination);

  if (valuing) {
    return (
      <section role="status" className={`${card} flex items-center gap-3 p-4`}>
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-gold border-t-transparent" aria-hidden="true" />
        <div>
          <p className="font-arcade text-[10px] text-gold">CALCULANDO VALOR…</p>
          <p className="mt-1 text-xs text-muted">Consultando precios de mercado.</p>
        </div>
      </section>
    );
  }

  if (!valuation) {
    if (!canValue) return null;
    return (
      <section className={`${card} space-y-3 p-4`}>
        <h2 className="font-arcade text-[10px] text-gold">VALOR DE MERCADO</h2>
        {error ? (
          <p role="alert" className="text-sm text-danger">{error}</p>
        ) : (
          <p className="text-sm text-muted">Calcula cuánto puede valer esta moneda según su estado de conservación.</p>
        )}
        <button type="button" className={btnPrimary} onClick={onValue}>
          {error ? "Reintentar" : "Calcular valor"}
        </button>
      </section>
    );
  }

  const prices = GRADES.filter((g) => valuation.grade_prices[g] != null);
  const isNumista = valuation.source === "numista";

  return (
    <section className={`${card} space-y-4 p-4`} aria-label="Valor de mercado">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-arcade text-[10px] text-gold">VALOR DE MERCADO</h2>
          <p className="mt-2 text-3xl font-bold text-gold">{range ?? "Sin datos"}</p>
          <p className="mt-1 text-xs text-muted">
            {coin.grade ? `Para su estado ${coin.grade}` : "Sin estado indicado: rango de BC a EBC"}
            {coin.quantity > 1 && coin.value_min != null && ` · ×${coin.quantity} piezas`}
          </p>
        </div>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
            isNumista ? "border-success/40 text-success" : "border-cyan/40 text-cyan"
          }`}
        >
          {isNumista ? "Catálogo Numista" : "Estimación IA"}
        </span>
      </div>

      {prices.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted">Precio orientativo por estado</p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {prices.map((g) => {
              const current = g === coin.grade;
              return (
                <div
                  key={g}
                  className={`rounded-xl border px-2 py-2 text-center ${current ? "border-gold bg-gold/10" : "border-border bg-surface-2"}`}
                >
                  <p className={`text-xs font-bold ${current ? "text-gold" : "text-muted"}`}>{g}</p>
                  <p className="mt-0.5 text-sm font-semibold">{formatEUR(valuation.grade_prices[g] as number)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {valuation.notes && <p className="text-sm">{valuation.notes}</p>}
      {isNumista && valuation.numista && (
        <p className="text-xs text-muted">
          Ficha: {valuation.numista.title}
          {valuation.numista.issue_label ? ` · emisión ${valuation.numista.issue_label}` : ""}
        </p>
      )}

      {coin.sale_links.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted">Comprueba precios reales</p>
          <div className="flex flex-wrap gap-2">
            {coin.sale_links.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs font-semibold text-cyan transition hover:border-cyan/60"
              >
                {link.label} ↗
              </a>
            ))}
          </div>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <p className="text-xs text-muted">
          Actualizado el {formatDate(valuation.updated_at)}
          {valuation.model ? ` · ${valuation.model}` : ""}
        </p>
        <button type="button" className={`${btnSecondary} px-3 py-1.5 text-xs`} onClick={onValue}>
          ↻ Actualizar valor
        </button>
      </div>
      <p className="text-[11px] leading-snug text-muted">
        Valor orientativo. El precio real depende del comprador, de la conservación exacta y de variantes. Contrástalo siempre con ventas reales.
      </p>
    </section>
  );
}

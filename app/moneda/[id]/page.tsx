"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ErrorState, InlineError, Spinner } from "@/components/States";
import { ApiClientError, apiFetch } from "@/lib/api-client";
import { formatDate, formatValueRange } from "@/lib/format";
import { ERA_LABELS, GRADE_LABELS, type Coin } from "@/lib/types";
import { btnDanger, btnGhost, btnSecondary, card } from "@/lib/ui";

type LoadState =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "error"; message: string }
  | { status: "ready"; coin: Coin };

export default function CoinDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { coin } = await apiFetch<{ coin: Coin }>(`/api/coins/${id}`);
      setState({ status: "ready", coin });
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 404) setState({ status: "not-found" });
      else setState({ status: "error", message: err instanceof Error ? err.message : "No se pudo cargar la moneda." });
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos desde la API
    void load();
  }, [load]);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiFetch(`/api/coins/${id}`, { method: "DELETE" });
      router.replace("/");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "No se pudo borrar.");
      setDeleting(false);
    }
  }

  if (state.status === "loading") {
    return (
      <div className="flex justify-center py-20">
        <Spinner label="Cargando moneda…" />
      </div>
    );
  }

  if (state.status === "not-found") {
    return (
      <ErrorState message="Esta moneda no existe o ya fue borrada.">
        <Link href="/" className={`${btnSecondary} mt-5`}>
          Volver al inventario
        </Link>
      </ErrorState>
    );
  }

  if (state.status === "error") {
    return (
      <ErrorState
        message={state.message}
        onRetry={() => {
          setState({ status: "loading" });
          void load();
        }}
      />
    );
  }

  const { coin } = state;
  const value = formatValueRange(coin.value_min, coin.value_max);
  const details: [string, string | number | null][] = [
    ["País / emisor", coin.country ?? coin.issuer],
    ["Valor facial", coin.denomination],
    ["Año", coin.year_text ?? coin.year],
    ["Época", coin.era ? ERA_LABELS[coin.era] : null],
    ["Periodo", coin.period],
    ["Material", coin.material],
    ["Conservación", coin.grade ? `${coin.grade} · ${GRADE_LABELS[coin.grade]}` : null],
  ];
  const filledDetails = details.filter(([, v]) => v != null && v !== "");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className={`${btnGhost} -ml-3`}>
          ← Inventario
        </Link>
        {coin.status === "borrador" && (
          <span className="rounded-full border border-cyan/40 px-2.5 py-1 text-xs font-semibold text-cyan">Borrador</span>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-bold">{coin.title ?? "Moneda sin identificar"}</h1>
        <p className="text-sm text-muted">Añadida el {formatDate(coin.created_at)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Photo url={coin.obverse_url} label="Anverso" />
        <Photo url={coin.reverse_url} label="Reverso" />
      </div>

      {coin.status === "borrador" && filledDetails.length === 0 ? (
        <div className={`${card} p-4 text-sm`}>
          <p className="font-semibold text-gold">Fotos guardadas ✓</p>
          <p className="mt-1 text-muted">
            La identificación automática y la tasación llegarán en las siguientes fases. De momento la moneda queda guardada en tu inventario como borrador.
          </p>
        </div>
      ) : (
        <dl className={`${card} divide-y divide-border`}>
          {value && (
            <div className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-sm text-muted">Valor estimado</dt>
              <dd className="font-semibold text-gold">{value}</dd>
            </div>
          )}
          {filledDetails.map(([label, v]) => (
            <div key={label} className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="text-right text-sm font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className={`${card} space-y-3 p-4`}>
        <InlineError message={deleteError} />
        {confirmingDelete ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">¿Borrar esta moneda y sus fotos? No se puede deshacer.</p>
            <div className="flex gap-2">
              <button type="button" className={btnSecondary} onClick={() => setConfirmingDelete(false)} disabled={deleting}>
                Cancelar
              </button>
              <button type="button" className={btnDanger} onClick={handleDelete} disabled={deleting}>
                {deleting ? "Borrando…" : "Sí, borrar"}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className={`${btnGhost} text-danger hover:text-danger`} onClick={() => setConfirmingDelete(true)}>
            Borrar moneda
          </button>
        )}
      </div>
    </div>
  );
}

function Photo({ url, label }: { url: string | null; label: string }) {
  return (
    <figure className={`${card} overflow-hidden`}>
      <div className="aspect-square bg-surface-2">
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" title="Ver a tamaño completo">
            {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal de Supabase */}
            <img src={url} alt={label} className="h-full w-full object-contain text-[0px]" />
          </a>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">Foto no disponible</div>
        )}
      </div>
      <figcaption className="px-3 py-2 text-center font-arcade text-[9px] text-muted">{label.toUpperCase()}</figcaption>
    </figure>
  );
}

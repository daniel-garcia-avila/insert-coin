"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AiPanel, IdentifyingState } from "@/components/AiPanel";
import { CoinForm } from "@/components/CoinForm";
import { ErrorState, InlineError, Spinner } from "@/components/States";
import { ApiClientError, apiFetch } from "@/lib/api-client";
import { arcadeText, formatDate, formatValueRange } from "@/lib/format";
import { ERA_LABELS, GRADE_LABELS, type Coin } from "@/lib/types";
import { btnDanger, btnGhost, btnPrimary, btnSecondary, card } from "@/lib/ui";

type LoadState =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "error"; message: string }
  | { status: "ready"; coin: Coin };

export default function CoinDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const [identifying, setIdentifying] = useState(false);
  const [identifyError, setIdentifyError] = useState<string | null>(null);
  const [manual, setManual] = useState(false); // rellenar a mano sin IA
  const [editing, setEditing] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const autoIdentifyDone = useRef(false);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const identify = useCallback(async () => {
    setIdentifying(true);
    setIdentifyError(null);
    setSavedMessage(null);
    try {
      const { coin } = await apiFetch<{ coin: Coin }>(`/api/coins/${id}/identify`, { method: "POST" });
      setState({ status: "ready", coin });
      setEditing(false);
    } catch (err) {
      setIdentifyError(err instanceof Error ? err.message : "No se pudo identificar la moneda.");
    } finally {
      setIdentifying(false);
    }
  }, [id]);

  const load = useCallback(async () => {
    try {
      const { coin } = await apiFetch<{ coin: Coin }>(`/api/coins/${id}`);
      setState({ status: "ready", coin });

      // Viene de "Nueva moneda": identificamos automáticamente una sola vez.
      const params = new URLSearchParams(window.location.search);
      if (params.get("identificar") === "1" && !autoIdentifyDone.current) {
        autoIdentifyDone.current = true;
        window.history.replaceState(null, "", window.location.pathname);
        if (!coin.ai) void identify();
      }
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 404) setState({ status: "not-found" });
      else setState({ status: "error", message: err instanceof Error ? err.message : "No se pudo cargar la moneda." });
    }
  }, [id, identify]);

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

  function handleSaved(coin: Coin) {
    setState({ status: "ready", coin });
    setEditing(false);
    setManual(false);
    setSavedMessage(coin.status === "confirmada" ? "Moneda guardada en tu colección ✓" : "Borrador guardado ✓");
    window.scrollTo({ top: 0, behavior: "smooth" });
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
  const isDraft = coin.status === "borrador";
  const showForm = !identifying && ((isDraft && (coin.ai !== null || manual)) || editing);
  const showIdentifyCta = !identifying && isDraft && coin.ai === null && !manual && !identifyError;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className={`${btnGhost} -ml-3`}>
          ← Inventario
        </Link>
        {isDraft ? (
          <span className="rounded-full border border-cyan/40 px-2.5 py-1 text-xs font-semibold text-cyan">Borrador</span>
        ) : (
          <span className="rounded-full border border-success/40 px-2.5 py-1 text-xs font-semibold text-success">Confirmada</span>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-bold">{coin.title ?? "Moneda sin identificar"}</h1>
        <p className="text-sm text-muted">Añadida el {formatDate(coin.created_at)}</p>
      </div>

      {savedMessage && (
        <p role="status" className="rounded-xl border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
          {savedMessage}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Photo url={coin.obverse_url} label="Anverso" />
        <Photo url={coin.reverse_url} label="Reverso" />
      </div>

      {identifying && <IdentifyingState />}

      {identifyError && !identifying && (
        <div role="alert" className={`${card} space-y-3 border-danger/40 p-4`}>
          <p className="text-sm font-semibold text-danger">{identifyError}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnSecondary} onClick={() => void identify()}>
              Reintentar
            </button>
            {isDraft && coin.ai === null && (
              <button
                type="button"
                className={btnGhost}
                onClick={() => {
                  setIdentifyError(null);
                  setManual(true);
                }}
              >
                Rellenar a mano
              </button>
            )}
          </div>
        </div>
      )}

      {showIdentifyCta && (
        <div className={`${card} space-y-3 p-4`}>
          <p className="font-semibold text-gold">Fotos guardadas ✓</p>
          <p className="text-sm text-muted">Deja que la IA identifique la moneda y sugiera su estado de conservación. Después podrás revisarlo todo.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnPrimary} onClick={() => void identify()}>
              Identificar con IA
            </button>
            <button type="button" className={btnGhost} onClick={() => setManual(true)}>
              Rellenar a mano
            </button>
          </div>
        </div>
      )}

      {!identifying && <AiPanel coin={coin} onReidentify={() => void identify()} busy={identifying} />}

      {showForm && (
        <>
          {isDraft && <p className="text-sm text-muted">Revisa los datos, ajusta el estado de conservación y confirma.</p>}
          <CoinForm key={`${coin.id}-${coin.updated_at}`} coin={coin} onSaved={handleSaved} onCancel={() => setEditing(false)} />
        </>
      )}

      {!showForm && !identifying && !isDraft && (
        <>
          <CoinDetails coin={coin} />
          <button
            type="button"
            className={`${btnSecondary} w-full`}
            onClick={() => {
              setSavedMessage(null);
              setEditing(true);
            }}
          >
            ✎ Editar ficha
          </button>
        </>
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

function CoinDetails({ coin }: { coin: Coin }) {
  const value = formatValueRange(coin.value_min, coin.value_max);
  const rows: [string, string | number | null][] = [
    ["País", coin.country],
    ["Autoridad emisora", coin.issuer],
    ["Valor facial", coin.denomination],
    ["Año", coin.year_text ?? coin.year],
    ["Ceca", coin.mint_mark],
    ["Época", coin.era ? ERA_LABELS[coin.era] : null],
    ["Periodo", coin.period],
    ["Gobernante", coin.ruler],
    ["Material", coin.material],
    ["Peso", coin.weight_g != null ? `${coin.weight_g} g` : null],
    ["Diámetro", coin.diameter_mm != null ? `${coin.diameter_mm} mm` : null],
    ["Catálogo", coin.km_number],
    ["Conservación", coin.grade ? `${coin.grade} · ${GRADE_LABELS[coin.grade]}` : null],
    ["Cantidad", coin.quantity > 1 ? coin.quantity : null],
  ];
  const filled = rows.filter(([, v]) => v != null && v !== "");

  return (
    <div className="space-y-4">
      <dl className={`${card} divide-y divide-border`}>
        {value && (
          <div className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-sm text-muted">Valor estimado</dt>
            <dd className="font-semibold text-gold">{value}</dd>
          </div>
        )}
        {filled.map(([label, v]) => (
          <div key={label} className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="text-right text-sm font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <TextBlock title="Descripción" text={coin.description} />
      <TextBlock title="Curiosidades" text={coin.interesting_facts} />
      <TextBlock title="Mis notas" text={coin.notes} />
    </div>
  );
}

function TextBlock({ title, text }: { title: string; text: string | null }) {
  if (!text) return null;
  return (
    <section className={`${card} p-4`}>
      <h2 className="mb-2 font-arcade text-[10px] text-gold">{arcadeText(title)}</h2>
      <p className="whitespace-pre-line text-sm leading-relaxed">{text}</p>
    </section>
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

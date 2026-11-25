"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CoinCard } from "@/components/CoinCard";
import { EmptyState, ErrorState } from "@/components/States";
import { apiFetch } from "@/lib/api-client";
import type { Coin } from "@/lib/types";
import { card } from "@/lib/ui";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; coins: Coin[] };

export default function InventoryPage() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const load = useCallback(async () => {
    try {
      const { coins } = await apiFetch<{ coins: Coin[] }>("/api/coins");
      setState({ status: "ready", coins });
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "No se pudo cargar el inventario." });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos desde la API
    void load();
  }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Mi colección</h1>
          {state.status === "ready" && (
            <p className="text-sm text-muted">
              {state.coins.length} {state.coins.length === 1 ? "pieza" : "piezas"}
            </p>
          )}
        </div>
      </div>

      {state.status === "loading" && <InventorySkeleton />}

      {state.status === "error" && (
        <ErrorState
          message={state.message}
          onRetry={() => {
            setState({ status: "loading" });
            void load();
          }}
        />
      )}

      {state.status === "ready" && state.coins.length === 0 && (
        <EmptyState
          title="GAME OVER… ¿O NO?"
          text="Tu colección está vacía. Haz una foto del anverso y otra del reverso de tu primera moneda para empezar."
          actionHref="/nueva"
          actionLabel="+ Añadir mi primera moneda"
        />
      )}

      {state.status === "ready" && state.coins.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {state.coins.map((coin) => (
            <li key={coin.id}>
              <CoinCard coin={coin} />
            </li>
          ))}
        </ul>
      )}

      {/* Botón flotante en móvil */}
      <Link
        href="/nueva"
        className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-gold text-3xl font-bold text-gold-contrast shadow-lg shadow-black/40 transition hover:bg-gold-strong sm:hidden"
        aria-label="Añadir moneda"
      >
        +
      </Link>
    </div>
  );
}

function InventorySkeleton() {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label="Cargando inventario" aria-busy="true">
      {Array.from({ length: 8 }).map((_, i) => (
        <li key={i} className={`${card} animate-pulse overflow-hidden`}>
          <div className="aspect-[2/1] bg-surface-2" />
          <div className="space-y-2 p-3">
            <div className="h-3 w-3/4 rounded bg-surface-2" />
            <div className="h-3 w-1/2 rounded bg-surface-2" />
          </div>
        </li>
      ))}
    </ul>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PhotoSlot } from "@/components/PhotoSlot";
import { InlineError } from "@/components/States";
import { apiFetch } from "@/lib/api-client";
import type { Coin } from "@/lib/types";
import { btnGhost, btnPrimary, card } from "@/lib/ui";

export default function NewCoinPage() {
  const router = useRouter();
  const [obverse, setObverse] = useState<File | null>(null);
  const [reverse, setReverse] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = Boolean(obverse && reverse);

  async function handleSave() {
    if (!obverse || !reverse) {
      setError("Necesitas la foto del anverso y la del reverso.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const form = new FormData();
      form.append("obverse", obverse);
      form.append("reverse", reverse);
      const { coin } = await apiFetch<{ coin: Coin }>("/api/coins", { method: "POST", body: form });
      router.push(`/moneda/${coin.id}?identificar=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la moneda.");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Nueva moneda</h1>
        <Link href="/" className={btnGhost}>
          Cancelar
        </Link>
      </div>

      <details className={`${card} px-4 py-3 text-sm`}>
        <summary className="cursor-pointer font-semibold text-cyan">Consejos para una buena foto</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
          <li>Fondo liso y oscuro (una tela o cartulina negra funciona muy bien).</li>
          <li>Luz natural lateral, sin flash: así se ven los relieves.</li>
          <li>La moneda centrada y ocupando casi toda la foto, bien enfocada.</li>
          <li>Que se lean la fecha y las leyendas si es posible.</li>
        </ul>
      </details>

      <div className="grid gap-4 sm:grid-cols-2">
        <PhotoSlot label="Anverso" hint="Cara principal (normalmente el retrato o el escudo)" file={obverse} onChange={setObverse} disabled={saving} />
        <PhotoSlot label="Reverso" hint="La otra cara (normalmente el valor)" file={reverse} onChange={setReverse} disabled={saving} />
      </div>

      <InlineError message={error} />

      <div className="sticky bottom-0 z-10 -mx-4 bg-bg/90 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:-mx-6 sm:px-6">
        <button
          type="button"
          onClick={handleSave}
          disabled={!ready || saving}
          className={`${btnPrimary} w-full py-3.5 text-base disabled:bg-surface-2 disabled:text-muted disabled:opacity-100`}
        >
          {saving ? "Guardando…" : ready ? "Guardar en mi colección" : "Faltan fotos"}
        </button>
      </div>
    </div>
  );
}

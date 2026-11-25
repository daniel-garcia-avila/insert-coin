"use client";

import { useState } from "react";
import { Logo } from "@/components/Logo";
import { InlineError } from "@/components/States";
import { apiFetch } from "@/lib/api-client";
import { btnPrimary, card, input } from "@/lib/ui";

/** Evita redirecciones abiertas: solo se permiten rutas internas. */
function safeNextPath(): string {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default function AccessPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password.trim()) {
      setError("Escribe la contraseña.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      window.location.href = safeNextPath();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className={`${card} w-full max-w-sm p-6 sm:p-8`}>
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>
        <p className="mt-4 text-center text-sm text-muted">Tu colección, identificada y tasada.</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              autoFocus
              className={input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(error)}
              disabled={loading}
            />
          </div>
          <InlineError message={error} />
          <button type="submit" className={`${btnPrimary} w-full`} disabled={loading}>
            {loading ? "Entrando…" : "PRESS START"}
          </button>
        </form>
      </div>
    </div>
  );
}

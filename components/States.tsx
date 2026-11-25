import Link from "next/link";
import type { ReactNode } from "react";
import { CoinIcon } from "./Logo";
import { btnPrimary, btnSecondary, card } from "@/lib/ui";

export function Spinner({ label = "Cargando…" }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-muted">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
      {label}
    </span>
  );
}

export function EmptyState({ title, text, actionHref, actionLabel }: { title: string; text: string; actionHref?: string; actionLabel?: string }) {
  return (
    <div className={`${card} flex flex-col items-center px-6 py-14 text-center`}>
      <CoinIcon className="h-14 w-14 opacity-80" />
      <h2 className="mt-5 font-arcade text-xs leading-relaxed text-gold sm:text-sm">{title}</h2>
      <p className="mt-3 max-w-sm text-sm text-muted">{text}</p>
      {actionHref && actionLabel && (
        <Link href={actionHref} className={`${btnPrimary} mt-6`}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

export function ErrorState({ message, onRetry, children }: { message: string; onRetry?: () => void; children?: ReactNode }) {
  return (
    <div role="alert" className={`${card} border-danger/40 px-6 py-10 text-center`}>
      <p className="font-semibold text-danger">{message}</p>
      {children}
      {onRetry && (
        <button type="button" onClick={onRetry} className={`${btnSecondary} mt-5`}>
          Reintentar
        </button>
      )}
    </div>
  );
}

export function InlineError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
      {message}
    </p>
  );
}

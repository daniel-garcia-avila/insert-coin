"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { btnGhost, btnPrimary } from "@/lib/ui";

export function AppHeader() {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);
  const isLogin = pathname === "/acceso";

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth", { method: "DELETE" });
    } finally {
      // Recarga completa a propósito: limpia cualquier dato en memoria tras cerrar sesión.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/acceso";
    }
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link href="/" aria-label="Ir al inventario" className="rounded-lg focus-visible:outline-2 focus-visible:outline-cyan">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1">
          {!isLogin && pathname !== "/nueva" && (
            <span className="hidden sm:block">
              <Link href="/nueva" className={`${btnPrimary} px-3 py-2`}>
                + Añadir moneda
              </Link>
            </span>
          )}
          <ThemeToggle />
          {!isLogin && (
            <button type="button" onClick={logout} disabled={loggingOut} className={`${btnGhost} px-2.5`} title="Cerrar sesión" aria-label="Cerrar sesión">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

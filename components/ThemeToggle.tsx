"use client";

import { btnGhost } from "@/lib/ui";

/** Alterna claro/oscuro. El icono se resuelve por CSS, así no hay desajustes de hidratación. */
export function ThemeToggle() {
  function toggle() {
    const isDark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("ic-theme", isDark ? "dark" : "light");
    } catch {
      // Modo privado: el tema no se recordará, pero funciona igual.
    }
  }

  return (
    <button type="button" onClick={toggle} className={`${btnGhost} px-2.5`} aria-label="Cambiar tema claro/oscuro" title="Cambiar tema">
      {/* Sol (visible en oscuro) */}
      <svg viewBox="0 0 24 24" className="hidden h-5 w-5 dark:block" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
      {/* Luna (visible en claro) */}
      <svg viewBox="0 0 24 24" className="h-5 w-5 dark:hidden" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    </button>
  );
}

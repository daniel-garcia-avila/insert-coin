/** Clases reutilizables para mantener un estilo coherente sin librería de componentes. */

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan " +
  "disabled:cursor-not-allowed disabled:opacity-50";

export const btnPrimary = `${base} bg-gold text-gold-contrast hover:bg-gold-strong`;
export const btnSecondary = `${base} border border-border bg-surface text-text hover:bg-surface-2`;
export const btnGhost = `${base} text-muted hover:bg-surface-2 hover:text-text`;
export const btnDanger = `${base} bg-danger text-white hover:opacity-90`;

export const card = "rounded-2xl border border-border bg-surface";

export const input =
  "w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-text placeholder:text-muted " +
  "focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/30";

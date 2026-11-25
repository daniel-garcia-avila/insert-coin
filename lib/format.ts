const eur = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
const dateFmt = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" });

export function formatEUR(value: number): string {
  return eur.format(value);
}

export function formatValueRange(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null && min !== max) return `${formatEUR(min)} – ${formatEUR(max)}`;
  return formatEUR((min ?? max) as number);
}

export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

/** La fuente pixelada no tiene mayúsculas acentuadas: quitamos tildes en los títulos arcade. */
export function arcadeText(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
}

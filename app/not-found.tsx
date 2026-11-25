import { EmptyState } from "@/components/States";

export default function NotFound() {
  return <EmptyState title="404 · PAGINA NO ENCONTRADA" text="Esta pantalla no existe." actionHref="/" actionLabel="Volver al inventario" />;
}

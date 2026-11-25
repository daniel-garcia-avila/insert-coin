import Link from "next/link";
import type { Coin } from "@/lib/types";
import { card } from "@/lib/ui";
import { formatDate, formatValueRange } from "@/lib/format";

export function CoinCard({ coin }: { coin: Coin }) {
  const title = coin.title ?? (coin.status === "borrador" ? "Moneda sin identificar" : "Moneda");
  const subtitle = [coin.country, coin.year_text ?? coin.year].filter(Boolean).join(" · ");
  const value = formatValueRange(coin.value_min, coin.value_max);

  return (
    <Link
      href={`/moneda/${coin.id}`}
      className={`${card} group block overflow-hidden transition hover:border-gold/60 focus-visible:outline-2 focus-visible:outline-cyan`}
    >
      <div className="grid grid-cols-2 gap-px bg-border">
        <CoinThumb url={coin.obverse_url} alt={`Anverso de ${title}`} />
        <CoinThumb url={coin.reverse_url} alt={`Reverso de ${title}`} />
      </div>
      <div className="space-y-1 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold group-hover:text-gold">{title}</h3>
          {coin.status === "borrador" && (
            <span className="shrink-0 rounded-full border border-cyan/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan">
              Borrador
            </span>
          )}
        </div>
        <p className="text-xs text-muted">{subtitle || `Añadida el ${formatDate(coin.created_at)}`}</p>
        {value && <p className="text-sm font-semibold text-gold">{value}</p>}
      </div>
    </Link>
  );
}

function CoinThumb({ url, alt }: { url: string | null; alt: string }) {
  return (
    <div className="aspect-square bg-surface-2">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- URLs firmadas temporales de Supabase
        <img src={url} alt={alt} loading="lazy" className="h-full w-full object-cover text-[0px]" />
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-muted">Sin foto</div>
      )}
    </div>
  );
}

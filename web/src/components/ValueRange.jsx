import { formatEur } from '../lib/coin.js';

// Rango de precio: mínimo, valor central y máximo
export default function ValueRange({ valuation }) {
  if (!valuation || valuation.mid == null) {
    return <p className="muted">Sin precio todavía. Pulsa «Actualizar precio».</p>;
  }
  const { low, mid, high } = valuation;
  const span = high - low;
  const pos = span > 0 ? ((mid - low) / span) * 100 : 50;
  return (
    <div className="range">
      <div className="range-mid">{formatEur(mid)}</div>
      <div className="range-bar" role="img" aria-label={`Entre ${formatEur(low)} y ${formatEur(high)}`}>
        <span className="range-dot" style={{ left: `${pos}%` }} />
      </div>
      <div className="range-ends">
        <span>{formatEur(low)}</span>
        <span>{formatEur(high)}</span>
      </div>
    </div>
  );
}

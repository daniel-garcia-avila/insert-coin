import { METAL_COLOR } from '../lib/coin.js';

// Moneda redonda con el canto del color de su metal
export default function CoinDisc({ src, metal, size = 96, alt = '' }) {
  const rim = METAL_COLOR[metal] || METAL_COLOR.otro;
  return (
    <span className="disc" style={{ '--size': `${size}px`, '--rim': rim }}>
      {src ? <img src={src} alt={alt} loading="lazy" /> : <span className="disc-empty" aria-hidden="true" />}
    </span>
  );
}

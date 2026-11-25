export function CoinIcon({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="14" fill="var(--gold)" />
      <circle cx="16" cy="16" r="10.5" fill="none" stroke="var(--gold-contrast)" strokeOpacity="0.35" strokeWidth="1.5" />
      <rect x="14.5" y="9" width="3" height="14" rx="1" fill="var(--gold-contrast)" fillOpacity="0.55" />
    </svg>
  );
}

export function Logo({ size = "sm" }: { size?: "sm" | "lg" }) {
  const text = size === "lg" ? "text-xl sm:text-2xl" : "text-[11px] sm:text-sm";
  return (
    <span className="inline-flex items-center gap-2.5">
      <CoinIcon className={size === "lg" ? "h-10 w-10" : "h-7 w-7"} />
      <span className={`font-arcade leading-none tracking-tight text-gold ${text}`}>
        INSERT<span className="text-cyan"> COIN</span>
        <span className="animate-blink text-cyan">_</span>
      </span>
    </span>
  );
}

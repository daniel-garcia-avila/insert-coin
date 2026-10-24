// Caché opcional en Workers KV (gratis: 100.000 lecturas y 1.000 escrituras al día).
// Si no hay KV configurado, simplemente no cachea.

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function cachedJson(env, ctx, cacheKey, ttlSeconds, loader) {
  const kv = env.CACHE;
  const key = kv ? `v1:${await sha256(cacheKey)}` : null;
  if (kv) {
    const hit = await kv.get(key, 'json');
    if (hit !== null) return hit;
  }
  const data = await loader();
  if (kv && data !== undefined && data !== null) {
    ctx.waitUntil(
      kv.put(key, JSON.stringify(data), { expirationTtl: Math.max(60, ttlSeconds) }).catch(() => {}),
    );
  }
  return data;
}

export async function fetchJson(url, init = {}) {
  const res = await fetch(url, init);
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} en ${new URL(url).host}: ${text.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  return text ? JSON.parse(text) : null;
}

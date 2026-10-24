// Valor del metal para monedas de oro y plata (gold-api.com, gratuito y sin clave).

import { cachedJson, fetchJson } from './cache.js';

const SYMBOL = { oro: 'XAU', plata: 'XAG' };
const TROY_OZ_G = 31.1034768;

async function spotEurPerOz(sym, env, ctx) {
  return cachedJson(env, ctx, `metal:${sym}:EUR`, 60 * 60 * 6, async () => {
    try {
      const d = await fetchJson(`https://api.gold-api.com/price/${sym}/EUR`);
      if (Number.isFinite(Number(d?.price)) && (!d.currency || d.currency === 'EUR')) return Number(d.price);
    } catch {
      /* probamos en USD */
    }
    const usd = await fetchJson(`https://api.gold-api.com/price/${sym}`);
    const fx = await fetchJson('https://api.frankfurter.app/latest?from=USD&to=EUR');
    return Number(usd.price) * Number(fx.rates.EUR);
  });
}

export async function metalLookup(coin, env, ctx) {
  const sym = SYMBOL[coin.metal];
  if (!sym || !coin.weightG || !coin.finenessPermille) return null;
  const perOz = await spotEurPerOz(sym, env, ctx);
  if (!Number.isFinite(perOz)) return null;
  const pureG = coin.weightG * (coin.finenessPermille / 1000);
  return {
    metal: coin.metal,
    pureGrams: Math.round(pureG * 100) / 100,
    spotEurPerGram: Math.round((perOz / TROY_OZ_G) * 100) / 100,
    melt: Math.round(pureG * (perOz / TROY_OZ_G) * 100) / 100,
  };
}

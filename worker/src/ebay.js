// Precios de anuncios en eBay España con la Browse API oficial (gratuita con cuenta de desarrollador).
// Ojo: son precios pedidos en anuncios activos, no ventas cerradas (esa API es de acceso restringido).

import { cachedJson, fetchJson } from './cache.js';

let tokenCache = { token: null, exp: 0 };

async function getToken(env) {
  if (tokenCache.token && Date.now() < tokenCache.exp - 60_000) return tokenCache.token;
  const basic = btoa(`${env.EBAY_CLIENT_ID}:${env.EBAY_CLIENT_SECRET}`);
  const data = await fetchJson('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      authorization: `Basic ${basic}`,
    },
    body: `grant_type=client_credentials&scope=${encodeURIComponent('https://api.ebay.com/oauth/api_scope')}`,
  });
  tokenCache = { token: data.access_token, exp: Date.now() + (data.expires_in || 7200) * 1000 };
  return tokenCache.token;
}

const LOT_WORDS = /\b(lote|lot|colecci[oó]n|set|x\s?\d+|\d+\s?x|monedas|r[eé]plica|copia|fake|album|álbum|cartera)\b/i;

function quantile(sorted, q) {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

const round2 = (n) => Math.round(n * 100) / 100;

async function search(env, q, withCategory) {
  const token = await getToken(env);
  const params = new URLSearchParams({ q, limit: '50', filter: 'buyingOptions:{FIXED_PRICE}' });
  if (withCategory) params.set('category_ids', env.EBAY_CATEGORY_ID || '11116');
  return fetchJson(`https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`, {
    headers: {
      authorization: `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': env.EBAY_MARKETPLACE || 'EBAY_ES',
      'Accept-Language': 'es-ES',
    },
  });
}

export async function ebayLookup(coin, env, ctx) {
  if (!env.EBAY_CLIENT_ID || !env.EBAY_CLIENT_SECRET) return null;
  const q = (coin.searchQueryEs || coin.title || '').trim();
  if (!q) return null;

  const items = await cachedJson(env, ctx, `ebay:${env.EBAY_MARKETPLACE || 'EBAY_ES'}:${q}`, 60 * 60 * 12, async () => {
    let data = await search(env, q, true);
    if (!data?.itemSummaries?.length) data = await search(env, q, false);
    return (data?.itemSummaries || []).map((i) => ({
      title: i.title,
      price: Number(i.price?.value),
      currency: i.price?.currency,
      url: i.itemWebUrl,
    }));
  });

  let pool = items.filter((i) => i.currency === 'EUR' && Number.isFinite(i.price) && i.price > 0 && !LOT_WORDS.test(i.title || ''));
  if (coin.year != null) {
    const sameYear = pool.filter((i) => String(i.title).includes(String(coin.year)));
    if (sameYear.length >= 3) pool = sameYear;
  }
  const prices = pool.map((i) => i.price).sort((a, b) => a - b);
  const searchUrl = `https://www.ebay.es/sch/i.html?_nkw=${encodeURIComponent(q)}&LH_Sold=1&LH_Complete=1`;
  if (!prices.length) return { count: 0, searchUrl, query: q };

  return {
    count: prices.length,
    low: round2(quantile(prices, 0.25)),
    median: round2(quantile(prices, 0.5)),
    high: round2(quantile(prices, 0.75)),
    query: q,
    searchUrl,
    examples: pool
      .sort((a, b) => Math.abs(a.price - quantile(prices, 0.5)) - Math.abs(b.price - quantile(prices, 0.5)))
      .slice(0, 3)
      .map(({ title, price, url }) => ({ title, price, url })),
  };
}

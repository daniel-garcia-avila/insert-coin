// Catálogo y precios de Numista (clave gratuita: https://es.numista.com/api/).
// Cada consulta se cachea para no gastar la cuota gratuita.

import { cachedJson, fetchJson } from './cache.js';

// Escala española -> escala de Numista
export const GRADE_TO_NUMISTA = { RC: 'vg', BC: 'f', MBC: 'vf', EBC: 'xf', SC: 'unc', FDC: 'bu' };

function base(env) {
  return (env.NUMISTA_BASE || 'https://api.numista.com/v3').replace(/\/$/, '');
}

function get(env, ctx, path, ttl) {
  const url = `${base(env)}${path}`;
  return cachedJson(env, ctx, `numista:${url}`, ttl, () =>
    fetchJson(url, { headers: { 'Numista-API-Key': env.NUMISTA_API_KEY } }),
  );
}

function scoreType(t, coin) {
  let s = 0;
  const y = coin.year;
  if (y != null && t.min_year != null && t.max_year != null) {
    if (y >= t.min_year && y <= t.max_year) s += 5;
    else s -= Math.min(5, Math.abs(y < t.min_year ? t.min_year - y : y - t.max_year) / 5);
  }
  const title = String(t.title || '').toLowerCase();
  const val = coin.denomination?.value;
  if (val != null && new RegExp(`(^|\\D)${String(val).replace('.', '[.,]')}(\\D|$)`).test(title)) s += 2;
  const unit = String(coin.denomination?.unit || '').toLowerCase().replace(/s$/, '');
  if (unit && title.includes(unit)) s += 2;
  if (coin.countryName && String(t.issuer?.name || '').toLowerCase().includes(coin.countryName.toLowerCase())) s += 1;
  return s;
}

async function findType(coin, env, ctx) {
  const q = coin.searchQueryEn || coin.title;
  if (!q) return null;
  const tries = [];
  if (coin.year != null) tries.push({ q, year: String(coin.year) });
  tries.push({ q });
  for (const t of tries) {
    const params = new URLSearchParams({ ...t, category: 'coin', lang: 'es', count: '15' });
    const data = await get(env, ctx, `/types?${params}`, 60 * 60 * 24 * 30);
    const types = data?.types || [];
    if (types.length) {
      return types
        .map((type) => ({ type, score: scoreType(type, coin) }))
        .sort((a, b) => b.score - a.score)[0].type;
    }
  }
  return null;
}

function pickIssue(issues, coin) {
  if (!Array.isArray(issues) || !issues.length) return null;
  const y = coin.year;
  const sameYear = issues.filter((i) => (i.gregorian_year ?? i.year) === y);
  const pool = sameYear.length ? sameYear : issues;
  if (coin.mintMark) {
    const mm = coin.mintMark.toLowerCase();
    const byMark = pool.find((i) => String(i.mint_letter || i.marks?.[0]?.title || '').toLowerCase().includes(mm));
    if (byMark) return byMark;
  }
  if (sameYear.length) return sameYear[0];
  if (y == null) return issues[0];
  return [...issues].sort(
    (a, b) => Math.abs((a.gregorian_year ?? a.year ?? 0) - y) - Math.abs((b.gregorian_year ?? b.year ?? 0) - y),
  )[0];
}

export async function numistaLookup(coin, env, ctx) {
  if (!env.NUMISTA_API_KEY) return null;

  let typeId = coin.catalogRef?.typeId || null;
  let issueId = coin.catalogRef?.issueId || null;
  let type = null;

  if (!typeId) {
    type = await findType(coin, env, ctx);
    if (!type) return null;
    typeId = type.id;
  }

  if (!issueId) {
    const issues = await get(env, ctx, `/types/${typeId}/issues?lang=es`, 60 * 60 * 24 * 30);
    const issue = pickIssue(Array.isArray(issues) ? issues : issues?.issues, coin);
    issueId = issue?.id || null;
  }

  let prices = {};
  if (issueId) {
    // Precios: caché de 24 h
    const p = await get(env, ctx, `/types/${typeId}/issues/${issueId}/prices?currency=EUR&lang=es`, 60 * 60 * 24);
    for (const row of p?.prices || []) {
      const v = Number(row.price);
      if (row.grade && Number.isFinite(v)) prices[row.grade] = v;
    }
  }

  const numGrade = GRADE_TO_NUMISTA[coin.grade] || 'vf';
  return {
    typeId,
    issueId,
    title: type?.title || coin.catalogRef?.title || null,
    thumbnail: type?.obverse_thumbnail || coin.catalogRef?.thumbnail || null,
    url: `https://es.numista.com/catalogue/pieces${typeId}.html`,
    prices,
    grade: numGrade,
    priceForGrade: prices[numGrade] ?? null,
  };
}

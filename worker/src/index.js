// Backend gratuito de la app de monedas (Cloudflare Workers, plan Free).
//   POST /identify  { images: [{ mimeType, data(base64) }] }  -> identificación + precios
//   POST /valuate   { coin }                                    -> precios actualizados
//   GET  /health

import { verifyFirebaseToken, HttpError } from './auth.js';
import { identifyCoin } from './gemini.js';
import { numistaLookup } from './numista.js';
import { ebayLookup } from './ebay.js';
import { metalLookup } from './metal.js';
import { combineValuation } from './valuation.js';

function corsHeaders(request, env) {
  const origin = request.headers.get('origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
  const ok = !allowed.length || allowed.includes(origin);
  return {
    'access-control-allow-origin': ok ? origin || '*' : allowed[0],
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });
}

async function settle(name, promise, errors) {
  try {
    return await promise;
  } catch (e) {
    errors[name] = String(e.message || e).slice(0, 200);
    return null;
  }
}

export async function priceCoin(coin, env, ctx) {
  const errors = {};
  const [numista, ebay, metal] = await Promise.all([
    settle('numista', numistaLookup(coin, env, ctx), errors),
    settle('ebay', ebayLookup(coin, env, ctx), errors),
    settle('metal', metalLookup(coin, env, ctx), errors),
  ]);
  const valuation = combineValuation({ numista, ebay, metal, ai: coin.aiEstimate, errors });
  const catalogRef = numista
    ? { source: 'numista', typeId: numista.typeId, issueId: numista.issueId, title: numista.title, url: numista.url, thumbnail: numista.thumbnail }
    : coin.catalogRef || null;
  return { valuation, catalogRef };
}

const MAX_IMAGE_B64 = 1_500_000; // ~1,1 MB por foto

export default {
  async fetch(request, env, ctx) {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const { pathname } = new URL(request.url);

    try {
      if (pathname === '/health') {
        return json({
          ok: true,
          gemini: !!env.GEMINI_API_KEY,
          numista: !!env.NUMISTA_API_KEY,
          ebay: !!(env.EBAY_CLIENT_ID && env.EBAY_CLIENT_SECRET),
          cache: !!env.CACHE,
        }, 200, cors);
      }
      if (request.method !== 'POST') throw new HttpError(405, 'Método no permitido');

      await verifyFirebaseToken(request, env);
      const body = await request.json().catch(() => {
        throw new HttpError(400, 'Petición no válida');
      });

      if (pathname === '/identify') {
        const images = (body.images || []).slice(0, 2);
        if (images.some((i) => typeof i?.data !== 'string' || i.data.length > MAX_IMAGE_B64)) {
          throw new HttpError(413, 'Foto demasiado grande o no válida');
        }
        const coin = await identifyCoin(images, env);
        if (!coin.isCoin) {
          throw new HttpError(422, 'No se ve ninguna moneda en la foto. Prueba más cerca y con buena luz.');
        }
        const { valuation, catalogRef } = await priceCoin(coin, env, ctx);
        return json({ coin: { ...coin, catalogRef }, valuation }, 200, cors);
      }

      if (pathname === '/valuate') {
        const coin = body.coin;
        if (!coin || typeof coin !== 'object') throw new HttpError(400, 'Falta la moneda');
        const result = await priceCoin(coin, env, ctx);
        return json(result, 200, cors);
      }

      throw new HttpError(404, 'Ruta no encontrada');
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      return json({ error: e.message || 'Error inesperado' }, status, cors);
    }
  },
};

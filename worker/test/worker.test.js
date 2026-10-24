import { test } from 'node:test';
import assert from 'node:assert/strict';
import { combineValuation } from '../src/valuation.js';
import { verifyFirebaseToken } from '../src/auth.js';
import worker from '../src/index.js';

const ctx = { waitUntil() {} };

test('combina fuentes y respeta el valor del metal como suelo', () => {
  const v = combineValuation({
    numista: { priceForGrade: 20, grade: 'vf', prices: { vf: 20 }, url: 'u' },
    ebay: { count: 8, low: 15, median: 24, high: 32 },
    metal: { melt: 18 },
    ai: { low: 18, high: 30 },
  });
  assert.equal(v.mid, 24);
  assert.equal(v.low, 18); // el mínimo (15) sube al valor del metal
  assert.equal(v.high, 32);
  assert.equal(v.sourceCount, 4);
});

test('sin datos devuelve valoración vacía', () => {
  const v = combineValuation({});
  assert.equal(v.mid, null);
  assert.equal(v.sourceCount, 0);
});

test('solo IA', () => {
  const v = combineValuation({ ai: { low: 1, high: 3 } });
  assert.deepEqual([v.low, v.mid, v.high], [1, 2, 3]);
});

// --- Token de Firebase firmado con una clave de prueba ---
const b64url = (buf) => Buffer.from(buf).toString('base64url');

async function makeToken(payload, kid = 'k1') {
  const { publicKey, privateKey } = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true, ['sign', 'verify'],
  );
  const jwk = { ...(await crypto.subtle.exportKey('jwk', publicKey)), kid, alg: 'RS256', use: 'sig' };
  const h = b64url(JSON.stringify({ alg: 'RS256', kid, typ: 'JWT' }));
  const p = b64url(JSON.stringify(payload));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(`${h}.${p}`));
  return { token: `${h}.${p}.${b64url(sig)}`, jwk };
}

test('verifica tokens de Firebase y rechaza otros proyectos o emails', async () => {
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: 'demo', iss: 'https://securetoken.google.com/demo', sub: 'u1', email: 'yo@hotmail.com', iat: now, exp: now + 3600 };
  const { token, jwk } = await makeToken(payload);
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ keys: [jwk] }), { headers: { 'cache-control': 'max-age=60' } });
  try {
    const req = (t) => new Request('https://x/identify', { headers: { authorization: `Bearer ${t}` } });
    const user = await verifyFirebaseToken(req(token), { FIREBASE_PROJECT_ID: 'demo', ALLOWED_EMAILS: 'Yo@hotmail.com' });
    assert.equal(user.uid, 'u1');
    await assert.rejects(verifyFirebaseToken(req(token), { FIREBASE_PROJECT_ID: 'otro' }), /proyecto/);
    await assert.rejects(verifyFirebaseToken(req(token), { FIREBASE_PROJECT_ID: 'demo', ALLOWED_EMAILS: 'otra@x.com' }), /acceso/);
    await assert.rejects(verifyFirebaseToken(req(token.slice(0, -4) + 'AAAA'), { FIREBASE_PROJECT_ID: 'demo' }), /no válida/);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('flujo /identify completo con APIs simuladas', async () => {
  const now = Math.floor(Date.now() / 1000);
  const { token, jwk } = await makeToken({ aud: 'demo', iss: 'https://securetoken.google.com/demo', sub: 'u1', iat: now, exp: now + 3600 }, 'k2');
  const ai = {
    isCoin: true, title: '5 pesetas 1949 Franco', countryName: 'España', countryCode: 'es', year: 1949,
    yearText: '1949 (*19-50)', yearVisible: true, era: 'contemporanea', period: 'Franco',
    denominationValue: 5, denominationUnit: 'pesetas', metal: 'cuproníquel', finenessPermille: 0, weightG: 15,
    isCommemorative: false, events: [], grade: 'MBC', gradeNotes: 'desgaste leve', historicalNote: 'x',
    searchQueryEn: '5 pesetas Francisco Franco', searchQueryEs: 'moneda 5 pesetas 1949 franco',
    estimatedValueEur: { low: 1, high: 3 }, confidence: 0.9,
  };
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const u = String(url);
    calls.push(u);
    const r = (d) => new Response(JSON.stringify(d));
    if (u.includes('jwk')) return r({ keys: [jwk] });
    if (u.includes('generativelanguage')) return r({ candidates: [{ content: { parts: [{ text: JSON.stringify(ai) }] } }] });
    if (u.includes('/types?')) return r({ count: 2, types: [
      { id: 1, title: '25 Céntimos', min_year: 1937, max_year: 1937 },
      { id: 4090, title: '5 Pesetas - Francisco Franco', min_year: 1949, max_year: 1952, issuer: { name: 'España' } },
    ] });
    if (u.includes('/issues?')) return r([{ id: 77, year: 1949, gregorian_year: 1949 }, { id: 78, year: 1957 }]);
    if (u.includes('/prices')) return r({ currency: 'EUR', prices: [{ grade: 'vf', price: 2.5 }, { grade: 'xf', price: 6 }] });
    if (u.includes('oauth2/token')) return r({ access_token: 't', expires_in: 7200 });
    if (u.includes('item_summary')) return r({ itemSummaries: [
      { title: '5 pesetas 1949 franco', price: { value: '2.00', currency: 'EUR' } },
      { title: '5 pesetas 1949 *50', price: { value: '3.50', currency: 'EUR' } },
      { title: 'moneda 5 pesetas 1949', price: { value: '4.00', currency: 'EUR' } },
      { title: 'lote 20 monedas 5 pesetas 1949', price: { value: '30.00', currency: 'EUR' } },
    ] });
    throw new Error('URL inesperada ' + u);
  };
  try {
    const env = { FIREBASE_PROJECT_ID: 'demo', GEMINI_API_KEY: 'g', NUMISTA_API_KEY: 'n', EBAY_CLIENT_ID: 'a', EBAY_CLIENT_SECRET: 'b' };
    const res = await worker.fetch(new Request('https://x/identify', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', origin: 'http://localhost:5173' },
      body: JSON.stringify({ images: [{ mimeType: 'image/jpeg', data: 'AAAA' }] }),
    }), env, ctx);
    const data = await res.json();
    assert.equal(res.status, 200, JSON.stringify(data));
    assert.equal(data.coin.countryCode, 'ES');
    assert.equal(data.coin.catalogRef.typeId, 4090);
    assert.equal(data.coin.catalogRef.issueId, 77);
    assert.equal(data.valuation.sources.numista.price, 2.5);
    assert.equal(data.valuation.sources.ebay.count, 3); // el lote queda fuera
    assert.equal(data.valuation.sourceCount, 3);
    assert.ok(data.valuation.mid >= 2 && data.valuation.mid <= 3.5);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('/identify sin sesión devuelve 401', async () => {
  const res = await worker.fetch(new Request('https://x/identify', { method: 'POST', body: '{}' }), { FIREBASE_PROJECT_ID: 'demo' }, ctx);
  assert.equal(res.status, 401);
});

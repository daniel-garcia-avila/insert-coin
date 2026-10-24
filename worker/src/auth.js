// Verifica el token de sesión de Firebase (ID token) sin SDK, con WebCrypto.
// Así el backend solo atiende a usuarios de tu proyecto Firebase.

const JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

let jwksCache = { keys: null, exp: 0 };

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function b64urlToBytes(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function b64urlToJson(s) {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));
}

async function getKeys(force = false) {
  if (!force && jwksCache.keys && Date.now() < jwksCache.exp) return jwksCache.keys;
  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new HttpError(503, 'No se pudieron obtener las claves de Google');
  const { keys } = await res.json();
  const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get('cache-control') || '')?.[1] || 3600);
  jwksCache = { keys, exp: Date.now() + maxAge * 1000 };
  return keys;
}

export async function verifyFirebaseToken(request, env) {
  const authz = request.headers.get('authorization') || '';
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : null;
  if (!token) throw new HttpError(401, 'Inicia sesión para usar esta función');

  const parts = token.split('.');
  if (parts.length !== 3) throw new HttpError(401, 'Sesión no válida');
  const [h64, p64, s64] = parts;

  let header, payload;
  try {
    header = b64urlToJson(h64);
    payload = b64urlToJson(p64);
  } catch {
    throw new HttpError(401, 'Sesión no válida');
  }
  if (header.alg !== 'RS256') throw new HttpError(401, 'Sesión no válida');

  let jwk = (await getKeys()).find((k) => k.kid === header.kid);
  // Google rota sus claves: si no está la del token, recargamos una vez.
  if (!jwk) jwk = (await getKeys(true)).find((k) => k.kid === header.kid);
  if (!jwk) throw new HttpError(401, 'Sesión caducada, vuelve a entrar');

  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    b64urlToBytes(s64),
    new TextEncoder().encode(`${h64}.${p64}`),
  );
  if (!valid) throw new HttpError(401, 'Sesión no válida');

  const now = Math.floor(Date.now() / 1000);
  const projectId = env.FIREBASE_PROJECT_ID;
  if (payload.aud !== projectId || payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new HttpError(401, 'La sesión no pertenece a este proyecto');
  }
  if (!payload.sub || payload.exp < now || payload.iat > now + 300) {
    throw new HttpError(401, 'Sesión caducada, vuelve a entrar');
  }

  const allowed = (env.ALLOWED_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length && !allowed.includes(String(payload.email || '').toLowerCase())) {
    throw new HttpError(403, 'Esta cuenta no tiene acceso a la app');
  }

  return { uid: payload.sub, email: payload.email || null };
}

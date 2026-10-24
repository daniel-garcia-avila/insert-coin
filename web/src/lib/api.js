import { API_URL, DEMO } from './config.js';
import { store } from './store.js';
import { sampleIdentification } from './demo-data.js';

async function call(path, body) {
  if (!API_URL) throw new Error('Falta configurar VITE_API_URL con la dirección del backend');
  const token = await store.getIdToken();
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Sin conexión con el servidor. Comprueba tu cobertura e inténtalo de nuevo.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status} del servidor`);
  return data;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let demoCounter = 0;

export async function identify(images) {
  if (DEMO) {
    await wait(1800);
    return sampleIdentification(demoCounter++);
  }
  return call('/identify', { images });
}

export async function valuate(coin) {
  if (DEMO) {
    await wait(900);
    const v = coin.aiEstimate ? { ...sampleIdentification(0).valuation } : null;
    if (v && coin.aiEstimate) {
      const mid = (coin.aiEstimate.low + coin.aiEstimate.high) / 2;
      Object.assign(v, { low: coin.aiEstimate.low, mid: Math.round(mid * 100) / 100, high: coin.aiEstimate.high, updatedAt: new Date().toISOString() });
    }
    return { valuation: v, catalogRef: coin.catalogRef };
  }
  return call('/valuate', { coin });
}

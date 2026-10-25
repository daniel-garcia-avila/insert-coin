// Modo demostración: mismo comportamiento que Firebase, pero guardado solo en este navegador.
import { coinFromIdentification } from './coin.js';
import { SAMPLES, sampleIdentification } from './demo-data.js';

const KEY = 'monetario-demo-v1';
const listeners = new Set();
let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* sin almacenamiento disponible */
  }
  const now = Date.now();
  const coins = {};
  const photos = {};
  SAMPLES.forEach((s, i) => {
    const id = `demo${i}`;
    const r = sampleIdentification(i);
    coins[id] = { id, ...coinFromIdentification(r.coin, r.valuation, { obverse: s.img, reverse: s.img }), createdAt: now - i * 86_400_000 };
    photos[id] = { obverse: s.img, reverse: s.img };
  });
  return { coins, photos, user: null };
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* lleno o bloqueado: seguimos en memoria */
  }
  listeners.forEach((l) => l());
}

function subscribe(fn) {
  listeners.add(fn);
  fn();
  return () => listeners.delete(fn);
}

const sorted = () => Object.values(state.coins).sort((a, b) => b.createdAt - a.createdAt);

export const store = {
  onUser(cb) {
    return subscribe(() => cb(state.user));
  },
  async signInGoogle() {
    state.user = { uid: 'demo', email: 'demo@insertcoin.app', name: 'Demo' };
    save();
  },
  async signInEmail(email) {
    state.user = { uid: 'demo', email, name: email };
    save();
  },
  registerEmail(email) {
    return this.signInEmail(email);
  },
  async resetPassword() {},
  async signOut() {
    state.user = null;
    save();
  },
  getIdToken: async () => 'demo',

  watchCoins(uid, cb) {
    return subscribe(() => cb(sorted()));
  },
  watchCoin(uid, id, cb) {
    return subscribe(() => cb(state.coins[id] || null));
  },
  async createCoin(uid, data, photos) {
    const id = `c${Date.now().toString(36)}`;
    state.coins[id] = { id, ...data, createdAt: Date.now() };
    state.photos[id] = photos;
    save();
    return id;
  },
  async updateCoin(uid, id, patch) {
    state.coins[id] = { ...state.coins[id], ...patch, updatedAt: Date.now() };
    save();
  },
  async setPhotos(uid, id, photos) {
    state.photos[id] = photos;
    save();
  },
  async getPhotos(uid, id) {
    return state.photos[id] || {};
  },
  async deleteCoin(uid, id) {
    delete state.coins[id];
    delete state.photos[id];
    save();
  },
};

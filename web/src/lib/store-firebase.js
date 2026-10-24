import { initializeApp } from 'firebase/app';
import {
  getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut as fbSignOut,
} from 'firebase/auth';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, onSnapshot, query, orderBy, setDoc, updateDoc, deleteDoc, getDoc, serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { firebaseConfig } from './config.js';

let fb;
function init() {
  if (fb) return fb;
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  // Caché local: la colección se puede consultar y ampliar sin cobertura
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  fb = { app, auth, db };
  return fb;
}

const coinsCol = (uid) => collection(init().db, 'users', uid, 'coins');
const coinRef = (uid, id) => doc(init().db, 'users', uid, 'coins', id);
const photosRef = (uid, id) => doc(init().db, 'users', uid, 'coins', id, 'media', 'photos');

const withDates = (snap) => {
  const d = snap.data();
  return { id: snap.id, ...d, createdAt: d.createdAt?.toMillis?.() ?? Date.now(), updatedAt: d.updatedAt?.toMillis?.() ?? null };
};

export const store = {
  onUser(cb) {
    return onAuthStateChanged(init().auth, (u) => cb(u ? { uid: u.uid, email: u.email, name: u.displayName } : null));
  },
  signInGoogle: () => signInWithPopup(init().auth, new GoogleAuthProvider()),
  signInEmail: (email, pw) => signInWithEmailAndPassword(init().auth, email, pw),
  registerEmail: (email, pw) => createUserWithEmailAndPassword(init().auth, email, pw),
  resetPassword: (email) => sendPasswordResetEmail(init().auth, email),
  signOut: () => fbSignOut(init().auth),
  getIdToken: () => init().auth.currentUser?.getIdToken(),

  watchCoins(uid, cb, onError) {
    return onSnapshot(
      query(coinsCol(uid), orderBy('createdAt', 'desc')),
      (snap) => cb(snap.docs.map(withDates)),
      onError,
    );
  },
  watchCoin(uid, id, cb, onError) {
    return onSnapshot(coinRef(uid, id), (s) => cb(s.exists() ? withDates(s) : null), onError);
  },
  async createCoin(uid, data, photos) {
    const ref = doc(coinsCol(uid));
    const batch = writeBatch(init().db);
    batch.set(ref, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    batch.set(photosRef(uid, ref.id), photos);
    // Sin conexión, la escritura queda en cola y se sube al volver la cobertura
    batch.commit().catch((e) => console.error(e));
    return ref.id;
  },
  async updateCoin(uid, id, patch) {
    await updateDoc(coinRef(uid, id), { ...patch, updatedAt: serverTimestamp() });
  },
  async setPhotos(uid, id, photos) {
    await setDoc(photosRef(uid, id), photos);
  },
  async getPhotos(uid, id) {
    const s = await getDoc(photosRef(uid, id));
    return s.exists() ? s.data() : {};
  },
  async deleteCoin(uid, id) {
    await deleteDoc(photosRef(uid, id));
    await deleteDoc(coinRef(uid, id));
  },
};

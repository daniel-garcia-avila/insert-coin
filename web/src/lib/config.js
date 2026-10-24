const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

export const API_URL = (env.VITE_API_URL || '').replace(/\/$/, '');

// Sin configuración de Firebase la app arranca en modo demostración.
export const DEMO = env.VITE_DEMO === '1' || !firebaseConfig.apiKey;

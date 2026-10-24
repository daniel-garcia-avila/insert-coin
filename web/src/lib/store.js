import { DEMO } from './config.js';
import { store as firebaseStore } from './store-firebase.js';
import { store as demoStore } from './store-demo.js';

export const store = DEMO ? demoStore : firebaseStore;

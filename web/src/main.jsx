import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles.css';

// En una página incrustada (vista previa publicada) no se puede tocar la URL
const Router = import.meta.env.VITE_ROUTER === 'memory' ? MemoryRouter : BrowserRouter;
// Subcarpeta de publicación (p. ej. /insert-coin en GitHub Pages); con rutas relativas no aplica
const base = import.meta.env.BASE_URL;
const basename = base.startsWith('/') && base !== '/' ? base.replace(/\/$/, '') : undefined;

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router basename={basename}>
      <App />
    </Router>
  </React.StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD && import.meta.env.VITE_ROUTER !== 'memory') {
  window.addEventListener('load', () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {}));
}

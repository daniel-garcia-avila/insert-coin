import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles.css';

// En una página incrustada (vista previa publicada) no se puede tocar la URL
const Router = import.meta.env.VITE_ROUTER === 'memory' ? MemoryRouter : BrowserRouter;

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
      <App />
    </Router>
  </React.StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD && import.meta.env.VITE_ROUTER !== 'memory') {
  window.addEventListener('load', () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {}));
}

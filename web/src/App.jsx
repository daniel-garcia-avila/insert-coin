import { createContext, useContext, useEffect, useState } from 'react';
import { NavLink, Route, Routes, Navigate } from 'react-router-dom';
import { store } from './lib/store.js';
import { DEMO } from './lib/config.js';
import Login from './pages/Login.jsx';
import Inventory from './pages/Inventory.jsx';
import AddCoin from './pages/AddCoin.jsx';
import CoinDetail from './pages/CoinDetail.jsx';
import Summary from './pages/Summary.jsx';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export default function App() {
  const [user, setUser] = useState(undefined);
  const [coins, setCoins] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => store.onUser(setUser), []);

  useEffect(() => {
    if (!user) {
      setCoins(null);
      return undefined;
    }
    return store.watchCoins(user.uid, setCoins, (e) => setError(`No se pudo cargar la colección: ${e.message}`));
  }, [user]);

  if (user === undefined) return <div className="splash" aria-busy="true" />;
  if (!user) return <Login />;

  return (
    <Ctx.Provider value={{ user, coins: coins || [], loading: coins === null }}>
      {DEMO && <div className="demo-bar">Modo demostración: los datos se guardan solo en este navegador.</div>}
      {error && <div className="alert" role="alert">{error}</div>}
      <main className="page">
        <Routes>
          <Route path="/" element={<Inventory />} />
          <Route path="/nueva" element={<AddCoin />} />
          <Route path="/moneda/:id" element={<CoinDetail />} />
          <Route path="/resumen" element={<Summary />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <nav className="tabbar" aria-label="Secciones">
        <NavLink to="/" end>Colección</NavLink>
        <NavLink to="/nueva" className="tab-add" aria-label="Añadir moneda">
          <span aria-hidden="true">+</span>
        </NavLink>
        <NavLink to="/resumen">Resumen</NavLink>
      </nav>
    </Ctx.Provider>
  );
}

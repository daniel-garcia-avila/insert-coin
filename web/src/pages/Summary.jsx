import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../App.jsx';
import CoinDisc from '../components/CoinDisc.jsx';
import { valuate } from '../lib/api.js';
import { coinValue, eraLabel, flag, formatEur, formatYear, valuationInput } from '../lib/coin.js';
import { store } from '../lib/store.js';
import { DEMO } from '../lib/config.js';

const WEEK = 7 * 24 * 3600 * 1000;

function Bars({ title, rows }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  if (!rows.length) return null;
  return (
    <section className="block">
      <h2>{title}</h2>
      <ul className="bars">
        {rows.map((r) => (
          <li key={r.label}>
            <span className="bars-label">{r.label}</span>
            <span className="bars-track"><span style={{ width: `${(r.value / max) * 100}%` }} /></span>
            <span className="bars-value">{formatEur(r.value)}</span>
            <span className="bars-count">{r.count}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function group(coins, keyFn) {
  const m = new Map();
  coins.forEach((c) => {
    const k = keyFn(c);
    const g = m.get(k) || { label: k, value: 0, count: 0 };
    g.value += coinValue(c);
    g.count += c.quantity || 1;
    m.set(k, g);
  });
  return [...m.values()].sort((a, b) => b.value - a.value || b.count - a.count);
}

export default function Summary() {
  const { user, coins } = useApp();
  const [progress, setProgress] = useState(null);
  const stop = useRef(false);

  const owned = useMemo(() => coins.filter((c) => !c.status || c.status === 'collection' || c.status === 'forSale'), [coins]);
  const total = owned.reduce((s, c) => s + coinValue(c), 0);
  const cost = owned.reduce((s, c) => s + (c.purchase?.price || 0) * (c.quantity || 1), 0);
  const withCost = owned.filter((c) => c.purchase?.price != null);
  const valueWithCost = withCost.reduce((s, c) => s + coinValue(c), 0);
  const pieces = owned.reduce((s, c) => s + (c.quantity || 1), 0);
  const noPrice = owned.filter((c) => c.valuation?.mid == null).length;
  const top = [...owned].sort((a, b) => coinValue(b) - coinValue(a)).slice(0, 10);
  const stale = owned.filter((c) => !c.valuation?.updatedAt || Date.now() - new Date(c.valuation.updatedAt).getTime() > WEEK);

  async function refreshAll() {
    stop.current = false;
    const todo = stale;
    let done = 0;
    let failed = 0;
    setProgress({ done, total: todo.length, failed });
    for (const c of todo) {
      if (stop.current) break;
      try {
        const r = await valuate(valuationInput(c));
        await store.updateCoin(user.uid, c.id, { valuation: r.valuation, catalogRef: r.catalogRef || c.catalogRef || null });
      } catch {
        failed++;
      }
      done++;
      setProgress({ done, total: todo.length, failed });
      // Pausa para no pasar de los límites gratuitos de las APIs
      if (!DEMO) await new Promise((r) => setTimeout(r, 4000));
    }
    setProgress((p) => ({ ...p, finished: true }));
  }

  if (!coins.length) {
    return (
      <div className="pad">
        <h1>Resumen</h1>
        <p>Cuando añadas monedas verás aquí el valor de tu colección por país, época y metal.</p>
        <Link to="/nueva" className="btn btn-primary">Añadir una moneda</Link>
      </div>
    );
  }

  return (
    <div className="summary">
      <h1>Resumen</h1>
      <section className="block totals">
        <div>
          <span className="totals-big">{formatEur(total)}</span>
          <span className="muted">{`Valor estimado de ${pieces} monedas`}</span>
        </div>
        {withCost.length > 0 && (
          <div>
            <span className="totals-mid">{formatEur(valueWithCost - cost)}</span>
            <span className="muted">{`Diferencia frente a lo que pagaste por ${withCost.length} de ellas (${formatEur(cost)})`}</span>
          </div>
        )}
        {noPrice > 0 && <p className="muted">{`${noPrice} sin precio de mercado.`}</p>}
      </section>

      <section className="block">
        <h2>Precios</h2>
        {progress && !progress.finished ? (
          <>
            <p role="status">{`Actualizando ${progress.done} de ${progress.total}…`}</p>
            <button className="btn btn-ghost" onClick={() => { stop.current = true; }}>Parar</button>
          </>
        ) : (
          <>
            <p className="muted">
              {progress?.finished
                ? `Actualizadas ${progress.done - progress.failed} de ${progress.total}${progress.failed ? `; ${progress.failed} fallaron, vuelve a intentarlo más tarde` : ''}.`
                : stale.length
                  ? `${stale.length} monedas tienen el precio de hace más de una semana.`
                  : 'Todos los precios son de esta semana.'}
            </p>
            {stale.length > 0 && (
              <button className="btn btn-primary" onClick={refreshAll}>
                {`Actualizar ${stale.length} precios`}
              </button>
            )}
          </>
        )}
      </section>

      <Bars title="Por país" rows={group(owned, (c) => `${flag(c.countryCode)} ${c.countryName || 'Sin país'}`.trim())} />
      <Bars title="Por época" rows={group(owned, (c) => eraLabel(c.era))} />
      <Bars title="Por metal" rows={group(owned, (c) => c.metal || 'otro')} />

      <section className="block">
        <h2>Las más valiosas</h2>
        <ol className="top">
          {top.map((c) => (
            <li key={c.id}>
              <Link to={`/moneda/${c.id}`}>
                <CoinDisc src={c.thumbs?.obverse} metal={c.metal} size={48} />
                <span className="top-title">{c.title}<span className="muted">{` ${formatYear(c)}`}</span></span>
                <span className="top-value">{formatEur(coinValue(c))}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <button className="link signout" onClick={() => store.signOut()}>{`Cerrar sesión (${user.email})`}</button>
    </div>
  );
}

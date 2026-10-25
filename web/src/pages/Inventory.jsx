import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../App.jsx';
import CoinDisc from '../components/CoinDisc.jsx';
import { ERAS, GRADES, STATUSES, coinValue, flag, formatEur, formatYear, normalizeText } from '../lib/coin.js';

const EMPTY = { q: '', country: '', era: '', event: '', grade: '', status: 'collection', from: '', to: '', sort: 'recent' };

function loadFilters() {
  try {
    return { ...EMPTY, ...JSON.parse(sessionStorage.getItem('filters') || '{}') };
  } catch {
    return EMPTY;
  }
}

const SORTS = {
  recent: (a, b) => b.createdAt - a.createdAt,
  yearAsc: (a, b) => (a.year ?? 9999) - (b.year ?? 9999),
  yearDesc: (a, b) => (b.year ?? -9999) - (a.year ?? -9999),
  value: (a, b) => coinValue(b) - coinValue(a),
  country: (a, b) => (a.countryName || '').localeCompare(b.countryName || '', 'es') || (a.year ?? 0) - (b.year ?? 0),
};

export default function Inventory() {
  const { coins, loading } = useApp();
  const [f, setF] = useState(loadFilters);
  const [open, setOpen] = useState(false);

  const set = (k, v) => {
    const next = { ...f, [k]: v };
    setF(next);
    try {
      sessionStorage.setItem('filters', JSON.stringify(next));
    } catch {
      /* sin almacenamiento */
    }
  };

  const options = useMemo(() => {
    const countries = new Map();
    const events = new Set();
    coins.forEach((c) => {
      if (c.countryName) countries.set(c.countryName, c.countryCode);
      (c.events || []).forEach((e) => events.add(e));
    });
    return {
      countries: [...countries].sort((a, b) => a[0].localeCompare(b[0], 'es')),
      events: [...events].sort((a, b) => a.localeCompare(b, 'es')),
    };
  }, [coins]);

  const list = useMemo(() => {
    const words = normalizeText(f.q).split(/\s+/).filter(Boolean);
    return coins
      .filter((c) => {
        if (f.status && (c.status || 'collection') !== f.status) return false;
        if (f.country && c.countryName !== f.country) return false;
        if (f.era && c.era !== f.era) return false;
        if (f.grade && c.grade !== f.grade) return false;
        if (f.event && !(c.events || []).includes(f.event)) return false;
        if (f.from && (c.year ?? -1e9) < Number(f.from)) return false;
        if (f.to && (c.year ?? 1e9) > Number(f.to)) return false;
        if (words.length) {
          const hay = (c.searchKeywords || []).join(' ') + ' ' + normalizeText(c.title);
          if (!words.every((w) => hay.includes(w))) return false;
        }
        return true;
      })
      .sort(SORTS[f.sort] || SORTS.recent);
  }, [coins, f]);

  const total = list.reduce((s, c) => s + coinValue(c), 0);
  const pieces = list.reduce((s, c) => s + (c.quantity || 1), 0);
  const activeFilters = ['country', 'era', 'event', 'grade', 'from', 'to'].filter((k) => f[k]).length;

  return (
    <>
      <header className="inv-head">
        <h1>Mi colección</h1>
        <p className="inv-total">
          <span className="inv-value">{formatEur(total)}</span>
          <span className="muted">
            {pieces} {pieces === 1 ? 'moneda' : 'monedas'}
            {activeFilters || f.q ? ' con estos filtros' : ''}
          </span>
        </p>
      </header>

      <div className="toolbar">
        <input
          type="search"
          placeholder="Buscar por nombre, país, rey, evento…"
          value={f.q}
          onChange={(e) => set('q', e.target.value)}
          aria-label="Buscar"
        />
        <button type="button" className={`btn btn-ghost${open ? ' on' : ''}`} onClick={() => setOpen(!open)} aria-expanded={open}>
          Filtros{activeFilters ? ` (${activeFilters})` : ''}
        </button>
      </div>

      {open && (
        <div className="filters">
          <label>
            País
            <select value={f.country} onChange={(e) => set('country', e.target.value)}>
              <option value="">Todos</option>
              {options.countries.map(([name, code]) => (
                <option key={name} value={name}>{`${flag(code)} ${name}`}</option>
              ))}
            </select>
          </label>
          <label>
            Época
            <select value={f.era} onChange={(e) => set('era', e.target.value)}>
              <option value="">Todas</option>
              {ERAS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
            </select>
          </label>
          <label>
            Evento
            <select value={f.event} onChange={(e) => set('event', e.target.value)}>
              <option value="">Todos</option>
              {options.events.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </label>
          <label>
            Conservación
            <select value={f.grade} onChange={(e) => set('grade', e.target.value)}>
              <option value="">Todas</option>
              {GRADES.map((g) => <option key={g.id} value={g.id}>{`${g.label} · ${g.long}`}</option>)}
            </select>
          </label>
          <label>
            Desde el año
            <input inputMode="numeric" value={f.from} onChange={(e) => set('from', e.target.value.replace(/[^\d-]/g, ''))} />
          </label>
          <label>
            Hasta el año
            <input inputMode="numeric" value={f.to} onChange={(e) => set('to', e.target.value.replace(/[^\d-]/g, ''))} />
          </label>
          <label>
            Mostrar
            <select value={f.status} onChange={(e) => set('status', e.target.value)}>
              <option value="">Todas</option>
              {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <label>
            Ordenar
            <select value={f.sort} onChange={(e) => set('sort', e.target.value)}>
              <option value="recent">Añadidas recientemente</option>
              <option value="value">Más valiosas</option>
              <option value="yearAsc">Más antiguas</option>
              <option value="yearDesc">Más modernas</option>
              <option value="country">Por país</option>
            </select>
          </label>
          <button type="button" className="link" onClick={() => { setF(EMPTY); try { sessionStorage.removeItem('filters'); } catch { /* sin almacenamiento */ } }}>
            Quitar filtros
          </button>
        </div>
      )}

      <section className="tray" aria-label="Monedas" aria-busy={loading}>
        {!loading && !coins.length && (
          <div className="tray-empty">
            <p>Tu bandeja está vacía.</p>
            <Link to="/nueva" className="btn btn-primary">Fotografiar la primera moneda</Link>
          </div>
        )}
        {!loading && !!coins.length && !list.length && (
          <div className="tray-empty"><p>Ninguna moneda coincide con estos filtros.</p></div>
        )}
        <ul className="tray-grid">
          {list.map((c) => (
            <li key={c.id}>
              <Link to={`/moneda/${c.id}`} className="tray-cell">
                <CoinDisc src={c.thumbs?.obverse} metal={c.metal} size={92} alt="" />
                <span className="tray-meta">{`${flag(c.countryCode)} ${formatYear(c)}`}</span>
                <span className="tray-title">{c.title}</span>
                <span className="tray-price">
                  {c.valuation?.mid != null ? formatEur(c.valuation.mid) : 'Sin precio'}
                  {(c.quantity || 1) > 1 && <span className="qty"> ×{c.quantity}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

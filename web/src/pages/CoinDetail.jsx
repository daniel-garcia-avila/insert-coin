import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../App.jsx';
import CoinDisc from '../components/CoinDisc.jsx';
import ValueRange from '../components/ValueRange.jsx';
import { identify, valuate } from '../lib/api.js';
import {
  ERAS, GRADES, METALS, STATUSES, coinFromIdentification, eraLabel, flag, formatEur, formatYear,
  gradeLong, statusLabel, valuationInput, withKeywords,
} from '../lib/coin.js';
import { dataUrlToPart } from '../lib/image.js';
import { store } from '../lib/store.js';

const dateFmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

function Sources({ v }) {
  const s = v?.sources || {};
  const rows = [];
  if (s.numista) {
    rows.push(
      <li key="n">
        <span>Catálogo Numista{s.numista.grade ? ` (${s.numista.grade.toUpperCase()})` : ''}</span>
        <span>{s.numista.price != null ? formatEur(s.numista.price) : 'sin precio para este estado'}</span>
        {s.numista.url && <a href={s.numista.url} target="_blank" rel="noreferrer">Ver ficha</a>}
      </li>,
    );
  }
  if (s.ebay) {
    rows.push(
      <li key="e">
        <span>eBay España, {s.ebay.count} anuncios</span>
        <span>{s.ebay.count >= 3 ? `${formatEur(s.ebay.low)} a ${formatEur(s.ebay.high)}` : 'pocos anuncios'}</span>
        {s.ebay.searchUrl && <a href={s.ebay.searchUrl} target="_blank" rel="noreferrer">Ver vendidas</a>}
      </li>,
    );
  }
  if (s.ai) {
    rows.push(
      <li key="a">
        <span>Estimación de la IA</span>
        <span>{`${formatEur(s.ai.low)} a ${formatEur(s.ai.high)}`}</span>
      </li>,
    );
  }
  if (s.metal) {
    rows.push(
      <li key="m">
        <span>{`Valor del metal (${s.metal.pureGrams} g puros)`}</span>
        <span>{formatEur(s.metal.melt)}</span>
      </li>,
    );
  }
  if (!rows.length) return null;
  return (
    <>
      <ul className="sources">{rows}</ul>
      <p className="fine">
        {v.updatedAt ? `Actualizado el ${dateFmt.format(new Date(v.updatedAt))}. ` : ''}
        Los anuncios de eBay son precios pedidos, no ventas cerradas. Datos de catálogo: Numista.
      </p>
    </>
  );
}

function EditForm({ coin, onCancel, onSave }) {
  const [d, setD] = useState(() => ({
    title: coin.title || '',
    countryName: coin.countryName || '',
    countryCode: coin.countryCode || '',
    year: coin.year ?? '',
    yearText: coin.yearText || '',
    era: coin.era || 'contemporanea',
    period: coin.period || '',
    denValue: coin.denomination?.value ?? '',
    denUnit: coin.denomination?.unit || '',
    metal: coin.metal || 'otro',
    grade: coin.grade || 'MBC',
    events: (coin.events || []).join(', '),
    tags: (coin.tags || []).join(', '),
    quantity: coin.quantity || 1,
    status: coin.status || 'collection',
    storage: coin.storage || '',
    price: coin.purchase?.price ?? '',
    notes: coin.notes || '',
  }));
  const set = (k) => (e) => setD({ ...d, [k]: e.target.value });
  const list = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);

  const submit = (e) => {
    e.preventDefault();
    onSave({
      title: d.title.trim() || coin.title,
      countryName: d.countryName.trim(),
      countryCode: d.countryCode.trim().toUpperCase().slice(0, 2),
      year: d.year === '' ? null : Number(d.year),
      yearText: d.yearText.trim(),
      era: d.era,
      period: d.period.trim(),
      denomination: { value: d.denValue === '' ? null : Number(d.denValue), unit: d.denUnit.trim() },
      metal: d.metal,
      grade: d.grade,
      gradeSource: d.grade !== coin.grade ? 'user' : coin.gradeSource || 'ai',
      events: list(d.events),
      tags: list(d.tags),
      quantity: Math.max(1, Math.round(Number(d.quantity) || 1)),
      status: d.status,
      storage: d.storage.trim(),
      purchase: { ...(coin.purchase || {}), price: d.price === '' ? null : Number(String(d.price).replace(',', '.')) },
      notes: d.notes,
    });
  };

  return (
    <form className="edit" onSubmit={submit}>
      <label className="wide">Nombre<input value={d.title} onChange={set('title')} /></label>
      <label>País<input value={d.countryName} onChange={set('countryName')} /></label>
      <label>Código país<input value={d.countryCode} maxLength={2} onChange={set('countryCode')} /></label>
      <label>Año<input inputMode="numeric" value={d.year} onChange={set('year')} /></label>
      <label>Año tal como aparece<input value={d.yearText} onChange={set('yearText')} /></label>
      <label>Época
        <select value={d.era} onChange={set('era')}>{ERAS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
      </label>
      <label>Reinado o etapa<input value={d.period} onChange={set('period')} /></label>
      <label>Valor facial<input inputMode="decimal" value={d.denValue} onChange={set('denValue')} /></label>
      <label>Unidad<input value={d.denUnit} onChange={set('denUnit')} /></label>
      <label>Metal
        <select value={d.metal} onChange={set('metal')}>{METALS.map((m) => <option key={m}>{m}</option>)}</select>
      </label>
      <label>Conservación
        <select value={d.grade} onChange={set('grade')}>{GRADES.map((g) => <option key={g.id} value={g.id}>{`${g.label} · ${g.long}`}</option>)}</select>
      </label>
      <label className="wide">Eventos, separados por comas<input value={d.events} onChange={set('events')} /></label>
      <label className="wide">Etiquetas, separadas por comas<input value={d.tags} onChange={set('tags')} /></label>
      <label>Cantidad<input type="number" min="1" value={d.quantity} onChange={set('quantity')} /></label>
      <label>Situación
        <select value={d.status} onChange={set('status')}>{STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
      </label>
      <label>Precio de compra (€)<input inputMode="decimal" value={d.price} onChange={set('price')} /></label>
      <label>Dónde la guardas<input value={d.storage} onChange={set('storage')} placeholder="Álbum 2, página 14" /></label>
      <label className="wide">Notas<textarea rows={3} value={d.notes} onChange={set('notes')} /></label>
      <div className="actions wide">
        <button className="btn btn-primary">Guardar cambios</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}

export default function CoinDetail() {
  const { id } = useParams();
  const { user } = useApp();
  const nav = useNavigate();
  const [coin, setCoin] = useState(undefined);
  const [photos, setPhotos] = useState({});
  const [side, setSide] = useState('obverse');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => store.watchCoin(user.uid, id, setCoin), [user.uid, id]);
  useEffect(() => {
    store.getPhotos(user.uid, id).then(setPhotos).catch(() => {});
  }, [user.uid, id]);

  if (coin === undefined) return <p className="muted pad">Cargando…</p>;
  if (coin === null) {
    return (
      <div className="pad">
        <p>Esta moneda ya no está en tu colección.</p>
        <Link to="/" className="btn btn-ghost">Volver a la colección</Link>
      </div>
    );
  }

  async function act(label, fn) {
    setBusy(label);
    setMsg('');
    try {
      await fn();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy('');
    }
  }

  const refreshPrice = (c = coin) =>
    act('price', async () => {
      const r = await valuate(valuationInput(c));
      await store.updateCoin(user.uid, id, { valuation: r.valuation, catalogRef: r.catalogRef || c.catalogRef || null });
    });

  const reidentify = () =>
    act('ai', async () => {
      const imgs = [photos.obverse, photos.reverse].filter(Boolean).map(dataUrlToPart);
      if (!imgs.length) throw new Error('No hay fotos guardadas de esta moneda');
      const r = await identify(imgs);
      const fresh = coinFromIdentification(r.coin, r.valuation, coin.thumbs);
      // Conserva lo que es tuyo: cantidad, compra, ubicación, notas, etiquetas y situación
      const keep = ['quantity', 'purchase', 'storage', 'notes', 'tags', 'status', 'thumbs'];
      keep.forEach((k) => delete fresh[k]);
      await store.updateCoin(user.uid, id, fresh);
    });

  const save = (patch) =>
    act('save', async () => {
      const next = withKeywords({ ...coin, ...patch });
      const changedForPrice = ['grade', 'year', 'metal', 'title'].some((k) => patch[k] !== coin[k]);
      if (changedForPrice) next.catalogRef = patch.title !== coin.title || patch.year !== coin.year ? null : coin.catalogRef;
      const { id: _id, createdAt, updatedAt, ...data } = next;
      await store.updateCoin(user.uid, id, data);
      setEditing(false);
      if (changedForPrice) await refreshPrice(next).catch(() => {});
    });

  const remove = () => {
    if (!window.confirm(`¿Eliminar «${coin.title}» de tu colección? No se puede deshacer.`)) return;
    act('del', async () => {
      await store.deleteCoin(user.uid, id);
      nav('/', { replace: true });
    });
  };

  const img = photos[side] || (side === 'obverse' ? coin.thumbs?.obverse : coin.thumbs?.reverse);
  const d = coin.description || {};
  const qty = coin.quantity || 1;
  const facts = [
    ['País', `${flag(coin.countryCode)} ${coin.countryName || '—'}`],
    ['Emisor', coin.issuer],
    ['Año', formatYear(coin) + (coin.yearVisible === false ? ' (estimado)' : '')],
    ['Época', eraLabel(coin.era)],
    ['Reinado o etapa', coin.period],
    ['Valor facial', coin.denomination?.value != null ? `${coin.denomination.value} ${coin.denomination.unit}` : coin.denomination?.unit],
    ['Metal', coin.metal + (coin.finenessPermille ? `, ley ${coin.finenessPermille}‰` : '')],
    ['Peso', coin.weightG ? `${coin.weightG} g` : ''],
    ['Diámetro', coin.diameterMm ? `${coin.diameterMm} mm` : ''],
    ['Ceca', [coin.mint, coin.mintMark].filter(Boolean).join(', ')],
    ['Conservación', `${coin.grade}, ${gradeLong(coin.grade).toLowerCase()}${coin.gradeSource === 'user' ? ' (ajustado por ti)' : ''}`],
    ['Cantidad', qty > 1 ? String(qty) : ''],
    ['Situación', statusLabel(coin.status || 'collection')],
    ['Precio de compra', coin.purchase?.price != null ? formatEur(coin.purchase.price) : ''],
    ['Guardada en', coin.storage],
  ].filter(([, v]) => v);

  return (
    <article className="detail">
      <Link to="/" className="back">Colección</Link>
      <div className="stage stage-detail">
        <CoinDisc src={img} metal={coin.metal} size={240} alt={`${coin.title}, ${side === 'obverse' ? 'anverso' : 'reverso'}`} />
        {(photos.reverse || coin.thumbs?.reverse) && (
          <div className="sides" role="group" aria-label="Cara">
            <button className={side === 'obverse' ? 'on' : ''} onClick={() => setSide('obverse')}>Anverso</button>
            <button className={side === 'reverse' ? 'on' : ''} onClick={() => setSide('reverse')}>Reverso</button>
          </div>
        )}
      </div>

      <h1>{coin.title}</h1>
      {!!coin.events?.length && <p className="events">{coin.events.join(', ')}</p>}

      <section className="block">
        <h2>Valor de mercado{qty > 1 ? ' por unidad' : ''}</h2>
        <ValueRange valuation={coin.valuation} />
        {qty > 1 && coin.valuation?.mid != null && (
          <p className="muted">{`${qty} unidades: ${formatEur(coin.valuation.mid * qty)}`}</p>
        )}
        <Sources v={coin.valuation} />
        <button className="btn btn-ghost" disabled={!!busy} onClick={() => refreshPrice()}>
          {busy === 'price' ? 'Actualizando…' : 'Actualizar precio'}
        </button>
      </section>

      {msg && <p className="error" role="alert">{msg}</p>}

      {editing ? (
        <section className="block">
          <h2>Editar datos</h2>
          <EditForm coin={coin} onCancel={() => setEditing(false)} onSave={save} />
        </section>
      ) : (
        <section className="block">
          <h2>Ficha</h2>
          <dl className="facts">
            {facts.map(([k, v]) => (
              <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
          {coin.gradeNotes && <p><strong>Estado: </strong>{coin.gradeNotes}</p>}
          {d.obverse && <p><strong>Anverso: </strong>{d.obverse}</p>}
          {d.reverse && <p><strong>Reverso: </strong>{d.reverse}</p>}
          {d.history && <p>{d.history}</p>}
          {d.variants && <p className="note"><strong>Revisa: </strong>{d.variants}</p>}
          {!!coin.tags?.length && <p className="muted">{`Etiquetas: ${coin.tags.join(', ')}`}</p>}
          {coin.notes && <p className="notes">{coin.notes}</p>}
          {coin.identification?.confidence != null && (
            <p className="fine">{`Identificada por IA con una confianza del ${Math.round(coin.identification.confidence * 100)} %.`}</p>
          )}
          <div className="actions">
            <button className="btn btn-primary" onClick={() => setEditing(true)}>Editar datos</button>
            <button className="btn btn-ghost" disabled={!!busy} onClick={reidentify}>
              {busy === 'ai' ? 'Identificando…' : 'Volver a identificar'}
            </button>
            <button className="btn btn-danger" disabled={!!busy} onClick={remove}>Eliminar</button>
          </div>
        </section>
      )}
    </article>
  );
}

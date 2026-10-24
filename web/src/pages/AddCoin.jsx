import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../App.jsx';
import CoinDisc from '../components/CoinDisc.jsx';
import { identify } from '../lib/api.js';
import { coinFromIdentification, flag, formatEur, formatYear, gradeLong } from '../lib/coin.js';
import { dataUrlToPart, preparePhoto } from '../lib/image.js';
import { store } from '../lib/store.js';

function Slot({ label, photo, onPick, disabled }) {
  const input = useRef(null);
  return (
    <div className="slot">
      <button type="button" className="slot-btn" disabled={disabled} onClick={() => input.current?.click()}>
        {photo ? <img src={photo.full} alt={label} /> : <span className="slot-hint">Hacer foto</span>}
      </button>
      <span className="slot-label">{label}</span>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onPick(file);
        }}
      />
    </div>
  );
}

export default function AddCoin() {
  const { user } = useApp();
  const [obverse, setObverse] = useState(null);
  const [reverse, setReverse] = useState(null);
  const [step, setStep] = useState('idle'); // idle | working | done | error
  const [msg, setMsg] = useState('');
  const [saved, setSaved] = useState(null);

  async function pick(file, setter) {
    try {
      setter(await preparePhoto(file));
    } catch (e) {
      setStep('error');
      setMsg(e.message);
    }
  }

  async function run() {
    setStep('working');
    setMsg('Identificando la moneda y buscando precios…');
    try {
      const photos = [obverse, reverse].filter(Boolean);
      const result = await identify(photos.map((p) => dataUrlToPart(p.full)));
      const data = coinFromIdentification(result.coin, result.valuation, {
        obverse: obverse?.thumb || reverse?.thumb,
        reverse: reverse?.thumb || null,
      });
      const id = await store.createCoin(user.uid, data, {
        obverse: obverse?.full || reverse?.full,
        reverse: reverse?.full || null,
      });
      setSaved({ id, ...data });
      setStep('done');
    } catch (e) {
      setStep('error');
      setMsg(e.message);
    }
  }

  function reset() {
    setObverse(null);
    setReverse(null);
    setSaved(null);
    setStep('idle');
    setMsg('');
  }

  if (step === 'done' && saved) {
    return (
      <div className="add">
        <h1>Moneda guardada</h1>
        <div className="stage stage-result">
          <CoinDisc src={saved.thumbs.obverse} metal={saved.metal} size={170} alt={saved.title} />
        </div>
        <div className="result">
          <h2>{saved.title}</h2>
          <p className="muted">
            {`${flag(saved.countryCode)} ${saved.countryName}, ${formatYear(saved)}. ${gradeLong(saved.grade)}.`}
          </p>
          <p className="result-value">
            {saved.valuation?.mid != null ? formatEur(saved.valuation.mid) : 'Sin precio de mercado'}
          </p>
        </div>
        <div className="actions">
          <button className="btn btn-primary" onClick={reset}>Añadir otra moneda</button>
          <Link className="btn btn-ghost" to={`/moneda/${saved.id}`}>Ver la ficha</Link>
        </div>
      </div>
    );
  }

  const working = step === 'working';
  return (
    <div className="add">
      <h1>Nueva moneda</h1>
      <p className="muted">Foto de cerca, con la moneda centrada y buena luz. El reverso ayuda a identificarla.</p>
      <div className="stage">
        <Slot label="Anverso" photo={obverse} disabled={working} onPick={(f) => pick(f, setObverse)} />
        <Slot label="Reverso" photo={reverse} disabled={working} onPick={(f) => pick(f, setReverse)} />
      </div>
      {msg && (
        <p className={step === 'error' ? 'error' : 'progress'} role={step === 'error' ? 'alert' : 'status'}>
          {working && <span className="spinner" aria-hidden="true" />}
          {msg}
        </p>
      )}
      <div className="actions">
        <button className="btn btn-primary" disabled={working || (!obverse && !reverse)} onClick={run}>
          {working ? 'Identificando…' : 'Identificar y guardar'}
        </button>
      </div>
    </div>
  );
}

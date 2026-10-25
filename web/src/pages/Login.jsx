import { useState } from 'react';
import { store } from '../lib/store.js';
import iconUrl from '../assets/icon.svg';

const ERRORS = {
  'auth/invalid-credential': 'Email o contraseña incorrectos.',
  'auth/wrong-password': 'Email o contraseña incorrectos.',
  'auth/user-not-found': 'No hay ninguna cuenta con ese email.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese email. Entra con tu contraseña.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/invalid-email': 'Ese email no es válido.',
  'auth/popup-closed-by-user': 'Has cerrado la ventana de Google antes de terminar.',
};

export default function Login() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(fn) {
    setBusy(true);
    setMsg('');
    try {
      await fn();
    } catch (e) {
      setMsg(ERRORS[e.code] || e.message);
    } finally {
      setBusy(false);
    }
  }

  const submit = (e) => {
    e.preventDefault();
    run(() => (mode === 'login' ? store.signInEmail(email, pw) : store.registerEmail(email, pw)));
  };

  return (
    <div className="login">
      <div className="login-stage">
        <img src={iconUrl} alt="" width="88" height="88" />
        <h1>INSERT COIN</h1>
        <p>Haz una foto a cada moneda y tendrás tu colección catalogada y valorada.</p>
      </div>
      <form className="login-form" onSubmit={submit}>
        <button type="button" className="btn btn-light" disabled={busy} onClick={() => run(store.signInGoogle)}>
          Entrar con Google
        </button>
        <p className="or">o con tu email</p>
        <label>
          Email
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={6}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
        </label>
        {msg && <p className="error" role="alert">{msg}</p>}
        <button className="btn btn-primary" disabled={busy}>
          {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
        </button>
        <div className="login-links">
          <button type="button" className="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Crear una cuenta nueva' : 'Ya tengo cuenta'}
          </button>
          {mode === 'login' && (
            <button
              type="button"
              className="link"
              onClick={() =>
                email
                  ? run(async () => {
                      await store.resetPassword(email);
                      setMsg('Te hemos enviado un email para cambiar la contraseña.');
                    })
                  : setMsg('Escribe tu email y pulsa de nuevo para recibir el enlace.')
              }
            >
              He olvidado la contraseña
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

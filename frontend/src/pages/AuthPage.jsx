import { Link } from 'react-router-dom';
import { useOnline } from '../context/StoreContexts.jsx';
import { useState } from 'react';
import { api } from '../api/client.js';

export default function AuthPage({ onSignedIn, mode }) {
  const online = useOnline();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = mode === 'login' ? { email: form.email, password: form.password } : form;
      const { data } = await api(`/auth/${mode === 'login' ? 'login' : 'register'}`, { method: 'POST', body });
      onSignedIn(data);
    } catch (err) {
      setError(err.details?.length ? `${err.details[0].field}: ${err.details[0].message}` : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="panel stack" onSubmit={submit} style={{ maxWidth: 420, margin: '0 auto' }}>
      <h2>{mode === 'login' ? 'Sign in' : 'Create your account'}</h2>
      {error && <div className="notice error" role="alert">{error}</div>}
      {mode === 'register' && (
        <div>
          <label htmlFor="name">Full name</label>
          <input id="name" value={form.name} onChange={set('name')} required minLength={2} />
        </div>
      )}
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={form.email} onChange={set('email')} required />
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input id="password" type="password" value={form.password} onChange={set('password')} required minLength={mode === 'register' ? 8 : 1} />
      </div>
      <button className="btn" disabled={busy || !online}>{mode === 'login' ? 'Sign in' : 'Create account'}</button>
      {!online && <p className="muted">Reconnect to use your account.</p>}
      <Link to={mode === 'login' ? '/register' : '/login'}>
        {mode === 'login' ? 'Create an account' : 'I already have an account'}
      </Link>
    </form>
  );
}

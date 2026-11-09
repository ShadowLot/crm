import { useState } from 'react';
import { api } from '../api.js';

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const body = mode === 'login' ? { email: form.email, password: form.password } : form;
      const r = await api.post(`/api/auth/${mode}`, body);
      onLogin(r.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="brand">Client<span>Track</span></div>
        <p className="sub">{mode === 'login' ? 'Sign in to your workspace' : 'Create your account'}</p>

        {mode === 'register' && (
          <div className="field">
            <label htmlFor="name">Full name</label>
            <input id="name" value={form.name} onChange={set('name')} required maxLength={80} />
          </div>
        )}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={form.email} onChange={set('email')} required maxLength={120} />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={form.password} onChange={set('password')} required minLength={mode === 'register' ? 8 : 1} maxLength={72} />
        </div>
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Register'}</button>

        <div className="switch">
          {mode === 'login' ? (
            <>No account? <button type="button" onClick={() => setMode('register')}>Register</button></>
          ) : (
            <>Have an account? <button type="button" onClick={() => setMode('login')}>Sign in</button></>
          )}
        </div>
      </form>
    </div>
  );
}

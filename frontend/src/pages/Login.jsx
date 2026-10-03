import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <div className="brand"><span className="beacon" /> Rakshak</div>
        <p className="muted" style={{ marginTop: 0 }}>Missing Person Coordination Platform</p>

        <label>Email</label>
        <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@rakshak.test" />

        <label>Password</label>
        <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
        <p className="muted" style={{ marginTop: 6, fontSize: 12, textAlign: 'right' }}>
          <Link to="/forgot-password">Forgot password?</Link>
        </p>

        {error && <p className="error-text">{error}</p>}

        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 20 }} disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="muted" style={{ marginTop: 16 }}>
          No account? <Link to="/register">Register as Citizen / Family</Link>
        </p>
        <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
          Demo: run <code>npm run seed</code> in /backend for one account per role (password: Password@123).
        </p>
      </form>
    </div>
  );
}

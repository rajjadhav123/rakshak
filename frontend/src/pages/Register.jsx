import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import LocationField from '../components/LocationField.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'citizen', lat: '', lng: '' });
  const [resolvedArea, setResolvedArea] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      // Prefer the exact name the person picked from the district/area
      // selector over the reverse-geocoded guess — "Virar" beats
      // whatever Nominatim's structured response happens to call that
      // same point, since a specific chosen name IS a specific place,
      // even though "Palghar" (the district) is the real jurisdiction
      // boundary this account is actually scoped by.
      const locality = resolvedArea?.pickedName || resolvedArea?.label || undefined;
      await register({ ...form, locality });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <div className="brand"><span className="beacon" /> Rakshak</div>
        <p className="muted" style={{ marginTop: 0 }}>Create an account</p>

        <label>Full name</label>
        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />

        <label>Email</label>
        <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />

        <label>Phone</label>
        <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />

        <label>Password</label>
        <input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />

        <label>I am registering as</label>
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="citizen">Citizen (help spot &amp; report)</option>
          <option value="family">Family member (reporting a missing person)</option>
        </select>
        <p className="muted" style={{ marginTop: 6 }}>
          Official accounts (Police, Control Room, NGO) are created by an administrator, not self-registered.
        </p>
        {form.role === 'family' && (
          <p className="muted" style={{ marginTop: 6, fontSize: 12.5 }}>
            Family accounts are limited to one Emergency Report every 30 days, and each report requires a
            signed declaration of accuracy — both are logged against this account. This isn't a foolproof
            identity check, but it does create real accountability for what's submitted.
          </p>
        )}

        <label>Your area (optional)</label>
        <p className="muted" style={{ marginTop: 0, marginBottom: 8, fontSize: 12 }}>
          Helps route your reports to the right jurisdiction faster. We resolve this to a district
          automatically — you don't need to know it yourself. This is also what scopes your
          default case feed once you're in — you can always browse other areas from there.
        </p>
        <LocationField lat={form.lat} lng={form.lng} onChange={({ lat, lng }) => setForm((f) => ({ ...f, lat, lng }))} onResolved={setResolvedArea} required={false} label="" />

        {error && <p className="error-text">{error}</p>}

        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }} disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </button>

        <p className="muted" style={{ marginTop: 16 }}>Already have an account? <Link to="/login">Sign in</Link></p>
      </form>
    </div>
  );
}

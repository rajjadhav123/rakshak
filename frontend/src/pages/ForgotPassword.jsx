import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/auth/forgot-password', { email });
      // Same message regardless of whether the account exists \u2014 the
      // backend deliberately doesn't reveal that either (see
      // authController.js), so the UI shouldn't undo that by reacting
      // differently here.
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong \u2014 please try again');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <div className="brand"><span className="beacon" /> Rakshak</div>
        <p className="muted" style={{ marginTop: 0 }}>Reset your password</p>

        {sent ? (
          <>
            <p className="muted" style={{ color: 'var(--success)' }}>
              If an account exists for {email}, a reset link has been sent. It expires in 30 minutes.
            </p>
            <p className="muted" style={{ marginTop: 16, fontSize: 12 }}>
              No email running locally? Check the backend server console \u2014 the link is printed there instead when SMTP isn't configured.
            </p>
          </>
        ) : (
          <>
            <label>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@rakshak.test" />

            {error && <p className="error-text">{error}</p>}

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 20 }} disabled={busy}>
              {busy ? 'Sending\u2026' : 'Send reset link'}
            </button>
          </>
        )}

        <p className="muted" style={{ marginTop: 16 }}>
          <Link to="/login">Back to sign in</Link>
        </p>
      </form>
    </div>
  );
}

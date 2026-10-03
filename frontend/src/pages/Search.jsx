import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import StatusPill from '../components/StatusPill.jsx';

// Deliberately searches nationwide (scope=all), not just the citizen's
// own area — someone searching for a specific missing person could be
// looking from anywhere, and the whole point of a public case feed is
// that a sighting can happen far from home. The district default that
// governs the Dashboard's browse view is a convenience for "what's
// near me," not a boundary search should inherit.
export default function Search() {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runSearch = async (e) => {
    e.preventDefault();
    if (!term.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/cases', { params: { q: term.trim(), scope: 'all' } });
      setResults(data.cases);
    } catch (err) {
      setError(err.response?.data?.message || 'Search failed — try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Search</h2>
      <p className="muted">Search by name or a physical description — searches every district, not just your own.</p>

      <form onSubmit={runSearch} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Name or description…" style={{ flex: 1 }} autoFocus />
        <button className="btn btn-primary" disabled={loading}>{loading ? 'Searching…' : 'Search'}</button>
      </form>

      {error && <p className="error-text">{error}</p>}

      {results !== null && (
        results.length === 0 ? (
          <p className="muted">No cases match "{term}".</p>
        ) : (
          <div className="grid" style={{ gap: 10 }}>
            <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>{results.length} result{results.length !== 1 && 's'}</p>
            {results.map((c) => (
              <Link to={`/cases/${c._id}`} key={c._id} className="card" style={{ display: 'flex', gap: 12, alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
                {c.photoUrl && <img src={c.photoUrl} alt={c.fullName} style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover' }} />}
                <div style={{ flex: 1 }}>
                  <strong>{c.fullName}</strong>
                  <p className="muted" style={{ margin: '2px 0 0', fontSize: 12.5 }}>
                    {c.jurisdiction?.district || 'Unknown district'} · Age {c.age}
                  </p>
                </div>
                <StatusPill status={c.status} />
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  );
}

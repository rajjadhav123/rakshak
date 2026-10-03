import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

const STATUS_STYLE = {
  pending: { text: 'Awaiting review', cls: 'status-under_search' },
  verified: { text: 'Verified', cls: 'status-verified' },
  rejected: { text: 'Not confirmed', cls: 'status-closed' },
};

export default function MyReports() {
  const [sightings, setSightings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    api.get('/sightings/mine')
      .then(({ data }) => setSightings(data.sightings))
      .catch((err) => setError(err.response?.data?.message || 'Could not load your reports.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <h2>My Reports</h2>
      <p className="muted">Every sighting you've submitted, and what happened to it.</p>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : error ? (
        <>
          <p className="error-text">{error}</p>
          <button className="btn btn-outline" onClick={load}>Retry</button>
        </>
      ) : sightings.length === 0 ? (
        <p className="muted">You haven't reported a sighting yet — open a case and use "Report a sighting" if you've seen someone.</p>
      ) : (
        <div className="grid" style={{ gap: 10 }}>
          {sightings.map((s) => {
            const style = STATUS_STYLE[s.status] || STATUS_STYLE.pending;
            return (
              <Link to={`/cases/${s.caseId?._id}`} key={s._id} className="card" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
                <div className="topbar" style={{ marginBottom: 4 }}>
                  <strong>{s.caseId?.fullName || 'Case no longer available'}</strong>
                  <span className={`status-pill ${style.cls}`}>{style.text}</span>
                </div>
                <p className="muted" style={{ margin: '0 0 4px', fontSize: 13 }}>{s.description}</p>
                <p className="muted" style={{ margin: 0, fontSize: 11.5 }}>
                  Reported {new Date(s.createdAt).toLocaleString()} · {s.address}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

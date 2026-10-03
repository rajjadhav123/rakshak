import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import StatusPill from '../components/StatusPill.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLES } from '../roles.js';

export default function MyAssignments() {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    api.get('/cases/assigned-to-me')
      .then(({ data }) => setCases(data.cases))
      .catch((err) => setError(err.response?.data?.message || 'Could not load your assignments — check your connection and try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const isVolunteer = user.role === ROLES.NGO_VOLUNTEER;

  return (
    <div>
      <h2>{isVolunteer ? 'My Assignments' : 'Cases My Organization Is Involved In'}</h2>
      <p className="muted">
        {isVolunteer
          ? 'Cases your NGO Admin has assigned you to help with.'
          : 'Cases automatically linked to your organization via nearby sightings, or manually — assign your volunteers from here.'}
      </p>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : error ? (
        <>
          <p className="error-text">{error}</p>
          <button className="btn btn-outline" onClick={load}>Retry</button>
        </>
      ) : cases.length === 0 ? (
        <p className="muted">
          {isVolunteer
            ? "You haven't been assigned to any cases yet."
            : 'No cases linked to your organization yet — this happens automatically when a citizen reports a sighting within your service area.'}
        </p>
      ) : (
        <div className="grid" style={{ gap: 12 }}>
          {cases.map((c) => (
            <div className="card" key={c._id}>
              <div className="topbar" style={{ marginBottom: 6 }}>
                <strong>{c.fullName}</strong>
                <StatusPill status={c.status} />
              </div>
              <p className="muted" style={{ margin: '0 0 8px' }}>{c.lastSeenLocation?.address}</p>
              <Link to={`/cases/${c._id}`}>Open case →</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

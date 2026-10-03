import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import CaseMap from '../components/CaseMap.jsx';
import StatusPill from '../components/StatusPill.jsx';

const RADIUS_OPTIONS = [10, 25, 50, 100];

export default function NearbyCases() {
  const [coords, setCoords] = useState(null);
  const [radiusKm, setRadiusKm] = useState(25);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Your browser doesn\u2019t support location access.');
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => { setError('Could not get your location — allow location access and reload this page.'); setLoading(false); }
    );
  }, []);

  useEffect(() => {
    if (!coords) return;
    setLoading(true);
    api.get('/cases/nearby', { params: { lat: coords.lat, lng: coords.lng, radiusKm } })
      .then(({ data }) => setCases(data.cases))
      .catch((err) => setError(err.response?.data?.message || 'Could not load nearby cases.'))
      .finally(() => setLoading(false));
  }, [coords, radiusKm]);

  return (
    <div>
      <div className="topbar">
        <h2>Nearby Cases</h2>
        <select style={{ width: 160 }} value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))}>
          {RADIUS_OPTIONS.map((r) => <option key={r} value={r}>Within {r} km</option>)}
        </select>
      </div>
      <p className="muted" style={{ marginTop: -8 }}>Active cases (verified or under search) near your current location.</p>

      {error && <p className="error-text">{error}</p>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : cases.length === 0 ? (
        <p className="muted">No active cases within {radiusKm} km right now.</p>
      ) : (
        <>
          <CaseMap cases={cases} />
          <div className="grid" style={{ gap: 10, marginTop: 16 }}>
            {cases.map((c) => (
              <Link to={`/cases/${c._id}`} key={c._id} className="card" style={{ display: 'flex', gap: 12, alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
                {c.photoUrl && <img src={c.photoUrl} alt={c.fullName} style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover' }} />}
                <div style={{ flex: 1 }}>
                  <strong>{c.fullName}</strong>
                  <p className="muted" style={{ margin: '2px 0 0', fontSize: 12.5 }}>{c.lastSeenLocation?.address}</p>
                </div>
                <StatusPill status={c.status} />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

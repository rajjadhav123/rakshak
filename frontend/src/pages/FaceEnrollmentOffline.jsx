import React, { useEffect, useState } from 'react';
import api from '../api/client';
import FaceCapture from '../components/FaceCapture.jsx';

const ENROLL_PROMPTS = ['Look straight at the camera', 'Turn slightly to your left', 'Turn slightly to your right'];

const STATUS_LABEL = {
  enrolled: { text: 'Enrolled', cls: 'status-verified' },
  pending: { text: 'Online request pending', cls: 'status-under_search' },
  rejected: { text: 'Rejected — needs resubmission', cls: 'status-closed' },
  not_enrolled: { text: 'Not enrolled', cls: 'status-closed' },
};

// The in-person counterpart to Face Enrollment Requests: a PSI visits
// the office, and instead of them self-capturing on their own device
// and waiting for review, the DySP captures the 3 angles right here —
// which IS the verification, so it's active immediately, no separate
// approval step. Reuses the exact same FaceCapture component the PSI
// uses for online enrollment; only the device holding the camera and
// who's authorizing it differ.
export default function FaceEnrollmentOffline() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [capturingId, setCapturingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [doneId, setDoneId] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get('/stations/officers');
    setStations(data.stations);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleComplete = async (officerId, results) => {
    setCapturingId(null);
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/face/enroll-offline/${officerId}`, {
        images: results.map((r) => r.imageDataUrl),
        descriptors: results.map((r) => r.descriptor),
      });
      setDoneId(officerId);
      setTimeout(() => setDoneId(null), 4000);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not complete enrollment — try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const term = search.trim().toLowerCase();
  const filteredStations = stations
    .map((s) => ({ ...s, officers: s.officers.filter((o) => !term || o.name.toLowerCase().includes(term)) }))
    .filter((s) => s.officers.length > 0 || !term);

  if (loading) return <p className="muted">Loading…</p>;

  return (
    <div>
      <h2>Face Enrollment (Offline)</h2>
      <p className="muted">
        For a Police Admin visiting your office in person. Capturing their face here yourself is the
        verification — it goes active immediately, with no separate review step.
      </p>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by officer name…"
        style={{ marginBottom: 16, maxWidth: 320 }}
      />
      {error && <p className="error-text">{error}</p>}

      {filteredStations.every((s) => s.officers.length === 0) ? (
        <p className="muted">No officers match "{search}".</p>
      ) : (
        <div className="grid" style={{ gap: 16 }}>
          {filteredStations.map((station) => station.officers.length > 0 && (
            <div className="card" key={station._id}>
              <strong style={{ fontSize: 13.5 }}>{station.name}</strong>
              <div className="grid" style={{ gap: 8, marginTop: 8 }}>
                {station.officers.map((o) => {
                  const status = STATUS_LABEL[o.faceEnrollment?.status || 'not_enrolled'];
                  return (
                    <div key={o._id} style={{ padding: 10, background: 'var(--surface-raised)', borderRadius: 6 }}>
                      <div className="topbar" style={{ marginBottom: 0 }}>
                        <div>
                          <strong>{o.name}</strong>{' '}
                          <span className={`status-pill ${status.cls}`}>{status.text}</span>
                          <p className="muted" style={{ margin: '2px 0 0', fontSize: 12 }}>{o.phone}</p>
                        </div>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '6px 12px', fontSize: 12.5 }}
                          onClick={() => setCapturingId(capturingId === o._id ? null : o._id)}
                          disabled={submitting}
                        >
                          {o.faceEnrollment?.status === 'enrolled' ? 'Re-enroll in person' : 'Enroll in person'}
                        </button>
                      </div>
                      {doneId === o._id && <p style={{ color: 'var(--success)', fontSize: 12, marginTop: 8 }}>Enrolled and active — {o.name} has been notified.</p>}
                      {capturingId === o._id && (
                        <div style={{ marginTop: 10 }}>
                          <p className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
                            Hand your device to {o.name}, or capture them directly — this uses your camera.
                          </p>
                          <FaceCapture
                            prompts={ENROLL_PROMPTS}
                            onComplete={(results) => handleComplete(o._id, results)}
                            onCancel={() => setCapturingId(null)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

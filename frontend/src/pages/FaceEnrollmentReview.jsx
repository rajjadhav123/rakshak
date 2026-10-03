import React, { useEffect, useState } from 'react';
import api from '../api/client';

const TABS = [
  { value: 'pending', label: 'Pending' },
  { value: 'enrolled', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export default function FaceEnrollmentReview() {
  const [status, setStatus] = useState('pending');
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [reason, setReason] = useState('');

  const load = async (s) => {
    setLoading(true);
    const { data } = await api.get('/face/enrollments', { params: { status: s } });
    setOfficers(data.officers);
    setLoading(false);
  };

  useEffect(() => { load(status); }, [status]); // eslint-disable-line

  const approve = async (id) => {
    setBusyId(id);
    try {
      await api.post(`/face/enrollment/${id}/approve`);
      await load(status);
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id) => {
    setBusyId(id);
    try {
      await api.post(`/face/enrollment/${id}/reject`, { reason });
      setRejectingId(null);
      setReason('');
      await load(status);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h2>Face Enrollment Requests</h2>
      <p className="muted">
        Police Admins in your district. Confirm the 3 photos are clearly that officer before
        approving — this becomes what's checked every time they verify a case or a sighting.
      </p>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t.value}
            className={status === t.value ? 'btn btn-primary' : 'btn btn-outline'}
            style={{ padding: '5px 12px', fontSize: 12.5 }}
            onClick={() => setStatus(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : officers.length === 0 ? (
        <p className="muted">No {TABS.find((t) => t.value === status).label.toLowerCase()} requests right now.</p>
      ) : (
        <div className="grid" style={{ gap: 14 }}>
          {officers.map((o) => (
            <div className="card" key={o._id}>
              <div className="topbar" style={{ marginBottom: 8 }}>
                <div>
                  <strong>{o.name}</strong>
                  <p className="muted" style={{ margin: '2px 0 0', fontSize: 12.5 }}>{o.phone}</p>
                </div>
                <span className="muted" style={{ fontSize: 12 }}>
                  {status === 'pending'
                    ? `Submitted ${o.faceEnrollment?.submittedAt ? new Date(o.faceEnrollment.submittedAt).toLocaleString() : ''}`
                    : `Reviewed ${o.faceEnrollment?.reviewedAt ? new Date(o.faceEnrollment.reviewedAt).toLocaleString() : ''}`}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {(o.faceEnrollment?.images || []).map((url, i) => (
                  <img key={i} src={url} alt={`${o.name} capture ${i + 1}`} style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                ))}
              </div>

              {status === 'rejected' && o.faceEnrollment?.rejectionReason && (
                <p className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>Reason: {o.faceEnrollment.rejectionReason}</p>
              )}

              {status === 'pending' && (
                rejectingId === o._id ? (
                  <div>
                    <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (shown to the officer)" style={{ marginBottom: 8 }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-outline" onClick={() => setRejectingId(null)} disabled={busyId === o._id}>Cancel</button>
                      <button className="btn btn-primary" onClick={() => reject(o._id)} disabled={busyId === o._id}>Confirm reject</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" onClick={() => approve(o._id)} disabled={busyId === o._id}>Approve</button>
                    <button className="btn btn-outline" onClick={() => setRejectingId(o._id)} disabled={busyId === o._id}>Reject</button>
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

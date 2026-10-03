import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext.jsx';
import StatusPill from '../components/StatusPill.jsx';
import PriorityBadge from '../components/PriorityBadge.jsx';

// The Police Station Admin's home — what Citizen (Search/Reports/
// Safety) and Family (My Missing Person) already got in v13, Police
// never did. Before this, logging in as a Police Admin landed on the
// same generic case-list Dashboard every role sees, with everything
// specific to the role (pending sightings, own cases, enrollment
// status) scattered across separate nav items with no single "here's
// what needs you today" view. This consolidates the highest-value,
// most-frequently-needed information directly (the review queue,
// active cases), and links out to already-well-built standalone flows
// (Register Case, Face Enrollment, Messages) rather than duplicating
// them here.
const isActive = (c) => ['verified', 'under_search'].includes(c.status);

function PendingReviewSection({ pending, error, onRetry }) {
  if (error) {
    return (
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Pending Reviews</h3>
        <p className="error-text">{error}</p>
        <button className="btn btn-outline" onClick={onRetry}>Retry</button>
      </div>
    );
  }
  if (pending === null) {
    return (
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Pending Reviews</h3>
        <p className="muted">Loading…</p>
      </div>
    );
  }
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Pending Reviews {pending.length > 0 && `(${pending.length})`}</h3>
      {pending.length === 0 ? (
        <p className="muted">No sightings waiting on you right now.</p>
      ) : (
        <div>
          {pending.slice(0, 8).map((s) => (
            <Link
              key={s._id}
              to={`/cases/${s.caseId?._id || s.caseId}`}
              style={{ display: 'block', padding: '10px 0', borderBottom: '1px solid var(--border)', textDecoration: 'none', color: 'inherit' }}
            >
              <strong>{s.caseId?.fullName || 'Unknown case'}</strong>
              {s.caseId?.age != null && <span className="muted">, {s.caseId.age} yrs</span>}
              <div className="muted" style={{ fontSize: 12.5 }}>
                Sighting from {s.reportedBy?.name || 'someone'} ({s.reportedBy?.role || 'unknown role'})
                {s.location?.address && ` — ${s.location.address}`}
              </div>
            </Link>
          ))}
          {pending.length > 8 && <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>+{pending.length - 8} more</p>}
        </div>
      )}
    </div>
  );
}

function MyCasesSection({ cases, error, onRetry }) {
  if (error) {
    return (
      <div className="card">
        <h3 style={{ marginTop: 0 }}>My Cases</h3>
        <p className="error-text">{error}</p>
        <button className="btn btn-outline" onClick={onRetry}>Retry</button>
      </div>
    );
  }
  if (cases === null) {
    return (
      <div className="card">
        <h3 style={{ marginTop: 0 }}>My Cases</h3>
        <p className="muted">Loading…</p>
      </div>
    );
  }
  const active = cases.filter(isActive);
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h3 style={{ marginTop: 0 }}>My Cases {active.length > 0 && `(${active.length} active)`}</h3>
        <Link to="/my-cases" style={{ fontSize: 12.5 }}>View all →</Link>
      </div>
      {cases.length === 0 ? (
        <p className="muted">You haven't verified any cases yet.</p>
      ) : active.length === 0 ? (
        <p className="muted">No active cases right now — {cases.length} resolved/closed.</p>
      ) : (
        <div>
          {active.slice(0, 6).map((c) => (
            <Link
              key={c._id}
              to={`/cases/${c._id}`}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', textDecoration: 'none', color: 'inherit' }}
            >
              <span><strong>{c.fullName}</strong>{c.age != null && <span className="muted">, {c.age} yrs</span>}</span>
              <span style={{ display: 'flex', gap: 6 }}>
                <PriorityBadge priority={c.priority} resolved={!isActive(c)} />
                <StatusPill status={c.status} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PoliceHome() {
  const { user } = useAuth();
  const [pending, setPending] = useState(null);
  const [pendingError, setPendingError] = useState('');
  const [cases, setCases] = useState(null);
  const [casesError, setCasesError] = useState('');

  const loadPending = () => {
    setPendingError('');
    api.get('/sightings/pending-review')
      .then(({ data }) => setPending(data.sightings))
      .catch((err) => setPendingError(err.response?.data?.message || 'Could not load pending reviews.'));
  };
  const loadCases = () => {
    setCasesError('');
    api.get('/cases/mine')
      .then(({ data }) => setCases(data.cases))
      .catch((err) => setCasesError(err.response?.data?.message || 'Could not load your cases.'));
  };
  useEffect(() => { loadPending(); loadCases(); }, []);

  const enrollmentStatus = user.faceEnrollment?.status;

  return (
    <div>
      <h2>Welcome back, {user.name}</h2>
      <p className="muted">{user.jurisdiction?.district ? `${user.jurisdiction.district} district` : 'Your station'}</p>

      {enrollmentStatus && enrollmentStatus !== 'enrolled' && (
        <div className="card" style={{ borderColor: 'var(--accent)', marginBottom: 16 }}>
          <p style={{ margin: 0 }}>
            {enrollmentStatus === 'not_enrolled' && 'Your face isn\u2019t enrolled yet — required before you can register or verify cases.'}
            {enrollmentStatus === 'pending' && 'Your face enrollment is awaiting District Control approval.'}
            {enrollmentStatus === 'rejected' && 'Your face enrollment was rejected — you\u2019ll need to resubmit it.'}
            {' '}<Link to="/face-enrollment">Go to Face Enrollment →</Link>
          </p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <Link to="/cases/new" className="btn btn-primary">Register Case (FIR)</Link>
        <Link to="/my-messages" className="btn btn-outline">Messages</Link>
      </div>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <PendingReviewSection pending={pending} error={pendingError} onRetry={loadPending} />
        <MyCasesSection cases={cases} error={casesError} onRetry={loadCases} />
      </div>
    </div>
  );
}

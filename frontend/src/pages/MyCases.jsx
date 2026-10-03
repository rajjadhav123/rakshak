import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import StatusPill from '../components/StatusPill.jsx';
import CaseProgress from '../components/CaseProgress.jsx';
import PriorityBadge from '../components/PriorityBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLES } from '../roles.js';

export default function MyCases() {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [eligibility, setEligibility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isReporter = [ROLES.FAMILY, ROLES.CITIZEN].includes(user.role);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/cases/mine');
      setCases(data.cases);
      setEligibility(data.emergencyReportEligibility);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load your cases — check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  return (
    <div>
      <h2>{isReporter ? 'My Cases' : 'Cases I Verified'}</h2>
      <p className="muted">
        {isReporter
          ? "Every report you've submitted, including ones still awaiting verification."
          : 'Your personal track record — cases you verified, separate from your station\'s full queue.'}
      </p>

      {error && (
        <div className="card" style={{ marginBottom: 20 }}>
          <p className="error-text" style={{ margin: 0 }}>{error}</p>
          <button className="btn btn-outline" style={{ marginTop: 8 }} onClick={load}>Retry</button>
        </div>
      )}

      {user.role === ROLES.FAMILY && eligibility && (
        <div className="card" style={{ marginBottom: 20 }}>
          {eligibility.testAccount ? (
            <p style={{ margin: 0, color: 'var(--success)' }}>
              Demo account — the once-per-30-days Emergency Report limit doesn't apply here, so you can keep testing freely.
            </p>
          ) : eligibility.canSubmit ? (
            <p style={{ margin: 0, color: 'var(--success)' }}>You're eligible to submit a new Emergency Report if needed.</p>
          ) : (
            <p style={{ margin: 0 }}>
              You last submitted an Emergency Report on <strong>{new Date(eligibility.lastSubmittedAt).toDateString()}</strong>.
              You'll be able to submit another on <strong>{new Date(eligibility.nextEligibleAt).toDateString()}</strong>.{' '}
              <span className="muted">For a new urgent situation before then, please contact your nearest police station directly.</span>
            </p>
          )}
        </div>
      )}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : cases.length === 0 ? (
        <p className="muted">
          {isReporter ? "You haven't submitted any reports yet." : "You haven't personally verified any cases yet."}
        </p>
      ) : (
        <table>
          <thead>
            <tr><th>Priority</th><th>Name</th><th>Submitted</th><th>Progress</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {[...cases]
              .sort((a, b) => {
                const aActive = !['found', 'closed'].includes(a.status);
                const bActive = !['found', 'closed'].includes(b.status);
                if (aActive !== bActive) return aActive ? -1 : 1;
                return new Date(b.createdAt) - new Date(a.createdAt);
              })
              .map((c) => {
                const resolved = ['found', 'closed'].includes(c.status);
                return (
                  <tr key={c._id}>
                    <td><PriorityBadge priority={c.priority} resolved={resolved} /></td>
                    <td>{c.fullName}</td>
                    <td className="muted">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td style={{ minWidth: 140 }}><CaseProgress status={c.status} compact /></td>
                    <td><StatusPill status={c.status} /></td>
                    <td><Link to={`/cases/${c._id}`}>View →</Link></td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      )}
    </div>
  );
}

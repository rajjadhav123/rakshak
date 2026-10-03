import React, { useEffect, useState } from 'react';
import api from '../api/client';
import BarChart from '../components/BarChart.jsx';
import { ROLE_LABELS } from '../roles.js';

export default function PlatformAdmin() {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([
      api.get('/admin/platform-stats'),
      api.get('/admin/audit-logs', { params: { limit: 50 } }),
    ]).then(([s, l]) => {
      setStats(s.data);
      setLogs(l.data.logs);
    }).catch((err) => {
      setError(err.response?.data?.message || 'Could not load platform stats — check your connection and try again.');
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return <p className="muted">Loading platform stats…</p>;
  if (error) return (
    <div>
      <p className="error-text">{error}</p>
      <button className="btn btn-outline" onClick={load}>Retry</button>
    </div>
  );
  if (!stats) return null;

  const roleData = Object.entries(stats.usersByRole).map(([k, v]) => ({ label: ROLE_LABELS[k] || k, value: v }));

  return (
    <div>
      <h2>Platform Administration</h2>
      <p className="muted">System-level visibility — user accounts and platform activity, not individual case data.</p>

      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <div className="card">
          <p className="muted" style={{ marginBottom: 4 }}>Total users</p>
          <h2 style={{ margin: 0 }}>{Object.values(stats.usersByRole).reduce((a, b) => a + b, 0)}</h2>
        </div>
        <div className="card">
          <p className="muted" style={{ marginBottom: 4 }}>Pending approval</p>
          <h2 style={{ margin: 0, color: 'var(--accent)' }}>{stats.usersByStatus.pending_approval || 0}</h2>
        </div>
        <div className="card">
          <p className="muted" style={{ marginBottom: 4 }}>Total audit events</p>
          <h2 style={{ margin: 0 }}>{stats.totalAuditEvents}</h2>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Users by role</h3>
        <BarChart data={roleData} />
      </div>

      <div className="card">
        <h3>Recent audit log</h3>
        <table>
          <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Target</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l._id}>
                <td className="muted" style={{ fontSize: 12 }}>{new Date(l.createdAt).toLocaleString()}</td>
                <td>{l.userId?.name || 'System'} <span className="muted">({ROLE_LABELS[l.userId?.role] || '—'})</span></td>
                <td className="case-id">{l.action}</td>
                <td className="case-id">{l.targetType}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <p className="muted">No audit events yet.</p>}
      </div>
    </div>
  );
}

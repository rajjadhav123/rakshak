import React, { useEffect, useState } from 'react';
import api from '../api/client';
import BarChart from '../components/BarChart.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_LABELS } from '../roles.js';

const STATUS_LABELS = {
  emergency_pending: 'Emergency',
  verified: 'Verified',
  under_search: 'Under Search',
  found: 'Found',
  closed: 'Closed',
};

export default function StatsDashboard() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [series, setSeries] = useState([]);
  const [regions, setRegions] = useState([]);
  const [groupedBy, setGroupedBy] = useState('state');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [o, t, r] = await Promise.all([
        api.get('/stats/overview'),
        api.get('/stats/timeseries', { params: { days: 14 } }),
        api.get('/stats/by-region'),
      ]);
      setOverview(o.data);
      setSeries(t.data.series);
      setRegions(r.data.regions);
      setGroupedBy(r.data.groupedBy);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load the dashboard — check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <p className="muted">Loading dashboard…</p>;
  if (error) return (
    <div>
      <p className="error-text">{error}</p>
      <button className="btn btn-outline" onClick={load}>Retry</button>
    </div>
  );
  if (!overview) return null;

  const statusData = Object.entries(overview.casesByStatus).map(([k, v]) => ({ label: STATUS_LABELS[k] || k, value: v }));
  const trendData = series.map((s) => ({ label: s.date.slice(5), value: s.count }));
  const regionData = regions.slice(0, 8).map((r) => ({ label: r.region, value: r.total }));

  return (
    <div>
      <div className="topbar">
        <h2>Control Room Dashboard</h2>
        <span className="role-badge" style={{ margin: 0 }}>{ROLE_LABELS[user.role]}</span>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <div className="card">
          <p className="muted" style={{ marginBottom: 4 }}>Total cases in scope</p>
          <h2 style={{ margin: 0 }}>{overview.totals.cases}</h2>
        </div>
        <div className="card">
          <p className="muted" style={{ marginBottom: 4 }}>New in last 30 days</p>
          <h2 style={{ margin: 0 }}>{overview.totals.newLast30Days}</h2>
        </div>
        <div className="card">
          <p className="muted" style={{ marginBottom: 4 }}>Resolution rate</p>
          <h2 style={{ margin: 0, color: 'var(--success)' }}>{overview.totals.resolutionRate}%</h2>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>Cases by status</h3>
          <BarChart data={statusData} />
        </div>
        <div className="card">
          <h3>Sightings pipeline</h3>
          <BarChart
            data={[
              { label: 'Pending', value: overview.sightingsByStatus.pending },
              { label: 'Verified', value: overview.sightingsByStatus.verified },
              { label: 'Rejected', value: overview.sightingsByStatus.rejected },
            ]}
            color="var(--info)"
          />
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>New cases — last 14 days</h3>
        {trendData.length === 0 ? <p className="muted">No cases created in this window yet.</p> : <BarChart data={trendData} color="var(--success)" />}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>By {groupedBy}</h3>
        {regionData.length === 0 ? <p className="muted">No data yet.</p> : <BarChart data={regionData} />}
      </div>
    </div>
  );
}

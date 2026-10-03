import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import CaseMap from '../components/CaseMap.jsx';
import StatusPill from '../components/StatusPill.jsx';
import CaseProgress from '../components/CaseProgress.jsx';
import PriorityBadge from '../components/PriorityBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ADMIN_ROLES, ROLES } from '../roles.js';
import { useAreas } from '../hooks/useAreas.js';

const PRIORITY_RANK = { critical: 3, high: 2, medium: 1, low: 0 };

export default function Dashboard() {
  const { user } = useAuth();
  const { areas: MAHARASHTRA_AREAS, districts: DISTRICTS } = useAreas();
  const isOfficial = ADMIN_ROLES.includes(user.role);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  // '' = my own area (server default: home district, or jurisdiction
  // for officials) · 'all' = nationwide · a district name = explicit.
  const [areaFilter, setAreaFilter] = useState('');
  const [talukaFilter, setTalukaFilter] = useState('');
  const [myArea, setMyArea] = useState(null);

  useEffect(() => { api.get('/users/my-area').then(({ data }) => setMyArea(data)); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (areaFilter === 'all') params.scope = 'all';
      else if (areaFilter) params.district = areaFilter;
      const { data } = await api.get('/cases', { params });
      setCases(data.cases);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter, areaFilter]); // eslint-disable-line

  // Most urgent ACTIVE cases float to the top — but a case that's
  // closed (or already found) is no longer an urgency signal no matter
  // what priority it was assigned while active. Without this, a
  // long-closed "Critical" case would keep sitting above genuinely
  // active cases every time the list loads, which is exactly backwards
  // for what a control room needs to see first.
  const isActive = (c) => !['found', 'closed'].includes(c.status);
  // Taluka/city narrowing is a client-side text match against the
  // last-seen address — there's no separate taluka field in the data
  // model yet (district is the real jurisdiction unit backing this
  // app's routing), so this only catches cases whose address actually
  // mentions the area name. Good enough for "show me Vasai specifically
  // within Palghar" without a schema change.
  const visibleCases = talukaFilter
    ? cases.filter((c) => c.lastSeenLocation?.address?.toLowerCase().includes(talukaFilter.toLowerCase()))
    : cases;
  const sortedCases = [...visibleCases].sort((a, b) => {
    const aActive = isActive(a), bActive = isActive(b);
    if (aActive !== bActive) return aActive ? -1 : 1;
    if (aActive) return (PRIORITY_RANK[b.priority] ?? 1) - (PRIORITY_RANK[a.priority] ?? 1);
    return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
  });

  return (
    <div>
      {user.role === ROLES.POLICE_ADMIN && user.faceEnrollment?.status !== 'enrolled' && (
        <div className="card" style={{ borderColor: 'var(--accent)', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <strong>Face recognition {user.faceEnrollment?.status === 'pending' ? 'pending review' : user.faceEnrollment?.status === 'rejected' ? 'was rejected' : 'is pending'}.</strong>
            <p className="muted" style={{ margin: '2px 0 0', fontSize: 12.5 }}>
              {user.faceEnrollment?.status === 'pending'
                ? 'Awaiting approval from your District Control office.'
                : 'Required before you can verify a case or sighting — visit your District Control office, or complete it online.'}
            </p>
          </div>
          {user.faceEnrollment?.status !== 'pending' && <Link to="/face-enrollment" className="btn btn-primary">Complete now</Link>}
        </div>
      )}

      <div className="topbar">
        <h2>Active Cases</h2>
        <select style={{ width: 220 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {isOfficial && <option value="emergency_pending">Pending Verification</option>}
          <option value="verified">Verified</option>
          <option value="under_search">Under Search</option>
          <option value="found">Found</option>
          {isOfficial && <option value="closed">Closed</option>}
        </select>
      </div>

      {myArea && (
        <p className="muted" style={{ marginTop: -8, marginBottom: 12, fontSize: 12.5 }}>
          📍 Your area: <strong>{myArea.label || 'Not set'}</strong>
          {!myArea.district && myArea.label !== 'All India (platform-wide)' && ' — set this on your profile to get a scoped default view'}
        </p>
      )}

      <div className="topbar" style={{ marginTop: -4 }}>
        <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
          {areaFilter === 'all' ? 'Showing all areas.' : areaFilter ? `Showing ${areaFilter}.` : 'Showing your own area by default.'}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <select style={{ width: 160 }} value={areaFilter} onChange={(e) => { setAreaFilter(e.target.value); setTalukaFilter(''); }}>
            <option value="">My area</option>
            <option value="all">All areas</option>
            {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          {areaFilter && areaFilter !== 'all' && (
            <select style={{ width: 160 }} value={talukaFilter} onChange={(e) => setTalukaFilter(e.target.value)}>
              <option value="">Every city/taluka</option>
              {(MAHARASHTRA_AREAS[areaFilter] || []).map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
            </select>
          )}
        </div>
      </div>

      <CaseMap cases={visibleCases} />

      <h3 style={{ marginTop: 24 }}>Case list ({visibleCases.length}) <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>— sorted by priority</span></h3>
      {loading ? (
        <p className="muted">Loading…</p>
      ) : visibleCases.length === 0 ? (
        <p className="muted">No cases match this filter yet.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Priority</th><th>Name</th><th>Age</th><th>Last seen</th><th>Progress</th><th>Status</th><th>FIR</th><th></th></tr>
          </thead>
          <tbody>
            {sortedCases.map((c) => (
              <tr key={c._id}>
                <td><PriorityBadge priority={c.priority} resolved={!isActive(c)} /></td>
                <td>{c.fullName}</td>
                <td>{c.age}</td>
                <td>{c.lastSeenLocation?.address}</td>
                <td style={{ minWidth: 140 }}><CaseProgress status={c.status} compact /></td>
                <td><StatusPill status={c.status} /></td>
                <td className="case-id">{c.firNumber || '—'}</td>
                <td><Link to={`/cases/${c._id}`}>View →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

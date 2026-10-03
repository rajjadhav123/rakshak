import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import StatusPill from '../components/StatusPill.jsx';
import CaseProgress from '../components/CaseProgress.jsx';
import PriorityBadge from '../components/PriorityBadge.jsx';
import DocumentsPanel from '../components/DocumentsPanel.jsx';
import AdditionalInfoPanel from '../components/AdditionalInfoPanel.jsx';
import PhotosPanel from '../components/PhotosPanel.jsx';
import CaseMessageThread from '../components/CaseMessageThread.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import { ADMIN_ROLES, ROLE_LABELS } from '../roles.js';

const TABS = [
  'Case Status', 'Timeline', 'Police Updates', 'Approved Sightings',
  'Documents', 'Additional Information', 'Photos', 'Notifications', 'Contact Officer',
];

function CaseStatusTab({ caseData }) {
  return (
    <div>
      <div className="topbar" style={{ marginBottom: 4 }}>
        <StatusPill status={caseData.status} />
        {caseData.priority && <PriorityBadge priority={caseData.priority} resolved={['found', 'closed'].includes(caseData.status)} />}
      </div>
      <CaseProgress status={caseData.status} />
      <div className="grid grid-2" style={{ gap: '10px 20px', fontSize: 13.5, marginTop: 16 }}>
        <div><span className="muted" style={{ fontSize: 12 }}>Filed on</span><p style={{ margin: '2px 0 0' }}>{new Date(caseData.createdAt).toLocaleString()}</p></div>
        <div><span className="muted" style={{ fontSize: 12 }}>Assigned station</span><p style={{ margin: '2px 0 0' }}>{caseData.policeStationId?.name || 'Not yet assigned'}</p></div>
        {caseData.firNumber && <div><span className="muted" style={{ fontSize: 12 }}>FIR number</span><p style={{ margin: '2px 0 0' }}>{caseData.firNumber}</p></div>}
        {caseData.verifiedBy && <div><span className="muted" style={{ fontSize: 12 }}>Verified by</span><p style={{ margin: '2px 0 0' }}>{caseData.verifiedBy.name}</p></div>}
      </div>
    </div>
  );
}

function TimelineTab({ caseData, policeOnly }) {
  const entries = (caseData.timeline || []).filter((e) => !policeOnly || ADMIN_ROLES.includes(e.actor?.role)).slice().reverse();
  if (entries.length === 0) {
    return <p className="muted">{policeOnly ? 'No police updates yet.' : 'No timeline entries yet.'}</p>;
  }
  return (
    <div className="grid" style={{ gap: 10 }}>
      {entries.map((e, i) => (
        <div key={i} style={{ borderLeft: '2px solid var(--border)', paddingLeft: 12 }}>
          <strong style={{ fontSize: 13.5 }}>{e.label}</strong>
          {e.note && <p style={{ margin: '2px 0', fontSize: 13 }}>{e.note}</p>}
          <p className="muted" style={{ margin: 0, fontSize: 11.5 }}>
            {e.actor?.name && `${e.actor.name}${e.actor.role ? ` (${ROLE_LABELS[e.actor.role] || e.actor.role})` : ''} · `}
            {new Date(e.at).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}

function ApprovedSightingsTab({ caseId }) {
  const [sightings, setSightings] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    api.get('/sightings', { params: { caseId, status: 'verified' } })
      .then(({ data }) => setSightings(data.sightings))
      .catch((err) => setError(err.response?.data?.message || 'Could not load sightings.'));
  };
  useEffect(load, [caseId]);

  if (error) {
    return (
      <>
        <p className="error-text">{error}</p>
        <button className="btn btn-outline" onClick={load}>Retry</button>
      </>
    );
  }
  if (sightings === null) return <p className="muted">Loading…</p>;
  if (sightings.length === 0) return <p className="muted">No approved sightings yet.</p>;
  return (
    <div className="grid" style={{ gap: 10 }}>
      {sightings.map((s) => (
        <div className="card" key={s._id}>
          <p style={{ margin: '0 0 4px', fontSize: 13.5 }}>{s.description}</p>
          <p className="muted" style={{ margin: 0, fontSize: 12 }}>{s.address} · {new Date(s.createdAt).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}

function NotificationsTab({ caseId }) {
  const { notifications } = useNotifications();
  const relevant = notifications.filter((n) => String(n.caseId) === String(caseId));
  if (relevant.length === 0) return <p className="muted">No notifications about this case yet.</p>;
  return (
    <div className="grid" style={{ gap: 8 }}>
      {relevant.map((n) => (
        <div className="card" key={n._id} style={{ opacity: n.read ? 0.6 : 1 }}>
          <p style={{ margin: 0, fontSize: 13.5 }}>{n.message}</p>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: 11.5 }}>{new Date(n.createdAt).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}

function CasePicker({ cases, onSelect }) {
  return (
    <div>
      <h2>My Missing Person</h2>
      <p className="muted">You have more than one case on file — choose one.</p>
      <div className="grid" style={{ gap: 10 }}>
        {cases.map((c) => (
          <button key={c._id} className="card" style={{ textAlign: 'left', cursor: 'pointer', border: 'none' }} onClick={() => onSelect(c._id)}>
            <strong>{c.fullName}</strong> <StatusPill status={c.status} />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function MyMissingPerson() {
  const [myCases, setMyCases] = useState(null);
  const [casesError, setCasesError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [caseData, setCaseData] = useState(null);
  const [tab, setTab] = useState('Case Status');
  const [error, setError] = useState('');

  const loadMyCases = () => {
    setCasesError('');
    api.get('/cases/mine')
      .then(({ data }) => {
        setMyCases(data.cases);
        if (data.cases.length === 1) setSelectedId(data.cases[0]._id);
      })
      .catch((err) => setCasesError(err.response?.data?.message || 'Could not load your cases.'));
  };
  useEffect(loadMyCases, []);

  const loadCase = () => {
    if (!selectedId) return;
    api.get(`/cases/${selectedId}`)
      .then(({ data }) => setCaseData(data.case))
      .catch((err) => setError(err.response?.data?.message || 'Could not load this case.'));
  };

  useEffect(() => { loadCase(); }, [selectedId]); // eslint-disable-line

  if (casesError) {
    return (
      <div>
        <h2>My Missing Person</h2>
        <p className="error-text">{casesError}</p>
        <button className="btn btn-outline" onClick={loadMyCases}>Retry</button>
      </div>
    );
  }
  if (myCases === null) return <p className="muted">Loading…</p>;

  if (myCases.length === 0) {
    return (
      <div>
        <h2>My Missing Person</h2>
        <p className="muted">You haven't filed a report yet.</p>
        <Link to="/emergency" className="btn btn-primary">File an Emergency Report</Link>
      </div>
    );
  }

  if (!selectedId) return <CasePicker cases={myCases} onSelect={setSelectedId} />;
  if (error) return <p className="error-text">{error}</p>;
  if (!caseData) return <p className="muted">Loading…</p>;

  return (
    <div>
      <div className="topbar">
        <h2>{caseData.fullName}</h2>
        {myCases.length > 1 && <button className="btn btn-outline" onClick={() => setSelectedId(null)}>Switch case</button>}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
        {TABS.map((t) => (
          <button
            key={t}
            className={tab === t ? 'btn btn-primary' : 'btn btn-outline'}
            style={{ padding: '5px 11px', fontSize: 12.5 }}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Case Status' && <CaseStatusTab caseData={caseData} />}
      {tab === 'Timeline' && <TimelineTab caseData={caseData} />}
      {tab === 'Police Updates' && <TimelineTab caseData={caseData} policeOnly />}
      {tab === 'Approved Sightings' && <ApprovedSightingsTab caseId={caseData._id} />}
      {tab === 'Documents' && <DocumentsPanel caseId={caseData._id} documents={caseData.documents} onChanged={loadCase} />}
      {tab === 'Additional Information' && <AdditionalInfoPanel caseId={caseData._id} additionalInfo={caseData.additionalInfo} onChanged={loadCase} />}
      {tab === 'Photos' && <PhotosPanel caseId={caseData._id} photoUrl={caseData.photoUrl} photos={caseData.photos} onChanged={loadCase} />}
      {tab === 'Notifications' && <NotificationsTab caseId={caseData._id} />}
      {tab === 'Contact Officer' && <CaseMessageThread caseId={caseData._id} />}
    </div>
  );
}

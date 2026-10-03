import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import MessageThread from '../components/MessageThread.jsx';

export default function OfficerActivity() {
  const [stations, setStations] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openThreadId, setOpenThreadId] = useState(null);

  const load = async () => {
    setLoading(true);
    const [officersRes, activityRes] = await Promise.all([
      api.get('/stations/officers'),
      api.get('/admin/district-activity', { params: { limit: 30 } }),
    ]);
    setStations(officersRes.data.stations);
    setActivity(activityRes.data.logs);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // A tel: link opens the phone's own dialer — this app has no way to
  // know if the call connects. What it CAN do honestly is record that
  // Call was tapped with intent to reach this officer. That record
  // lives in the same conversation thread as text messages (see
  // backend/controllers/messageController.js logCall) and counts
  // exactly the same toward unlocking that PSI's ability to reply.
  // Fire-and-forget: never block the actual phone call on this request.
  const logCall = (officerId) => { api.post('/messages/log-call', { to: officerId }).catch(() => {}); };

  if (loading) return <p className="muted">Loading…</p>;

  const allOfficers = stations.flatMap((s) => s.officers.map((o) => ({ ...o, stationName: s.name })));

  return (
    <div>
      <h2>Officer Activity</h2>
      <p className="muted">Every Police Admin in your district — reachability, and what they've recently done.</p>
      <p className="muted" style={{ marginTop: -8, fontSize: 12.5 }}>
        Call and Message are separate actions on purpose: Message opens the real conversation thread
        below, Call dials directly. An officer can only message you back after you've called or
        messaged them first.
      </p>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Officer Directory</h3>
        {allOfficers.length === 0 ? (
          <p className="muted">No officers assigned to stations in your district yet.</p>
        ) : (
          <div className="grid" style={{ gap: 10 }}>
            {allOfficers.map((o) => (
              <div key={o._id} style={{ padding: 12, background: 'var(--surface-raised)', borderRadius: 6 }}>
                <div className="topbar" style={{ marginBottom: 0 }}>
                  <div>
                    <strong>{o.name}</strong>{' '}
                    <span className={`status-pill ${o.onDuty ? 'status-verified' : 'status-closed'}`}>
                      {o.onDuty ? 'On duty' : 'Off duty'}
                    </span>
                    <p className="muted" style={{ margin: '2px 0 0', fontSize: 12.5 }}>{o.stationName} · {o.phone}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <a href={`tel:${o.phone}`} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={() => logCall(o._id)}>Call</a>
                    <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={() => setOpenThreadId(openThreadId === o._id ? null : o._id)}>
                      {openThreadId === o._id ? 'Hide' : 'Message'}
                    </button>
                  </div>
                </div>
                {openThreadId === o._id && (
                  <div style={{ marginTop: 10 }}>
                    <MessageThread otherUserId={o._id} otherUserName={o.name} onClose={() => setOpenThreadId(null)} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3>Recent Activity</h3>
        {activity.length === 0 ? (
          <p className="muted">No recent activity from your officers yet.</p>
        ) : (
          <table>
            <thead><tr><th>When</th><th>Officer</th><th>Action</th><th>Case</th><th></th></tr></thead>
            <tbody>
              {activity.map((log) => (
                <tr key={log._id}>
                  <td className="muted" style={{ fontSize: 12 }}>{new Date(log.createdAt).toLocaleString()}</td>
                  <td>{log.userId?.name || 'Unknown'}</td>
                  <td className="case-id">{log.action}</td>
                  <td>{log.targetType === 'Case' && <Link to={`/cases/${log.targetId}`}>View →</Link>}</td>
                  <td>
                    {log.userId?.phone && <a href={`tel:${log.userId.phone}`} className="btn btn-outline" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => log.userId?._id && logCall(log.userId._id)}>Call</a>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLES } from '../roles.js';

export default function Notifications() {
  const { notifications, markAllRead, markRead } = useNotifications();
  const { user } = useAuth();

  return (
    <div>
      <div className="topbar">
        <h2>Notifications</h2>
        <button className="btn btn-outline" onClick={markAllRead}>Mark all read</button>
      </div>
      <p className="muted" style={{ marginTop: -12, marginBottom: 16 }}>
        Live — new notifications appear here instantly while you're online, no refresh needed.
      </p>

      {notifications.length === 0 ? (
        <p className="muted">No notifications yet.</p>
      ) : (
        <div className="grid" style={{ gap: 10 }}>
          {notifications.map((n) => (
            <div className="card" key={n._id} style={{ opacity: n.read ? 0.6 : 1, cursor: n.read ? 'default' : 'pointer' }} onClick={() => !n.read && markRead(n._id)}>
              <p style={{ margin: 0 }}>{n.message}</p>
              <p className="muted" style={{ margin: '4px 0 0' }}>
                {new Date(n.createdAt).toLocaleString()}
                {n.caseId && <> · <Link to={`/cases/${n.caseId}`} onClick={(e) => e.stopPropagation()}>View case →</Link></>}
                {user.role === ROLES.POLICE_ADMIN && /check Messages|called you/.test(n.message) && (
                  <> · <Link to="/my-messages" onClick={(e) => e.stopPropagation()}>Reply →</Link></>
                )}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

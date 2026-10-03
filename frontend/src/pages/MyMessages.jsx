import React, { useEffect, useState } from 'react';
import api from '../api/client';
import MessageThread from '../components/MessageThread.jsx';

// The Police Admin side of the conversation — finds their own
// District Control automatically (by jurisdiction, no need to search)
// and hands off to the same MessageThread component District Control
// uses from Officer Activity, so both sides see an identical,
// consistent view of the same conversation.
export default function MyMessages() {
  const [districtControl, setDistrictControl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    api.get('/messages/my-district-control')
      .then(({ data }) => setDistrictControl(data.districtControl))
      .catch((err) => setError(err.response?.data?.message || 'Could not load your messages.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  return (
    <div>
      <h2>Messages</h2>
      <p className="muted">
        Your conversation with District Control. They message or call you first — once they have, you
        can reply here.
      </p>
      {loading ? (
        <p className="muted">Loading…</p>
      ) : error ? (
        <>
          <p className="error-text">{error}</p>
          <button className="btn btn-outline" onClick={load}>Retry</button>
        </>
      ) : !districtControl ? (
        <p className="muted">No District Control account found for your district yet.</p>
      ) : (
        <MessageThread otherUserId={districtControl._id} otherUserName={districtControl.name} />
      )}
    </div>
  );
}

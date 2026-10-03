import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext.jsx';
import { getSocket } from '../socket.js';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState(null);
  const lastJoinedUserId = useRef(null);

  const refresh = useCallback(async () => {
    if (!user) { setNotifications([]); setUnreadCount(0); return; }
    const { data } = await api.get('/notifications');
    setNotifications(data.notifications);
    setUnreadCount(data.unreadCount);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  // Joins a per-user Socket.io room and listens for live pushes from
  // the backend (see backend/utils/notify.js) — this is what makes
  // notifications appear instantly instead of only on next page load.
  //
  // IMPORTANT: explicitly leaves the PREVIOUS user's room before
  // joining the new one. Without this, logging out of Account A and
  // into Account B in the same tab leaves that tab's socket connection
  // subscribed to both rooms forever — meaning it would keep receiving
  // Account A's notifications even while showing Account B's UI.
  useEffect(() => {
    const socket = getSocket();

    if (lastJoinedUserId.current && lastJoinedUserId.current !== user?._id) {
      socket.emit('leave', lastJoinedUserId.current);
      lastJoinedUserId.current = null;
    }

    if (!user) return;

    socket.emit('join', user._id);
    lastJoinedUserId.current = user._id;

    const handleNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((c) => c + 1);
      setToast(notification.message);
      setTimeout(() => setToast(null), 6000);
    };

    socket.on('notification', handleNotification);
    return () => socket.off('notification', handleNotification);
  }, [user]);

  const markAllRead = async () => {
    await api.patch('/notifications/read-all');
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, refresh, markAllRead, markRead }}>
      {children}
      {toast && (
        <div
          style={{
            position: 'fixed', bottom: 20, right: 20, maxWidth: 340, zIndex: 1000,
            background: 'var(--surface-raised)', border: '1px solid var(--accent)',
            borderRadius: 8, padding: '12px 16px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          <strong style={{ color: 'var(--accent)', fontSize: 13 }}>New notification</strong>
          <p style={{ margin: '4px 0 0', fontSize: 13 }}>{toast}</p>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);

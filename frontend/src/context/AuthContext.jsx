import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

// sessionStorage, NOT localStorage — this is deliberate. localStorage is
// shared across every tab of the same browser, which is disastrous for
// testing a multi-role app: logging into a second role in Tab 2 would
// silently overwrite Tab 1's session, so Tab 1 keeps showing the old
// user's name while quietly making API calls (and joining the
// notification socket room) as whoever logged in most recently,
// anywhere in the browser. sessionStorage is per-tab, so you can have
// all 9 roles open in 9 tabs of the same browser simultaneously with
// no cross-talk.
const TOKEN_KEY = 'rakshak_token';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = async () => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch {
      sessionStorage.removeItem(TOKEN_KEY);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMe(); }, []);

  // Re-fetches the current user without touching the loading state or
  // clearing the session on failure — for refreshing something like
  // faceEnrollment.status after an action changes it server-side,
  // not for the initial page-load auth check (loadMe already does that).
  const refreshUser = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch {
      // Leave the session alone — a transient failure here shouldn't
      // log someone out mid-task.
    }
  };

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    sessionStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    sessionStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

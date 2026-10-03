import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

api.interceptors.request.use((config) => {
  // sessionStorage (not localStorage) — see context/AuthContext.jsx for why:
  // it keeps each browser tab's login independent, which matters a lot
  // when testing 9 different roles side by side.
  const token = sessionStorage.getItem('rakshak_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;

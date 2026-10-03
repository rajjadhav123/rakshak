import { io } from 'socket.io-client';

let socket = null;

// Derives the socket server URL from VITE_API_URL by stripping the
// trailing /api — same backend, same port, just the base origin.
export const getSocket = () => {
  if (!socket) {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const base = apiUrl.replace(/\/api\/?$/, '');
    socket = io(base, { autoConnect: true, transports: ['websocket', 'polling'] });
  }
  return socket;
};

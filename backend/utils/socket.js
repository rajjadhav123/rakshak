let ioInstance = null;

/**
 * Initializes Socket.io on the given HTTP server. Each connected client
 * joins a room named `user:<userId>` right after login (see the 'join'
 * event below), so a notification for a specific user can be pushed to
 * exactly that room — no broadcast-and-filter needed.
 *
 * The 'leave' event matters more than it looks: Socket.io rooms are
 * additive — joining a new room does NOT remove the socket from a
 * previous one. If someone logs out of Account A and into Account B in
 * the SAME browser tab (same long-lived socket connection), that
 * connection stays in room `user:A` forever unless something tells it
 * to leave. Without this, that tab would keep receiving Account A's
 * live notifications indefinitely, even while showing Account B's UI —
 * which looks exactly like "notifications going to the wrong account."
 */
const initSocket = (httpServer, corsOrigin) => {
  const { Server } = require('socket.io');
  ioInstance = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
  });

  ioInstance.on('connection', (socket) => {
    socket.on('join', (userId) => {
      if (userId) socket.join(`user:${userId}`);
    });
    socket.on('leave', (userId) => {
      if (userId) socket.leave(`user:${userId}`);
    });
  });

  return ioInstance;
};

const getIo = () => ioInstance;

module.exports = { initSocket, getIo };

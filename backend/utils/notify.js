const Notification = require('../models/Notification');
const { getIo } = require('./socket');

/**
 * Creates an in-app notification AND pushes it live over Socket.io to
 * that user's room, if they're currently connected. The DB write still
 * happens regardless, so a user who's offline sees it on next login —
 * this is additive real-time delivery, not a replacement for polling.
 */
const notifyUser = async ({ userId, type, message, caseId }) => {
  try {
    const notification = await Notification.create({ userId, type, message, caseId });

    const io = getIo();
    if (io) io.to(`user:${userId}`).emit('notification', notification);

    return notification;
  } catch (err) {
    console.error('[Rakshak] Failed to create notification:', err.message);
  }
};

const notifyMany = async (userIds, payload) => {
  return Promise.all(userIds.map((userId) => notifyUser({ ...payload, userId })));
};

module.exports = { notifyUser, notifyMany };

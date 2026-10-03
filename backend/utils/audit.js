const AuditLog = require('../models/AuditLog');

/**
 * Fire-and-forget audit trail write. Never throws into the caller's
 * request flow — a logging failure should not fail the user's action.
 */
const logAction = async ({ userId, action, targetType, targetId, meta, req }) => {
  try {
    await AuditLog.create({
      userId,
      action,
      targetType,
      targetId,
      meta,
      ipAddress: req?.ip,
    });
  } catch (err) {
    console.error('[Rakshak] Failed to write audit log:', err.message);
  }
};

module.exports = { logAction };

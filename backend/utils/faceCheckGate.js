const FaceCheck = require('../models/FaceCheck');

// Used directly inside a sensitive action (attachFir, sighting verify)
// to require a passed face check immediately beforehand. Consumes the
// nonce on success — each verified stage is good for exactly ONE
// sensitive action, not a whole session. That's a deliberate
// trade-off (verifying 5 sightings in a row means 5 face checks, not
// one), made because the entire point is "prove it's really you
// making THIS decision" — a reusable-for-a-while token would quietly
// weaken that back down to session-level trust.
//
// Returns { ok: true } or { ok: false, message } — callers should
// respond 403 with the message on failure, never fall back to
// allowing the action through.
const requireFaceVerification = async (userId, nonce) => {
  if (!nonce) return { ok: false, message: 'Face verification is required for this action.' };

  const check = await FaceCheck.findOne({ userId, nonce, stage: 'verified', expiresAt: { $gt: new Date() } });
  if (!check) {
    return { ok: false, message: 'Face verification missing or expired \u2014 please verify your face again and retry.' };
  }
  await check.deleteOne(); // single-use — see file header
  return { ok: true };
};

module.exports = { requireFaceVerification };

const mongoose = require('mongoose');

// Anti-replay primitive for face step-up verification (see
// controllers/faceController.js and utils/faceMatch.js).
//
// Without this, a client would just POST a descriptor and get a
// pass/fail back — meaning anyone who ever observed ONE valid
// {descriptor} payload (a compromised browser extension, a proxy, a
// devtools session) could resend that exact same payload forever
// afterward, with no camera or face involved at all. A nonce fixes
// that: the server issues one right before capture starts, the
// descriptor submission must reference it, and it's marked used
// immediately — so a captured payload is worthless the second time.
//
// Two stages:
//   'pending'  — challenge issued, waiting for a descriptor to check
//                against it (POST /api/face/challenge creates this)
//   'verified' — the submitted descriptor matched the user's enrolled
//                face; this stage is itself the short-lived proof
//                consumed by attachFir / sighting verify to allow the
//                action through
//
// expiresAt has a TTL index — Mongo garbage-collects these on its own,
// nothing manual to clean up.
const faceCheckSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  nonce: { type: String, required: true, unique: true },
  stage: { type: String, enum: ['pending', 'verified'], default: 'pending' },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

faceCheckSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('FaceCheck', faceCheckSchema);

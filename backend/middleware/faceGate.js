const asyncHandler = require('express-async-handler');
const { requireFaceVerification } = require('../utils/faceCheckGate');
const { ROLES } = require('../config/roles');

// Route-level version of the face-verification gate — dropped directly
// into a route's middleware chain (see routes/caseRoutes.js,
// routes/sightingRoutes.js) instead of called manually inside a
// controller function body.
//
// THIS IS A DELIBERATE FIX, NOT JUST A STYLE CHOICE: the inline
// version (a few lines pasted at the top of attachFir and
// verifySighting) is exactly how createCase — "Register Case (FIR)",
// arguably the single most important action to gate, since it's the
// direct "lodge a fake case" path — ended up with no check at all.
// Nothing about reading caseController.js signaled that a new
// case-mutating function needed the same treatment; the gate was
// invisible unless you already knew to look for it inside each
// function body individually.
//
// With this instead, "which actions require a face check" is a single
// list, visible by reading the route files — not something that has
// to be remembered and manually re-added per function. Applied to:
// createCase, attachFir, updateStatus, updateCase, restoreVersion
// (caseRoutes.js) and sighting verification (sightingRoutes.js).
//
// Passes through untouched for every role except Police Admin — same
// scope as before, District Control/State Control/Super Admin taking
// these same actions are unaffected.
const requireFaceGate = asyncHandler(async (req, res, next) => {
  if (req.user.role !== ROLES.POLICE_ADMIN) return next();

  const gate = await requireFaceVerification(req.user._id, req.body.faceVerifyNonce);
  if (!gate.ok) { res.status(403); throw new Error(gate.message); }
  next();
});

module.exports = { requireFaceGate };

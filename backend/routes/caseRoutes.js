const express = require('express');
const router = express.Router();
const {
  createCase, createEmergencyReport, checkDuplicates, attachFir, listCases, nearbyCases, getCase, updateStatus,
  updateCase, listVersions, restoreVersion, assignVolunteer, fieldUpdate, listAssignedToMe, listMine, reassignStation, setPriority,
  addPhoto, addDocument, addAdditionalInfo,
} = require('../controllers/caseController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { requireFaceGate } = require('../middleware/faceGate');
const { CAN_CREATE_VERIFIED_CASE, CAN_CREATE_EMERGENCY_REPORT, OPERATIONAL_ROLES, ROLES } = require('../config/roles');

// Public-ish reads (still require login so we know what to restrict/show)
router.get('/', protect, listCases);
router.get('/nearby', protect, nearbyCases);
router.get('/assigned-to-me', protect, listAssignedToMe);
router.get('/mine', protect, listMine);
router.get('/:id', protect, getCase);

// Pre-flight duplicate check — run by the frontend just before either
// creation endpoint below. Anyone who can create a case at all (either
// kind) can call it; it only ever reads existing cases, never writes.
router.post('/check-duplicates', protect, authorize(...CAN_CREATE_VERIFIED_CASE, ...CAN_CREATE_EMERGENCY_REPORT), checkDuplicates);

// Official, FIR-anchored case creation. This is THE direct "lodge a
// fake case" path — the one the face-recognition feature exists for
// above anything else — so it gets the gate even though it's also the
// one that was missed in the first implementation pass.
router.post('/', protect, authorize(...CAN_CREATE_VERIFIED_CASE), requireFaceGate, createCase);

// Family emergency (pre-FIR) report — Family/Citizen roles, not
// Police Admin, so no face gate applies here.
router.post('/emergency', protect, authorize(...CAN_CREATE_EMERGENCY_REPORT), createEmergencyReport);

// Official upgrades an emergency report once FIR is registered
router.patch('/:id/attach-fir', protect, authorize(...CAN_CREATE_VERIFIED_CASE), requireFaceGate, attachFir);

// Official status transitions — marking a case Found or Closed is as
// significant an assertion as verifying it in the first place, so
// this gets the same gate.
router.patch('/:id/status', protect, authorize(...OPERATIONAL_ROLES), requireFaceGate, updateStatus);

// Officer reviews/overrides the auto-suggested priority — deliberately
// NOT gated. This doesn't assert anything about a case's truth,
// existence, or resolution the way create/verify/status/edit do; it's
// routine triage, and requiring a live blink to bump Medium to High
// would be friction with no matching fraud benefit.
router.patch('/:id/priority', protect, authorize(...OPERATIONAL_ROLES), setPriority);

// Edit case details (versioned) and view/restore history. Editing
// identity-defining fields (age, appearance, last-seen location...)
// post-creation is exactly the kind of tampering face verification is
// meant to prevent, so both the edit and the restore-to-a-prior-
// version path are gated — restoring can reinstate fields (including
// courtRestricted) just as consequentially as an edit can change them.
router.patch('/:id', protect, authorize(...OPERATIONAL_ROLES), requireFaceGate, updateCase);
router.get('/:id/versions', protect, authorize(...OPERATIONAL_ROLES), listVersions);
router.post('/:id/versions/:versionId/restore', protect, authorize(...OPERATIONAL_ROLES), requireFaceGate, restoreVersion);

// NGO Admin assigns one of their own volunteers to a case they're
// involved in — not a Police Admin action, no face gate applies.
router.post('/:id/assign-volunteer', protect, authorize(ROLES.NGO_ADMIN), assignVolunteer);

// District Control reassigns a case between stations in their
// district — Police Admin cannot call this at all, so no face gate
// is relevant here either.
router.patch('/:id/reassign-station', protect, authorize(ROLES.DISTRICT_CONTROL, ROLES.STATE_CONTROL, ROLES.SUPER_ADMIN), reassignStation);

// Assigned volunteer (or the NGO Admin who assigned them) posts a field update
router.post('/:id/field-update', protect, authorize(ROLES.NGO_VOLUNTEER, ROLES.NGO_ADMIN), fieldUpdate);

// Family portal expansion — the reporting family, or an official with
// jurisdiction over the case, can add photos/documents/supplementary
// info. Not face-gated: these add material to a case, they don't
// assert a new verification/status/identity fact the way create,
// verify, status-change, or edit do.
router.post('/:id/photos', protect, addPhoto);
router.post('/:id/documents', protect, addDocument);
router.post('/:id/additional-info', protect, addAdditionalInfo);

module.exports = router;

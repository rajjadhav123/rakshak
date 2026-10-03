// Regression tests for canViewCase (utils/caseVisibility.js) and
// canAddToCase (controllers/caseController.js) — run with:
//   node utils/__tests__/caseVisibility.test.js
//
// This is the file the v16.1 fix was actually verified against before
// it was trusted (see the README's v16.1 entry) — saved here as a
// permanent regression guard instead of a one-time throwaway check,
// so the exact bug it catches (a Mongoose ref field arriving
// populated instead of raw at a comparison site) can't quietly
// reappear at a new call site without a test catching it.
//
// Plain Node, no test framework — this project has none, and the
// existing style throughout is plain assertion scripts; adding a
// framework just for this felt like more than what was asked for.
// Exits 1 on any failure, 0 if everything passes.
const mongoose = require('mongoose');
const { canViewCase, jurisdictionCaseFilter } = require('../caseVisibility');
const { canAddToCase } = require('../../controllers/caseController');
const { ROLES } = require('../../config/roles');

let failures = 0;
function check(label, condition) {
  const pass = !!condition;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}`);
  if (!pass) failures++;
}

// ---------- Fixtures ----------
const UserModel = mongoose.models.User || mongoose.model('User', new mongoose.Schema({ name: String }));
const StationModel = mongoose.models.Station || mongoose.model('Station', new mongoose.Schema({ name: String, district: String, state: String }));
const CaseModel = mongoose.models.Case || mongoose.model('Case', new mongoose.Schema({
  fullName: String, status: String, courtRestricted: Boolean,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  policeStationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Station' },
  jurisdiction: { state: String, district: String },
  involvedNgos: [{ ngoAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }],
  assignedVolunteers: [{ volunteer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }],
}));

const stationId = new mongoose.Types.ObjectId();
const otherStationId = new mongoose.Types.ObjectId();
const officerId = new mongoose.Types.ObjectId();
const reporterId = new mongoose.Types.ObjectId();
const ngoAdminId = new mongoose.Types.ObjectId();
const volunteerId = new mongoose.Types.ObjectId();

const policeAdmin = { _id: officerId, role: 'police_admin', jurisdiction: { policeStationId: stationId, district: 'Palghar', state: 'Maharashtra' } };
const reporter = { _id: reporterId, role: 'family', jurisdiction: {} };
const districtControl = { _id: new mongoose.Types.ObjectId(), role: 'district_control', jurisdiction: { district: 'Palghar', state: 'Maharashtra' } };
const stateControl = { _id: new mongoose.Types.ObjectId(), role: 'state_control', jurisdiction: { state: 'Maharashtra' } };
const superAdmin = { _id: new mongoose.Types.ObjectId(), role: 'super_admin', jurisdiction: {} };
const citizen = { _id: new mongoose.Types.ObjectId(), role: 'citizen', jurisdiction: {} };
const ngoAdmin = { _id: ngoAdminId, role: 'ngo_admin', jurisdiction: {} };
const volunteer = { _id: volunteerId, role: 'ngo_volunteer', jurisdiction: {}, ngo: { supervisorId: new mongoose.Types.ObjectId() } };

// Mirrors getCase's real .populate('policeStationId', 'name district state')
function makePopulatedCase(overrides = {}) {
  const c = new CaseModel({ fullName: 'Test', status: 'verified', jurisdiction: { district: 'Palghar', state: 'Maharashtra' }, ...overrides });
  const stationDoc = new StationModel({ _id: overrides.policeStationId || stationId, name: 'Vasai PS', district: 'Palghar', state: 'Maharashtra' });
  c.$set('policeStationId', stationDoc);
  c.populated('policeStationId', overrides.policeStationId || stationId);
  return c;
}
function makeUnpopulatedCase(overrides = {}) {
  return new CaseModel({ fullName: 'Test', status: 'verified', jurisdiction: { district: 'Palghar', state: 'Maharashtra' }, policeStationId: stationId, ...overrides });
}
function makeCaseCreatedBy(populated) {
  const c = new CaseModel({ fullName: 'Test', status: 'emergency_pending' });
  if (populated) {
    c.$set('createdBy', new UserModel({ _id: reporterId, name: 'Reporter' }));
    c.populated('createdBy', reporterId);
  } else {
    c.createdBy = reporterId;
  }
  return c;
}

// ---------- canViewCase: the actual bug this file exists to catch ----------
check('THE BUG: Police Admin views their OWN case, policeStationId POPULATED (getCase scenario)', canViewCase(policeAdmin, makePopulatedCase()) === true);
check('regression: Police Admin views their OWN case, policeStationId UNPOPULATED (listSightings scenario)', canViewCase(policeAdmin, makeUnpopulatedCase()) === true);
check('Police Admin views a DIFFERENT station\u2019s case, POPULATED -> correctly false', canViewCase(policeAdmin, makePopulatedCase({ policeStationId: otherStationId })) === false);
check('Police Admin views a DIFFERENT station\u2019s case, UNPOPULATED -> correctly false', canViewCase(policeAdmin, makeUnpopulatedCase({ policeStationId: otherStationId })) === false);
check('Police Admin views an unassigned case (no policeStationId) -> true regardless', canViewCase(policeAdmin, new CaseModel({ fullName: 'X', status: 'verified' })) === true);

// ---------- canViewCase: createdBy / verifiedBy (must stay correct — these were already right) ----------
check('reporter sees their own case, createdBy POPULATED', canViewCase(reporter, makeCaseCreatedBy(true)) === true);
check('reporter sees their own case, createdBy UNPOPULATED', canViewCase(reporter, makeCaseCreatedBy(false)) === true);

// ---------- canViewCase: district_control / state_control (plain string fields, never had populate risk) ----------
check('district_control sees a case in their own district', canViewCase(districtControl, makeUnpopulatedCase()) === true);
check('district_control does NOT see a case in a different district', canViewCase(districtControl, makeUnpopulatedCase({ jurisdiction: { district: 'Thane', state: 'Maharashtra' } })) === false);
check('state_control sees a case in their own state', canViewCase(stateControl, makeUnpopulatedCase()) === true);
check('state_control does NOT see a case in a different state', canViewCase(stateControl, makeUnpopulatedCase({ jurisdiction: { district: 'X', state: 'Gujarat' } })) === false);

// ---------- canViewCase: super_admin sees everything; public visibility rules for everyone else ----------
check('super_admin sees any case regardless of station/district/state', canViewCase(superAdmin, makePopulatedCase({ policeStationId: otherStationId })) === true);
check('citizen sees a verified, non-restricted case', canViewCase(citizen, makeUnpopulatedCase({ status: 'verified' })) === true);
check('citizen does NOT see an emergency_pending case', canViewCase(citizen, makeUnpopulatedCase({ status: 'emergency_pending' })) === false);
check('citizen does NOT see a courtRestricted verified case', canViewCase(citizen, makeUnpopulatedCase({ status: 'verified', courtRestricted: true })) === false);

// ---------- canViewCase: NGO/volunteer involvement, populated and unpopulated ----------
function ngoCase(populated) {
  const c = new CaseModel({ status: 'emergency_pending' });
  c.involvedNgos = [{ ngoAdmin: ngoAdminId }];
  c.assignedVolunteers = [{ volunteer: volunteerId }];
  if (populated) {
    c.involvedNgos[0].$set('ngoAdmin', new UserModel({ _id: ngoAdminId, name: 'Asha Trust' }));
    c.assignedVolunteers[0].$set('volunteer', new UserModel({ _id: volunteerId, name: 'A Volunteer' }));
  }
  return c;
}
const strangerNgoAdmin = { _id: new mongoose.Types.ObjectId(), role: 'ngo_admin', jurisdiction: {} };
check('NGO admin sees linked case, UNPOPULATED', canViewCase(ngoAdmin, ngoCase(false)) === true);
check('volunteer sees assigned case, UNPOPULATED', canViewCase(volunteer, ngoCase(false)) === true);
check('NGO admin sees linked case, POPULATED (getCase scenario)', canViewCase(ngoAdmin, ngoCase(true)) === true);
check('volunteer sees assigned case, POPULATED (getCase scenario)', canViewCase(volunteer, ngoCase(true)) === true);
check('unrelated NGO admin does NOT see the case, UNPOPULATED', canViewCase(strangerNgoAdmin, ngoCase(false)) === false);
check('unrelated NGO admin does NOT see the case, POPULATED', canViewCase(strangerNgoAdmin, ngoCase(true)) === false);

// ---------- canAddToCase: same bug class, flagged in the v16.1 follow-up audit and fixed alongside these tests ----------
check('reporter can add to their own case, createdBy POPULATED', canAddToCase(reporter, makeCaseCreatedBy(true)) === true);
check('reporter can add to their own case, createdBy UNPOPULATED', canAddToCase(reporter, makeCaseCreatedBy(false)) === true);
check('official whose jurisdiction covers the case can add to it', canAddToCase(policeAdmin, makeUnpopulatedCase()) === true);
check('official whose jurisdiction does NOT cover the case cannot add to it', canAddToCase(policeAdmin, makeUnpopulatedCase({ policeStationId: otherStationId })) === false);
check('an unrelated citizen cannot add to a case they didn\u2019t report', canAddToCase(citizen, makeUnpopulatedCase()) === false);

// ---------- jurisdictionCaseFilter: extracted from listCases for the pending-sightings queue, must match its original behavior exactly ----------
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
check('police_admin with a station -> scoped $or filter', eq(
  jurisdictionCaseFilter({ role: ROLES.POLICE_ADMIN, jurisdiction: { policeStationId: 'station1' } }),
  { $or: [{ policeStationId: 'station1' }, { policeStationId: { $exists: false } }, { policeStationId: null }] },
));
check('police_admin with no station -> {} (falls through, same as listCases always did)', eq(
  jurisdictionCaseFilter({ role: ROLES.POLICE_ADMIN, jurisdiction: {} }), {},
));
check('district_control with district+state -> scoped $or filter', eq(
  jurisdictionCaseFilter({ role: ROLES.DISTRICT_CONTROL, jurisdiction: { district: 'Palghar', state: 'Maharashtra' } }),
  { $or: [{ 'jurisdiction.district': 'Palghar', 'jurisdiction.state': 'Maharashtra' }, { 'jurisdiction.district': { $exists: false } }, { 'jurisdiction.district': null }] },
));
check('state_control with a state -> scoped $or filter', eq(
  jurisdictionCaseFilter({ role: ROLES.STATE_CONTROL, jurisdiction: { state: 'Maharashtra' } }),
  { $or: [{ 'jurisdiction.state': 'Maharashtra' }, { 'jurisdiction.state': { $exists: false } }, { 'jurisdiction.state': null }] },
));
check('super_admin -> {} (unrestricted, by design)', eq(jurisdictionCaseFilter({ role: ROLES.SUPER_ADMIN, jurisdiction: {} }), {}));
check('citizen (non-official) -> {} (never restricted by this function)', eq(jurisdictionCaseFilter({ role: ROLES.CITIZEN, jurisdiction: {} }), {}));
check('null user -> {} (no crash)', eq(jurisdictionCaseFilter(null), {}));
check('official with undefined jurisdiction -> {} (no crash)', eq(jurisdictionCaseFilter({ role: ROLES.POLICE_ADMIN }), {}));

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);

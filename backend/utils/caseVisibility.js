const { ROLES } = require('../config/roles');
const { idsEqual } = require('./ids');

const OFFICIAL_ROLES = [ROLES.POLICE_ADMIN, ROLES.DISTRICT_CONTROL, ROLES.STATE_CONTROL, ROLES.SUPER_ADMIN, ROLES.SYSTEM_ADMIN];
const PUBLIC_STATUSES = ['verified', 'under_search', 'found'];

// Mirrors the same rules caseController.listCases already builds into
// its query filter — re-checked here against ONE already-fetched
// case. This is what getCase (GET /cases/:id) and listSightings
// (GET /sightings?caseId=) were both missing: neither had ANY access
// check beyond "is this person logged in", so any authenticated
// account — Citizen, Family, any NGO — could view any case by ID,
// including an unverified Emergency Report (a family's home contact
// details) or a courtRestricted case, just by knowing or guessing the
// ID. Defining the rule once here is what keeps listCases' query
// filter and this per-case check from quietly drifting apart the way
// the old pending_verification/emergency_pending status split did.
//
// Every ID comparison below goes through idsEqual() (see utils/ids.js)
// rather than a direct String(a) === String(b) — a case fetched via
// .populate() (getCase does this for several of these exact fields,
// to show names instead of bare IDs) turns a ref field from a raw
// ObjectId into a full document, and a direct String() comparison
// silently, permanently fails for such a field regardless of whether
// the underlying IDs actually match. This bit policeStationId
// specifically (see the README for the full story) — every
// comparison here now goes through the one helper so that a future
// populate() added anywhere can't reintroduce the same failure at a
// new field without anyone noticing.
const canViewCase = (user, caseDoc) => {
  if (!user || !caseDoc) return false;

  // The reporter can always see their own report, at any status —
  // this is what makes "My Cases" -> case detail work for a Family
  // account whose report hasn't been verified yet.
  if (caseDoc.createdBy && idsEqual(caseDoc.createdBy, user._id)) return true;
  // Whoever verified it (attached the FIR) can always see it.
  if (caseDoc.verifiedBy && idsEqual(caseDoc.verifiedBy, user._id)) return true;

  if (OFFICIAL_ROLES.includes(user.role)) {
    if ([ROLES.SUPER_ADMIN, ROLES.SYSTEM_ADMIN].includes(user.role)) return true;
    if (user.role === ROLES.POLICE_ADMIN) {
      if (!caseDoc.policeStationId) return true; // unassigned — same "could plausibly claim it" rule as listCases
      return !!user.jurisdiction?.policeStationId && idsEqual(caseDoc.policeStationId, user.jurisdiction.policeStationId);
    }
    if (user.role === ROLES.DISTRICT_CONTROL) {
      if (!caseDoc.jurisdiction?.district) return true;
      return caseDoc.jurisdiction.district === user.jurisdiction?.district;
    }
    if (user.role === ROLES.STATE_CONTROL) {
      if (!caseDoc.jurisdiction?.state) return true;
      return caseDoc.jurisdiction.state === user.jurisdiction?.state;
    }
    return false;
  }

  // NGO roles linked to this specific case (assigned to work it, even
  // before it's otherwise public) can see it regardless of status.
  if ([ROLES.NGO_ADMIN, ROLES.NGO_VOLUNTEER].includes(user.role)) {
    const ngoAdminId = user.role === ROLES.NGO_ADMIN ? user._id : user.ngo?.supervisorId;
    const linkedViaNgo = ngoAdminId && (caseDoc.involvedNgos || []).some((link) => idsEqual(link.ngoAdmin, ngoAdminId));
    const linkedViaAssignment = (caseDoc.assignedVolunteers || []).some((a) => idsEqual(a.volunteer, user._id));
    if (linkedViaNgo || linkedViaAssignment) return true;
  }

  // Everyone else: the same public rule the list feed already uses —
  // verified-or-later status, not court-restricted. Deliberately NO
  // district restriction here — a direct link to a public case should
  // work regardless of where the viewer lives; the district default
  // in listCases is a browsing convenience, not a security boundary.
  return PUBLIC_STATUSES.includes(caseDoc.status) && !caseDoc.courtRestricted;
};

// Builds the same jurisdiction-based $or clause listCases uses to
// scope its own case list — extracted so any OTHER endpoint that
// needs "which cases does this official's jurisdiction cover" (e.g. a
// pending-sightings queue scoped the same way, added for the Police
// portal) uses the identical rule rather than a second copy that can
// drift from listCases' own, the same reasoning canViewCase exists
// for at the single-case level. Returns {} for a role/scope with no
// jurisdiction restriction (system_admin, super_admin, or an official
// with no jurisdiction set yet) — meaning "no filter, sees
// everything", not "matches nothing". Callers that need to layer in
// an explicit ?state=/&district= override or a scope=all bypass check
// that themselves before calling this, same as listCases already did.
const jurisdictionCaseFilter = (user) => {
  if (!user || !OFFICIAL_ROLES.includes(user.role)) return {};
  if (user.role === ROLES.POLICE_ADMIN && user.jurisdiction?.policeStationId) {
    return { $or: [
      { policeStationId: user.jurisdiction.policeStationId },
      { policeStationId: { $exists: false } },
      { policeStationId: null },
    ] };
  }
  if (user.role === ROLES.DISTRICT_CONTROL && (user.jurisdiction?.district || user.jurisdiction?.state)) {
    const mine = {};
    if (user.jurisdiction?.district) mine['jurisdiction.district'] = user.jurisdiction.district;
    if (user.jurisdiction?.state) mine['jurisdiction.state'] = user.jurisdiction.state;
    return { $or: [mine, { 'jurisdiction.district': { $exists: false } }, { 'jurisdiction.district': null }] };
  }
  if (user.role === ROLES.STATE_CONTROL && user.jurisdiction?.state) {
    return { $or: [
      { 'jurisdiction.state': user.jurisdiction.state },
      { 'jurisdiction.state': { $exists: false } },
      { 'jurisdiction.state': null },
    ] };
  }
  // system_admin / super_admin, or an official with no jurisdiction
  // set at all yet, fall through with no default scope — matches
  // listCases' own existing behavior exactly.
  return {};
};

module.exports = { canViewCase, jurisdictionCaseFilter, PUBLIC_STATUSES, OFFICIAL_ROLES };

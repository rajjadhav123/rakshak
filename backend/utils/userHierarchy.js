const { ROLES, ROLE_LEVEL } = require('../config/roles');

/**
 * "Manage Officials" had no jurisdiction or hierarchy check at all —
 * a District Control account could see and suspend every account on
 * the platform, including State Control and Super Admin. This file
 * is the actual rule, in one place, reused everywhere a user-
 * management action needs to check it — so listUsers' query filter
 * and approveUser/suspendUser's per-target check can't quietly drift
 * apart the way emergency_pending/pending_verification once did.
 *
 * The rule: Super Admin / System Admin manage everyone. State Control
 * manages District Control + Police Admin within their own state.
 * District Control manages only Police Admin within their own
 * district. Nobody manages a peer or a senior. NGO Admin is handled
 * separately (scoped to their own org via ngo.supervisorId) since it
 * isn't part of this jurisdiction chain at all.
 */

// Can `actor` manage a user with this role + jurisdiction?
const canManageJurisdiction = (actor, targetRole, targetJurisdiction) => {
  if ([ROLES.SUPER_ADMIN, ROLES.SYSTEM_ADMIN].includes(actor.role)) return true;

  const actorLevel = ROLE_LEVEL[actor.role] ?? 0;
  const targetLevel = ROLE_LEVEL[targetRole] ?? 0;
  if (targetLevel >= actorLevel) return false; // never a peer or senior

  if (actor.role === ROLES.STATE_CONTROL) {
    return [ROLES.DISTRICT_CONTROL, ROLES.POLICE_ADMIN].includes(targetRole)
      && targetJurisdiction?.state === actor.jurisdiction?.state;
  }
  if (actor.role === ROLES.DISTRICT_CONTROL) {
    return targetRole === ROLES.POLICE_ADMIN
      && targetJurisdiction?.district === actor.jurisdiction?.district
      && targetJurisdiction?.state === actor.jurisdiction?.state;
  }
  return false;
};

// The same rule expressed as a Mongo filter, for listUsers. NGO roles
// have no jurisdiction field to match against, so they're naturally
// excluded for State/District Control here — not a special case, just
// what the filter can't match. (NGO Admin's own listUsers branch stays
// separate, scoped to ngo.supervisorId instead.)
const manageableUsersFilter = (actor) => {
  if ([ROLES.SUPER_ADMIN, ROLES.SYSTEM_ADMIN].includes(actor.role)) return {};

  if (actor.role === ROLES.STATE_CONTROL) {
    return { role: { $in: [ROLES.DISTRICT_CONTROL, ROLES.POLICE_ADMIN] }, 'jurisdiction.state': actor.jurisdiction?.state };
  }
  if (actor.role === ROLES.DISTRICT_CONTROL) {
    return { role: ROLES.POLICE_ADMIN, 'jurisdiction.district': actor.jurisdiction?.district, 'jurisdiction.state': actor.jurisdiction?.state };
  }
  return { _id: null }; // matches nothing — route-level authorize should prevent reaching here anyway
};

module.exports = { canManageJurisdiction, manageableUsersFilter };

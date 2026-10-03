export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  SYSTEM_ADMIN: 'system_admin',
  STATE_CONTROL: 'state_control',
  DISTRICT_CONTROL: 'district_control',
  POLICE_ADMIN: 'police_admin',
  NGO_ADMIN: 'ngo_admin',
  NGO_VOLUNTEER: 'ngo_volunteer',
  FAMILY: 'family',
  CITIZEN: 'citizen',
};

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'National Rakshak Administrator',
  [ROLES.SYSTEM_ADMIN]: 'System Administrator',
  [ROLES.STATE_CONTROL]: 'State Control Room',
  [ROLES.DISTRICT_CONTROL]: 'District Control Room',
  [ROLES.POLICE_ADMIN]: 'Police Station Admin',
  [ROLES.NGO_ADMIN]: 'NGO Admin',
  [ROLES.NGO_VOLUNTEER]: 'NGO Volunteer',
  [ROLES.FAMILY]: 'Family',
  [ROLES.CITIZEN]: 'Citizen',
};

// Mirrors backend config/roles.js ROLE_LEVEL exactly — used to filter
// which roles a user-management form offers to create, so the
// dropdown doesn't show options the backend would reject anyway (e.g.
// a District Control account trying to create a State Control).
export const ROLE_LEVEL = {
  [ROLES.SUPER_ADMIN]: 100,
  [ROLES.SYSTEM_ADMIN]: 90,
  [ROLES.STATE_CONTROL]: 80,
  [ROLES.DISTRICT_CONTROL]: 70,
  [ROLES.POLICE_ADMIN]: 60,
  [ROLES.NGO_ADMIN]: 30,
  [ROLES.NGO_VOLUNTEER]: 20,
  [ROLES.FAMILY]: 10,
  [ROLES.CITIZEN]: 10,
};

export const OFFICIAL_ROLES = [
  ROLES.SUPER_ADMIN, ROLES.SYSTEM_ADMIN, ROLES.STATE_CONTROL, ROLES.DISTRICT_CONTROL, ROLES.POLICE_ADMIN,
];

// Roles that can view the operational stats dashboard (mirrors backend ADMIN_ROLES)
export const ADMIN_ROLES = OFFICIAL_ROLES;

// Case-verification / edit / status-change authority (mirrors backend OPERATIONAL_ROLES).
// Deliberately excludes System Admin — see CAN_MANAGE_USERS note below.
export const CAN_CREATE_CASE = [ROLES.POLICE_ADMIN, ROLES.DISTRICT_CONTROL, ROLES.STATE_CONTROL, ROLES.SUPER_ADMIN];
export const CAN_VERIFY = [ROLES.POLICE_ADMIN, ROLES.DISTRICT_CONTROL, ROLES.STATE_CONTROL, ROLES.SUPER_ADMIN];

// User management — NGO Admin included but scoped server-side to only
// their own volunteers (see backend/controllers/userController.js).
export const CAN_MANAGE_USERS = [ROLES.SUPER_ADMIN, ROLES.SYSTEM_ADMIN, ROLES.STATE_CONTROL, ROLES.DISTRICT_CONTROL, ROLES.NGO_ADMIN];

// Platform-management-only (audit log, cross-org user approval).
// System Admin's real job — not case verification.
export const PLATFORM_ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.SYSTEM_ADMIN, ROLES.STATE_CONTROL, ROLES.DISTRICT_CONTROL];

export const NGO_ROLES = [ROLES.NGO_ADMIN, ROLES.NGO_VOLUNTEER];

export const CAN_REASSIGN_STATION = [ROLES.DISTRICT_CONTROL, ROLES.STATE_CONTROL, ROLES.SUPER_ADMIN];

// Matches backend CAN_CLOSE_WITHOUT_FINDING — a Police Admin can mark a
// case Found and close it, but cannot unilaterally close a case that
// was never resolved. Only District Control and above can do that, and
// only with a mandatory reason (enforced server-side; this constant
// just lets the UI show/hide the option honestly rather than offering
// something the backend will reject).
export const CAN_CLOSE_WITHOUT_FINDING = [ROLES.DISTRICT_CONTROL, ROLES.STATE_CONTROL, ROLES.SUPER_ADMIN];

// "My Cases" is meaningful for reporters (their own submissions) and
// operational roles (cases they personally verified) — not for NGO
// roles (which have their own "Involved Cases"/"My Assignments") or
// System Admin (who never verifies cases at all).
export const MY_CASES_ROLES = [...CAN_VERIFY, ROLES.FAMILY, ROLES.CITIZEN];

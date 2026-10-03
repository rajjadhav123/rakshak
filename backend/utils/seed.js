/**
 * Seeds a 3-district structure — Pune, Palghar, Mumbai — each with
 * real-locality-named police stations, ONE Police Admin PER STATION
 * (not just per district — see the note below), a District Control
 * (DySP-equivalent), one NGO with 3 volunteers, one Family account,
 * and one Citizen account. Plus the shared national tier (Super
 * Admin, System Admin, State Control).
 *
 * Every account you'd already been testing with keeps the SAME
 * email — this only ADDS a Police Admin login for each district's
 * 2nd/3rd station (previously only the 1st/primary station had a
 * real login). Nothing you've bookmarked or scripted against breaks.
 *
 * WHY THIS CHANGED: findNearestStation() routes a case to the exact
 * nearest station, not just the nearest district — that's the whole
 * point of storing per-station coordinates. But with only one Police
 * Admin per district (tied to that district's 1st station), a case
 * routed to the district's 2nd or 3rd station had a real
 * policeStationId on it that matched NOBODY's jurisdiction.policeStationId
 * — so it never showed up in any Police Admin's case list, and the
 * "notify the station that owns this" query in createCase /
 * sightingController silently matched zero users. That's the exact
 * mechanism behind the Bandra repro below going silent. Seeding a
 * real admin per station is what makes exact-station routing actually
 * mean something end to end.
 *
 * Run with: npm run seed — full wipe every time, including cases,
 * so stale data from earlier schema versions can't accumulate.
 * Password for every account: Password@123
 */
require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const PoliceStation = require('../models/PoliceStation');
const Case = require('../models/Case');
const Sighting = require('../models/Sighting');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const CaseVersion = require('../models/CaseVersion');
const { ROLES } = require('../config/roles');

const PASSWORD = 'Password@123';
const PHONE = '9999999999';

const DISTRICTS = [
  {
    district: 'Pune', state: 'Maharashtra',
    stations: [
      // First station in each list is the "primary" — same account
      // email as before every earlier version, unchanged.
      { name: 'Deccan Gymkhana Police Station', coords: [73.8397, 18.5196], admin: { name: 'PSI Vikram Deshmukh', email: 'police_admin@rakshak.test' } },
      { name: 'Shivajinagar Police Station', coords: [73.8567, 18.5304], admin: { name: 'PSI Nikhil Kulkarni', email: 'police_admin_pune_shivajinagar@rakshak.test' } },
      { name: 'Kothrud Police Station', coords: [73.8077, 18.5074], admin: { name: 'PSI Swati Pawar', email: 'police_admin_pune_kothrud@rakshak.test' } },
    ],
    districtControl: { name: 'DySP Meera Joshi', email: 'district_control@rakshak.test' },
    ngo: {
      name: 'Sahyog Foundation', adminName: 'Pooja Kulkarni', adminEmail: 'ngo_admin_pune@rakshak.test',
      volunteers: [
        { name: 'Amit Bhosale', email: 'volunteer_pune1@rakshak.test' },
        { name: 'Sneha Gaikwad', email: 'volunteer_pune2@rakshak.test' },
        { name: 'Rahul Jadhav', email: 'volunteer_pune3@rakshak.test' },
      ],
    },
    family: { name: 'Family Member Asha', email: 'family@rakshak.test', testAccount: true },
    citizen: { name: 'Citizen Kumar', email: 'citizen@rakshak.test' },
  },
  {
    district: 'Palghar', state: 'Maharashtra',
    stations: [
      { name: 'Vasai Police Station', coords: [72.8397, 19.3919], admin: { name: 'PSI Sanjay Patil', email: 'police_admin_palghar@rakshak.test' } },
      { name: 'Nalasopara Police Station', coords: [72.8225, 19.4259], admin: { name: 'PSI Rajesh Chavan', email: 'police_admin_palghar_nalasopara@rakshak.test' } },
      { name: 'Palghar Town Police Station', coords: [72.7650, 19.6970], admin: { name: 'PSI Manisha Thakur', email: 'police_admin_palghar_town@rakshak.test' } },
    ],
    districtControl: { name: 'DySP Ramesh Pawar', email: 'district_control_palghar@rakshak.test' },
    ngo: {
      name: 'Asha Trust', adminName: 'Nitin More', adminEmail: 'ngo_admin_palghar@rakshak.test',
      volunteers: [
        { name: 'Priya Rane', email: 'volunteer_palghar1@rakshak.test' },
        { name: 'Deepak Vartak', email: 'volunteer_palghar2@rakshak.test' },
        { name: 'Kavita Mhatre', email: 'volunteer_palghar3@rakshak.test' },
      ],
    },
    family: { name: 'Family Member Palghar', email: 'family_palghar@rakshak.test' },
    citizen: { name: 'Citizen Palghar', email: 'citizen_palghar@rakshak.test' },
  },
  {
    district: 'Mumbai', state: 'Maharashtra',
    stations: [
      { name: 'Mahalaxmi Police Station', coords: [72.8256, 18.9827], admin: { name: 'PSI Anjali Kadam', email: 'police_admin_mumbai@rakshak.test' } },
      // Bandra is deliberately here — it's the station used in the
      // cross-jurisdiction demo below. Before this fix it had NO
      // logged-in admin at all.
      { name: 'Bandra Police Station', coords: [72.8295, 19.0596], admin: { name: 'PSI Imran Shaikh', email: 'police_admin_mumbai_bandra@rakshak.test' } },
      { name: 'Andheri Police Station', coords: [72.8468, 19.1197], admin: { name: 'PSI Snehal Rao', email: 'police_admin_mumbai_andheri@rakshak.test' } },
    ],
    districtControl: { name: 'DySP Suresh Rane', email: 'district_control_mumbai@rakshak.test' },
    ngo: {
      name: 'Hope Foundation', adminName: 'Hope Foundation Admin', adminEmail: 'ngo_admin@rakshak.test',
      volunteers: [
        { name: 'Volunteer Ravi', email: 'ngo_volunteer@rakshak.test' },
        { name: 'Neha Iyer', email: 'volunteer_mumbai2@rakshak.test' },
        { name: 'Arjun Nair', email: 'volunteer_mumbai3@rakshak.test' },
      ],
    },
    family: { name: 'Family Member Mumbai', email: 'family_mumbai@rakshak.test' },
    citizen: { name: 'Citizen Mumbai', email: 'citizen_mumbai@rakshak.test' },
  },
];

const run = async () => {
  // Guard: this script does a full wipe and recreates every account with
  // the SAME password documented in plain text in this file and the
  // README (Password@123) — including a Super Admin login. That's fine
  // against a local/dev database, but running it against a live,
  // publicly-reachable deployment would hand out admin access to anyone
  // who has read the README. Refuse by default whenever NODE_ENV is
  // 'production'; set ALLOW_SEED_IN_PRODUCTION=true if you genuinely
  // need to (re)seed a live demo deployment on purpose, and change the
  // seeded passwords again immediately afterward.
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED_IN_PRODUCTION !== 'true') {
    console.error('[Rakshak] Refusing to run: NODE_ENV=production and ALLOW_SEED_IN_PRODUCTION is not set.');
    console.error('[Rakshak] This would wipe your live database and recreate demo accounts with the');
    console.error('[Rakshak] publicly-documented password "Password@123" (including a Super Admin login).');
    console.error('[Rakshak] Set ALLOW_SEED_IN_PRODUCTION=true if this is really what you want.');
    process.exit(1);
  }

  await connectDB();

  await Promise.all([
    User.deleteMany({}), PoliceStation.deleteMany({}), Case.deleteMany({}),
    Sighting.deleteMany({}), Notification.deleteMany({}), AuditLog.deleteMany({}), CaseVersion.deleteMany({}),
  ]);

  await User.create({ name: 'National Admin', email: 'super_admin@rakshak.test', role: ROLES.SUPER_ADMIN, phone: PHONE, password: PASSWORD, status: 'active' });
  await User.create({ name: 'System Admin', email: 'system_admin@rakshak.test', role: ROLES.SYSTEM_ADMIN, phone: PHONE, password: PASSWORD, status: 'active' });
  await User.create({ name: 'Maharashtra State Control', email: 'state_control@rakshak.test', role: ROLES.STATE_CONTROL, jurisdiction: { state: 'Maharashtra' }, phone: PHONE, password: PASSWORD, status: 'active' });

  const summary = [];

  for (const d of DISTRICTS) {
    const stationDocs = [];
    for (const s of d.stations) {
      const doc = await PoliceStation.create({
        name: s.name, state: d.state, district: d.district,
        address: `${s.name}, ${d.district}, Maharashtra`, contactPhone: '022-0000000',
        geo: { type: 'Point', coordinates: s.coords },
      });
      stationDocs.push(doc);
    }
    const primaryStation = stationDocs[0]; // home-location anchor for Family/Citizen below

    // One Police Admin PER STATION — see file header for why.
    const stationAdminEmails = [];
    for (let i = 0; i < d.stations.length; i++) {
      await User.create({
        name: d.stations[i].admin.name, email: d.stations[i].admin.email, role: ROLES.POLICE_ADMIN,
        jurisdiction: { state: d.state, district: d.district, policeStationId: stationDocs[i]._id },
        phone: PHONE, password: PASSWORD, status: 'active',
      });
      stationAdminEmails.push(`${d.stations[i].admin.email} (${d.stations[i].name})`);
    }

    await User.create({
      name: d.districtControl.name, email: d.districtControl.email, role: ROLES.DISTRICT_CONTROL,
      jurisdiction: { state: d.state, district: d.district },
      phone: PHONE, password: PASSWORD, status: 'active',
    });

    const ngoAdmin = await User.create({
      name: d.ngo.adminName, email: d.ngo.adminEmail, role: ROLES.NGO_ADMIN,
      ngo: {
        organizationName: d.ngo.name, registrationId: `NGO-2024-${d.district.toUpperCase()}`,
        serviceArea: { geo: { type: 'Point', coordinates: primaryStation.geo.coordinates }, radiusKm: 30 },
      },
      phone: PHONE, password: PASSWORD, status: 'active',
    });
    for (const vol of d.ngo.volunteers) {
      await User.create({
        name: vol.name, email: vol.email, role: ROLES.NGO_VOLUNTEER,
        ngo: { organizationName: d.ngo.name, supervisorId: ngoAdmin._id },
        phone: PHONE, password: PASSWORD, status: 'active',
      });
    }

    // Family/Citizen home-located at the district's primary station
    // coordinates — same mechanism real registration uses (see
    // authController.register), so their own reports naturally
    // resolve to their own district via findNearestStation, and the
    // Dashboard's citizen-scoping (see caseController.listCases)
    // defaults to this same district.
    await User.create({
      name: d.family.name, email: d.family.email, role: ROLES.FAMILY,
      homeLocation: { geo: { type: 'Point', coordinates: primaryStation.geo.coordinates }, state: d.state, district: d.district },
      testAccount: !!d.family.testAccount,
      phone: PHONE, password: PASSWORD, status: 'active',
    });
    await User.create({
      name: d.citizen.name, email: d.citizen.email, role: ROLES.CITIZEN,
      homeLocation: { geo: { type: 'Point', coordinates: primaryStation.geo.coordinates }, state: d.state, district: d.district },
      phone: PHONE, password: PASSWORD, status: 'active',
    });

    summary.push({
      district: d.district,
      stations: stationDocs.map((s) => s.name),
      policeAdmins: stationAdminEmails,
      districtControl: d.districtControl.email,
      ngoAdmin: d.ngo.adminEmail,
      volunteers: d.ngo.volunteers.map((v) => v.email),
      family: d.family.email,
      citizen: d.citizen.email,
    });
  }

  console.log('--------------------------------------------------');
  console.log('[Rakshak] Seed complete — 3 districts, one Police Admin per station.');
  console.log(`Password for every account: ${PASSWORD}`);
  console.log('--------------------------------------------------');
  console.log('National tier: super_admin@rakshak.test · system_admin@rakshak.test · state_control@rakshak.test');
  console.log('--------------------------------------------------');
  summary.forEach((s) => {
    console.log(`${s.district.toUpperCase()}`);
    console.log(`  Police Admins:`);
    s.policeAdmins.forEach((p) => console.log(`    - ${p}`));
    console.log(`  District Control: ${s.districtControl}`);
    console.log(`  NGO Admin:        ${s.ngoAdmin}`);
    console.log(`  Volunteers:       ${s.volunteers.join(', ')}`);
    console.log(`  Family:           ${s.family}${s.family === 'family@rakshak.test' ? ' (rate-limit exempt for testing)' : ''}`);
    console.log(`  Citizen:          ${s.citizen}`);
    console.log('--------------------------------------------------');
  });
  console.log('Cross-jurisdiction demo: register a case as police_admin@rakshak.test (Pune)');
  console.log('with coordinates near Bandra (19.0596, 72.8295) and watch it route to Mumbai,');
  console.log('now correctly notifying police_admin_mumbai_bandra@rakshak.test — the officer');
  console.log('actually assigned to Bandra, not just "some Mumbai admin".');
  console.log('--------------------------------------------------');
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

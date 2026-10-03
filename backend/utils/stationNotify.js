const User = require('../models/User');
const { ROLES } = require('../config/roles');
const { notifyMany } = require('./notify');

/**
 * Notifies whoever's actually responsible for a station: the station's
 * own Police Admin(s) if any are assigned, or the district's District
 * Control as a fallback if that specific station doesn't have one.
 *
 * v8 fixed the demo data so every seeded station has a real Police
 * Admin — but that's a seed-data fix, not a structural guarantee.
 * Nothing stops a station from legitimately having no assigned officer
 * yet in a real rollout (new station, officer reassigned, account not
 * provisioned yet), and without this, a case routed there via
 * findNearestStation is still geographically correct but notifies
 * nobody. This is the actual structural fix: escalate up the chain of
 * command instead of failing silently, the same principle the
 * DySP/PSI messaging hierarchy already follows.
 */
const notifyStationOrDistrictFallback = async ({ station, message, caseId }) => {
  const stationAdmins = await User.find({
    role: ROLES.POLICE_ADMIN,
    'jurisdiction.policeStationId': station._id,
    status: 'active',
  });

  if (stationAdmins.length > 0) {
    await notifyMany(stationAdmins.map((a) => a._id), { type: 'nearby_alert', message, caseId });
    return { notifiedTier: 'station', count: stationAdmins.length };
  }

  const districtControls = await User.find({
    role: ROLES.DISTRICT_CONTROL,
    'jurisdiction.state': station.state,
    'jurisdiction.district': station.district,
    status: 'active',
  });

  if (districtControls.length > 0) {
    await notifyMany(districtControls.map((d) => d._id), {
      type: 'nearby_alert',
      message: `${message} (${station.name} has no Police Admin assigned yet — routed to District Control.)`,
      caseId,
    });
    return { notifiedTier: 'district_control', count: districtControls.length };
  }

  return { notifiedTier: 'none', count: 0 };
};

module.exports = { notifyStationOrDistrictFallback };

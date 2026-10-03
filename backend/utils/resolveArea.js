const { ROLES } = require('../config/roles');
const { findNearestStation } = require('./findNearestStation');
const User = require('../models/User');
const PoliceStation = require('../models/PoliceStation');

// Resolves "what area is this account associated with" for ANY role,
// uniformly — this was previously answered differently (or not at
// all) depending on role: Citizen/Family had homeLocation, officials
// had jurisdiction, and NGO accounts had neither (only a geo service
// area, never resolved to a district) — which is exactly why an NGO's
// case list had no default scope to fall back on and just showed
// everything nationwide, unlike every other role.
//
// Returns { label, district, state } — label is a short, human string
// for display; district/state (when resolvable) are the real values
// used elsewhere for jurisdiction filtering, so the SAME resolution
// backs both the header display and default list scoping.
const resolveUserArea = async (user) => {
  if (!user) return { label: null, district: null, state: null };

  switch (user.role) {
    case ROLES.CITIZEN:
    case ROLES.FAMILY: {
      const district = user.homeLocation?.district;
      const state = user.homeLocation?.state;
      const locality = user.homeLocation?.locality;
      const label = district
        ? (locality && locality.toLowerCase() !== district.toLowerCase() ? `${locality}, ${district}` : district) + `, ${state || 'Maharashtra'}`
        : 'No home area set';
      return { label, district, state, locality };
    }

    case ROLES.POLICE_ADMIN: {
      const district = user.jurisdiction?.district;
      const state = user.jurisdiction?.state;
      let stationName = null;
      if (user.jurisdiction?.policeStationId) {
        const station = await PoliceStation.findById(user.jurisdiction.policeStationId).select('name');
        stationName = station?.name;
      }
      return { label: [stationName, district].filter(Boolean).join(', ') || 'No station assigned', district, state };
    }

    case ROLES.DISTRICT_CONTROL:
      return { label: user.jurisdiction?.district ? `${user.jurisdiction.district} District` : 'No district assigned', district: user.jurisdiction?.district, state: user.jurisdiction?.state };

    case ROLES.STATE_CONTROL:
      return { label: user.jurisdiction?.state ? `${user.jurisdiction.state} (statewide)` : 'No state assigned', district: null, state: user.jurisdiction?.state };

    case ROLES.NGO_ADMIN: {
      const coords = user.ngo?.serviceArea?.geo?.coordinates;
      if (!coords || coords.length !== 2) return { label: 'No service area set', district: null, state: null };
      // coords are stored as [lng, lat] (GeoJSON) — findNearestStation
      // takes (lat, lng), so this is deliberately reversed here.
      const nearest = await findNearestStation(coords[1], coords[0]);
      const radiusKm = user.ngo?.serviceArea?.radiusKm ?? 25;
      return {
        label: nearest ? `${nearest.district} area (${radiusKm}km around ${nearest.name})` : 'Service area not near any known station',
        district: nearest?.district || null,
        state: nearest?.state || null,
      };
    }

    case ROLES.NGO_VOLUNTEER: {
      if (!user.ngo?.supervisorId) return { label: 'No organization assigned', district: null, state: null };
      const supervisor = await User.findById(user.ngo.supervisorId).select('ngo');
      return resolveUserArea({ role: ROLES.NGO_ADMIN, ngo: supervisor?.ngo });
    }

    case ROLES.SUPER_ADMIN:
    case ROLES.SYSTEM_ADMIN:
      return { label: 'All India (platform-wide)', district: null, state: null };

    default:
      return { label: null, district: null, state: null };
  }
};

module.exports = { resolveUserArea };

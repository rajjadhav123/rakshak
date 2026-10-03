const User = require('../models/User');
const { ROLES } = require('../config/roles');
const { notifyUser, notifyMany } = require('./notify');
const { distanceKm } = require('./geo');

/**
 * Finds NGO Admins whose service area covers the given location, and
 * links their org to the case if not already linked. Notifies the NGO
 * Admin and their volunteers either way.
 *
 * Used from two trigger points:
 *  - Sighting creation (sightingController) — an NGO gets pulled in
 *    reactively when a sighting lands in their territory.
 *  - Case verification (caseController.attachFir / createCase) — an
 *    NGO gets pulled in proactively the moment a case goes live near
 *    them, before any sighting has even happened. This is what makes
 *    the "alert NGOs/volunteers as soon as police verify a case" flow
 *    work, not just the reactive sighting path.
 *
 * `linkedVia` and the notification wording differ by trigger so the
 * timeline/notification honestly reflects why the NGO was involved.
 */
const involveNearbyNgos = async (caseDoc, geo, { linkedVia = 'sighting_proximity', triggerLabel = 'a nearby sighting' } = {}) => {
  const ngoAdmins = await User.find({
    role: ROLES.NGO_ADMIN,
    status: 'active',
    'ngo.serviceArea.geo.coordinates': { $exists: true, $ne: [] },
  });

  const [lng, lat] = geo.coordinates;
  const nearby = ngoAdmins.filter((ngo) => {
    const [nLng, nLat] = ngo.ngo.serviceArea.geo.coordinates;
    const radius = ngo.ngo.serviceArea.radiusKm || 25;
    return distanceKm([lng, lat], [nLng, nLat]) <= radius;
  });

  const newlyInvolved = [];
  for (const ngoAdmin of nearby) {
    const alreadyLinked = caseDoc.involvedNgos.some((n) => String(n.ngoAdmin) === String(ngoAdmin._id));
    if (alreadyLinked) continue;

    caseDoc.involvedNgos.push({
      ngoAdmin: ngoAdmin._id,
      organizationName: ngoAdmin.ngo?.organizationName || ngoAdmin.name,
      linkedVia,
    });
    newlyInvolved.push(ngoAdmin);
  }

  if (newlyInvolved.length > 0) {
    caseDoc.timeline.push({
      label: 'NGO(s) Involved',
      note: `${newlyInvolved.map((n) => n.ngo?.organizationName || n.name).join(', ')} — linked via ${triggerLabel}`,
    });

    for (const ngoAdmin of newlyInvolved) {
      await notifyUser({
        userId: ngoAdmin._id,
        type: 'nearby_alert',
        message: `A case near your service area (${caseDoc.fullName}) is now live — your organization has been linked to assist.`,
        caseId: caseDoc._id,
      });

      const volunteers = await User.find({ role: ROLES.NGO_VOLUNTEER, 'ngo.supervisorId': ngoAdmin._id, status: 'active' });
      if (volunteers.length > 0) {
        await notifyMany(volunteers.map((v) => v._id), {
          type: 'nearby_alert',
          message: `Your NGO has been linked to a nearby case: ${caseDoc.fullName}. Check with your NGO Admin for assignment.`,
          caseId: caseDoc._id,
        });
      }
    }
  }

  return newlyInvolved;
};

module.exports = { involveNearbyNgos };

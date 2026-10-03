const PoliceStation = require('../models/PoliceStation');

/**
 * Finds the police station geographically nearest the given point.
 * This is the piece that was missing from case CREATION — cases were
 * always tagged with the creating officer's own station, regardless of
 * where the incident actually happened. A case entered by a Pune
 * officer with Mumbai coordinates stayed tagged as Pune's, so it never
 * showed up for Mumbai — even though geographically it's Mumbai's
 * case. Real FIR jurisdiction follows location, not who happened to
 * type it into the system, and this makes the app match that.
 */
const findNearestStation = async (lat, lng, maxDistanceKm = 100) => {
  if (!lat || !lng) return null;
  const stations = await PoliceStation.find({
    geo: {
      $near: {
        $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
        $maxDistance: maxDistanceKm * 1000,
      },
    },
  }).limit(1);
  return stations[0] || null;
};

module.exports = { findNearestStation };

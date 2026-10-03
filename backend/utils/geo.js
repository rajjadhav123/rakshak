// Great-circle distance in km between two [lng, lat] points.
// Used for NGO proximity matching where each NGO has its own service
// radius — a plain $near query can't vary the max distance per
// document, so we fetch candidate NGOs and filter in application code.
const distanceKm = ([lng1, lat1], [lng2, lat2]) => {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
};

module.exports = { distanceKm };

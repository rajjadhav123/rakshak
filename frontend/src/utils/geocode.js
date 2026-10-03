import api from '../api/client';

// Resolves lat/lng to a short human-readable label via the backend's
// reverse-geocode proxy (see backend/controllers/geoController.js).
// Returns null on failure — callers should treat the label as a
// helpful confirmation, never block on it.
export async function reverseGeocode(lat, lng) {
  if (!lat || !lng) return null;
  try {
    const { data } = await api.get('/geo/reverse', { params: { lat, lng } });
    return data.success ? { label: data.label, district: data.district } : null;
  } catch {
    return null;
  }
}

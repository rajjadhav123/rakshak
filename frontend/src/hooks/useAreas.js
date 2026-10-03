import { useEffect, useState } from 'react';
import api from '../api/client';
import { MAHARASHTRA_AREAS_STATIC } from '../data/maharashtraAreas.js';

// Merges GET /api/public/locations (derived live from actual seeded
// PoliceStation records — always in sync, but only covers places that
// have a station) with the curated static list (covers real localities
// that don't, like Virar or Boisar) — de-duplicated by name so a
// station and a static entry for the same place don't double up.
// Cached at module level so the fetch only happens once per page load
// no matter how many components use this.
let cachedMerged = null;
let fetchPromise = null;

function mergeAreas(dbDistricts) {
  const merged = {};
  for (const [district, areas] of Object.entries(MAHARASHTRA_AREAS_STATIC)) {
    merged[district] = [...areas];
  }
  for (const d of dbDistricts) {
    if (!merged[d.district]) merged[d.district] = [];
    const existingNames = new Set(merged[d.district].map((a) => a.name.toLowerCase()));
    for (const loc of d.localities) {
      if (!existingNames.has(loc.name.toLowerCase())) {
        merged[d.district].push({ name: loc.name, lat: loc.lat, lng: loc.lng });
        existingNames.add(loc.name.toLowerCase());
      }
    }
  }
  return merged;
}

// Returns { areas, districts } — starts from the static list
// immediately (no loading flicker) and upgrades to the merged version
// once the live fetch resolves. Falls back to static-only if the
// request fails (e.g. offline) rather than showing an empty picker.
export function useAreas() {
  const [areas, setAreas] = useState(cachedMerged || MAHARASHTRA_AREAS_STATIC);

  useEffect(() => {
    if (cachedMerged) { setAreas(cachedMerged); return; }
    if (!fetchPromise) {
      fetchPromise = api.get('/public/locations')
        .then(({ data }) => { cachedMerged = mergeAreas(data.districts); return cachedMerged; })
        .catch(() => MAHARASHTRA_AREAS_STATIC);
    }
    let cancelled = false;
    fetchPromise.then((result) => { if (!cancelled) setAreas(result); });
    return () => { cancelled = true; };
  }, []);

  return { areas, districts: Object.keys(areas) };
}

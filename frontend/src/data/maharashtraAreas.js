// District -> City/Taluka reference data, scoped to the 3 districts
// this demo actually seeds data for (Pune, Palghar, Mumbai).
// Coordinates are approximate locality-center points (general
// geographic knowledge), good enough to pre-fill a location and let
// someone confirm/adjust it — NOT surveyed jurisdiction boundaries.
// Extending this to the rest of Maharashtra's districts/talukas would
// need a real source (e.g. a state gazetteer or data.gov.in dataset)
// rather than more hand-typed entries like these.
//
// This is the CURATED SUPPLEMENT, not the primary source — it exists
// because not every real locality has its own seeded police station
// (Virar, Boisar, Dahanu, etc. are real places without a station in
// this demo's data). The primary, always-in-sync source is
// GET /api/public/locations (derived live from actual PoliceStation
// records) — see hooks/useAreas.js, which merges the two so neither
// has to be the only source of truth.
export const MAHARASHTRA_AREAS_STATIC = {
  Palghar: [
    { name: 'Vasai', lat: 19.3919, lng: 72.8397 },
    { name: 'Virar', lat: 19.4559, lng: 72.8107 },
    { name: 'Nalasopara', lat: 19.4259, lng: 72.8225 },
    { name: 'Palghar Town', lat: 19.6970, lng: 72.7650 },
    { name: 'Boisar', lat: 19.8046, lng: 72.7597 },
    { name: 'Dahanu', lat: 19.9701, lng: 72.7424 },
    { name: 'Talasari', lat: 19.9333, lng: 72.7167 },
    { name: 'Jawhar', lat: 19.9067, lng: 73.2306 },
    { name: 'Mokhada', lat: 19.7981, lng: 73.1975 },
    { name: 'Wada', lat: 19.5992, lng: 73.1264 },
    { name: 'Vikramgad', lat: 19.7108, lng: 73.0453 },
  ],
  Mumbai: [
    { name: 'Bandra', lat: 19.0596, lng: 72.8295 },
    { name: 'Andheri', lat: 19.1197, lng: 72.8468 },
    { name: 'Mahalaxmi', lat: 18.9827, lng: 72.8256 },
    { name: 'Dadar', lat: 19.0178, lng: 72.8478 },
    { name: 'Borivali', lat: 19.2307, lng: 72.8567 },
    { name: 'Malad', lat: 19.1874, lng: 72.8484 },
    { name: 'Kurla', lat: 19.0728, lng: 72.8826 },
    { name: 'Ghatkopar', lat: 19.0863, lng: 72.9081 },
    { name: 'Colaba', lat: 18.9067, lng: 72.8147 },
    { name: 'Chembur', lat: 19.0522, lng: 72.9005 },
  ],
  Pune: [
    { name: 'Pune City', lat: 18.5196, lng: 73.8397 },
    { name: 'Shivajinagar', lat: 18.5304, lng: 73.8567 },
    { name: 'Kothrud', lat: 18.5074, lng: 73.8077 },
    { name: 'Hadapsar', lat: 18.5089, lng: 73.9260 },
    { name: 'Baner', lat: 18.5590, lng: 73.7868 },
    { name: 'Hinjewadi', lat: 18.5908, lng: 73.7392 },
    { name: 'Pimpri-Chinchwad', lat: 18.6298, lng: 73.7997 },
    { name: 'Camp', lat: 18.5122, lng: 73.8792 },
    { name: 'Viman Nagar', lat: 18.5679, lng: 73.9143 },
  ],
};

export const DISTRICTS_STATIC = Object.keys(MAHARASHTRA_AREAS_STATIC);

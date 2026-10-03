const { distanceKm } = require('./geo');

// Flags a new case as a possible duplicate of an existing ACTIVE case
// before it's created — using name similarity + age closeness +
// location proximity + how close the two "last seen" dates are, the
// same shape of signal an officer would eyeball manually, just run
// automatically against every open case instead of relying on
// someone remembering. This is a heads-up, never a block: whoever's
// filing always gets to say "no, this is genuinely a different
// case" and continue (see checkDuplicates in caseController.js).
//
// Hand-rolled rather than a fuzzy-match/NLP dependency: the candidate
// pool for a district-scale deployment is at most a few hundred open
// cases, so an in-memory pass per submission is cheap, and
// Levenshtein-based name similarity is short enough to not need a
// library — consistent with how liveness detection elsewhere in this
// project is "pure math, no ML."

// Case-insensitive, whitespace-collapsed Levenshtein edit distance,
// normalized to a 0..1 similarity (1 = identical). Chosen over a
// token/word-overlap approach specifically because names in this app
// often come from OCR (see OcrFirUpload) — edit distance tolerates
// the kind of single-character misreads OCR produces ("Rahul" vs
// "Rahu1") much better than exact word matching would.
const nameSimilarity = (a, b) => {
  const s1 = (a || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const s2 = (b || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;

  const m = s1.length;
  const n = s2.length;
  // Two-row rolling DP — O(m*n) time, O(n) space. Names are a
  // handful of words at most, so this is trivial either way.
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      curr[j] = s1[i - 1] === s2[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
    }
    prev = curr;
  }
  return 1 - prev[n] / Math.max(m, n);
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Every threshold below is a judgment call, not a derived constant —
// documented here (and in the README) so it's an explicit, arguable
// design decision rather than a mystery number:
// - 0.72 name similarity ≈ tolerates one OCR-style typo in a
//   6-8 letter name without matching on genuinely different names.
// - 3 years of age slop covers "the family guessed" and birthdays
//   crossed between the two reports.
// - 25km covers a person having moved within the same city/taluka
//   between the two "last seen" sightings.
// - 45 days keeps this to "plausibly the same ongoing disappearance,"
//   not a coincidental repeat months apart (which is more likely a
//   real second event, not a duplicate report of the first).
const THRESHOLDS = {
  minNameSimilarity: 0.72,
  maxAgeDiffYears: 3,
  maxDistanceKm: 25,
  maxDaysApart: 45,
};

// draft: { fullName, age, lastSeenAt, geo: [lng, lat] } — the case
// being submitted, not yet created.
// candidate: an existing Case document (or lean object) with the
// same-shaped fields.
// Returns null if the candidate misses any threshold, otherwise
// { score (0..1), reasons } describing why it matched.
const scoreCandidate = (draft, candidate) => {
  const nameSim = nameSimilarity(draft.fullName, candidate.fullName);
  if (nameSim < THRESHOLDS.minNameSimilarity) return null;

  const draftAge = draft.age != null ? Number(draft.age) : null;
  const ageDiff = (draftAge != null && candidate.age != null && !Number.isNaN(draftAge))
    ? Math.abs(draftAge - candidate.age) : null;
  if (ageDiff !== null && ageDiff > THRESHOLDS.maxAgeDiffYears) return null;

  let distKm = null;
  if (Array.isArray(draft.geo) && candidate.lastSeenLocation?.geo?.coordinates) {
    distKm = distanceKm(draft.geo, candidate.lastSeenLocation.geo.coordinates);
    if (distKm > THRESHOLDS.maxDistanceKm) return null;
  }

  let daysApart = null;
  if (draft.lastSeenAt && candidate.lastSeenAt) {
    daysApart = Math.abs(new Date(draft.lastSeenAt) - new Date(candidate.lastSeenAt)) / DAY_MS;
    if (Number.isNaN(daysApart)) daysApart = null;
    else if (daysApart > THRESHOLDS.maxDaysApart) return null;
  }

  const score = (
    nameSim * 0.55
    + (ageDiff === null ? 0.15 : (1 - ageDiff / THRESHOLDS.maxAgeDiffYears) * 0.15)
    + (distKm === null ? 0.15 : (1 - distKm / THRESHOLDS.maxDistanceKm) * 0.15)
    + (daysApart === null ? 0.15 : (1 - daysApart / THRESHOLDS.maxDaysApart) * 0.15)
  );

  const reasons = [nameSim >= 0.95 ? 'Same name' : 'Similar name'];
  if (ageDiff !== null) reasons.push(ageDiff === 0 ? 'Same age' : `Age within ${ageDiff} yr${ageDiff === 1 ? '' : 's'}`);
  if (distKm !== null) reasons.push(distKm < 1 ? 'Same last-seen area' : `Last seen ~${distKm.toFixed(1)}km away`);
  if (daysApart !== null) reasons.push(daysApart < 1 ? 'Same last-seen date' : `Last seen ${Math.round(daysApart)} day${Math.round(daysApart) === 1 ? '' : 's'} apart`);

  return { score: Math.min(1, score), reasons };
};

// Returns up to `limit` candidates, ranked by score descending.
const findPossibleDuplicates = (draft, candidates, { limit = 3 } = {}) => {
  const matches = [];
  for (const candidate of candidates) {
    const result = scoreCandidate(draft, candidate);
    if (result) matches.push({ candidate, score: result.score, reasons: result.reasons });
  }
  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, limit);
};

module.exports = { findPossibleDuplicates, nameSimilarity };

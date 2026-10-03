// Deliberately has NO machine-learning dependency at all — the neural
// network (face-api.js) only ever runs in the browser, where model
// downloads and GPU/WASM acceleration are well-supported. All the
// server needs is plain array math: how far apart are two 128-d
// descriptor vectors. That keeps the backend free of native
// TensorFlow bindings (a real source of fragile, platform-specific
// install failures) while still making the SERVER the one deciding
// match/no-match — not a client-asserted boolean, which anyone with
// the stolen credentials this feature defends against could just
// fabricate directly against the API.

// Standard threshold for face-api.js's 128-d FaceRecognitionNet
// descriptors: below ~0.6 is the widely-used "same person" cutoff.
// 0.5 is used here — stricter, fewer false accepts — since this
// gates a law-enforcement action, not a casual convenience login.
const MATCH_THRESHOLD = 0.5;

const isValidDescriptor = (d) => Array.isArray(d) && d.length === 128 && d.every((n) => typeof n === 'number' && Number.isFinite(n));

const euclideanDistance = (a, b) => Math.sqrt(a.reduce((sum, val, i) => sum + (val - b[i]) ** 2, 0));

// Compares one live descriptor against a set of enrolled reference
// descriptors (one per captured angle) and returns the closest match.
// Nearest-of-N is standard practice for multi-shot enrollment — a
// live capture only has to resemble the CLOSEST enrolled angle, not
// all three or their average.
const matchDescriptor = (liveDescriptor, enrolledDescriptors) => {
  if (!isValidDescriptor(liveDescriptor)) return { match: false, distance: null, reason: 'Malformed descriptor' };
  if (!Array.isArray(enrolledDescriptors) || enrolledDescriptors.length === 0) {
    return { match: false, distance: null, reason: 'No enrolled face on file' };
  }
  const distances = enrolledDescriptors.filter(isValidDescriptor).map((d) => euclideanDistance(liveDescriptor, d));
  if (distances.length === 0) return { match: false, distance: null, reason: 'No enrolled face on file' };
  const best = Math.min(...distances);
  return { match: best < MATCH_THRESHOLD, distance: best };
};

module.exports = { matchDescriptor, isValidDescriptor, MATCH_THRESHOLD, euclideanDistance, framePairDistance };

// Distance between the two "open"/centered frames of a blink or
// head-turn capture (frames[0] and frames[2] — seconds apart, not the
// same instant). A genuine live person, even holding still, has some
// natural micro-movement, blinking, subtle lighting change — a
// rigidly mounted static photo has essentially none, so its two
// "captures" land almost exactly on top of each other in descriptor
// space. This is intentionally OBSERVATIONAL ONLY, not enforced: there
// is no real captured-attack data here to calibrate a "this is
// definitely a photo" cutoff against, and getting that cutoff wrong
// in the blocking direction would reject genuine officers who
// followed the on-screen instruction to hold still — exactly the
// false-positive problem this whole feature has already been fighting.
// Logged on every blink/head_turn verification (see faceController.js)
// so District Control has the number available if they're reviewing
// an account for other reasons, without it being able to lock anyone
// out on its own. Does not apply to photo_match, which only ever
// captures one frame — no second point to compare against.
function framePairDistance(frameA, frameB) {
  if (!isValidDescriptor(frameA?.descriptor) || !isValidDescriptor(frameB?.descriptor)) return null;
  return euclideanDistance(frameA.descriptor, frameB.descriptor);
}

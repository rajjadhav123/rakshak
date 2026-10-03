// Real liveness signal against the exact attack you're worried about
// (holding up a photo of the officer): a blink. A static image can't
// produce an eyes-open -> eyes-closed -> eyes-open sequence, so
// requiring one closes that specific gap — it does NOT defend against
// a video replay of the real officer blinking, which is a fundamentally
// different, much harder problem (see README "what this does and
// doesn't defend against").
//
// Eye Aspect Ratio (Soukupova & Cech, 2016): for 6 points around one
// eye — [outerCorner, upperLid1, upperLid2, innerCorner, lowerLid2,
// lowerLid1], the standard order face-api.js's getLeftEye()/
// getRightEye() return — EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|).
//
// v1 of this used FIXED absolute thresholds (open > 0.24, closed <
// 0.19) — in practice this meant the check often needed 10-20 blink
// attempts before it registered, because a fixed cutoff doesn't
// account for individual eye shape, camera distance/angle, or
// lighting: plenty of genuinely-open eyes read well under 0.24 for
// some people/cameras, so the "confirm 2 consecutive open frames"
// step could fail for reasons that had nothing to do with blinking.
//
// This version uses a RELATIVE drop instead: does EAR fall to a
// clearly lower value than THIS SPECIFIC set of open-eye readings, in
// THIS SPECIFIC frame set? That adapts automatically to whoever's in
// front of the camera rather than assuming a universal "0.24 means
// open" rule that doesn't actually hold for everyone.
//
// CRITICAL: the client sends raw (x,y) landmark coordinates for each
// frame, not a pre-computed EAR number or a bare "blinked: true" flag
// — this function recomputes EAR independently server-side, the same
// principle as utils/faceMatch.js not trusting a client-asserted
// match. A client could still fabricate coordinates, but doing so
// requires producing three anatomically plausible 12-point eye
// geometries that trace a genuine open->closed->open transition AND
// (separately) a descriptor that passes matchDescriptor against the
// real enrolled face — a materially higher bar than sending one
// boolean.

const RELATIVE_DROP_RATIO = 0.72; // the closed frame must fall to <=72% of the open baseline
const MIN_PLAUSIBLE_OPEN_EAR = 0.14; // sanity floor — below this, eyes were never plausibly open at all

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const isValidEyePoints = (pts) => Array.isArray(pts) && pts.length === 6
  && pts.every((p) => p && typeof p.x === 'number' && typeof p.y === 'number' && Number.isFinite(p.x) && Number.isFinite(p.y));

const earForEye = (p) => (dist(p[1], p[5]) + dist(p[2], p[4])) / (2 * dist(p[0], p[3]));

// Average EAR across both eyes for one frame. Returns null for a
// malformed/missing frame rather than throwing — callers treat null
// as "this frame doesn't count," never as a passing value.
const frameEAR = (frame) => {
  if (!frame || !isValidEyePoints(frame.leftEye) || !isValidEyePoints(frame.rightEye)) return null;
  return (earForEye(frame.leftEye) + earForEye(frame.rightEye)) / 2;
};

// frames: [openFrame1, closedFrame, openFrame2] — exactly 3, in that
// order, as produced by the capture logic (see FaceLivenessCapture.jsx).
// Confirms a genuine open->closed->open pattern using a RELATIVE drop
// from this specific session's own open baseline, not a fixed
// universal cutoff; returns which open frame is the better candidate
// for identity matching (whichever read higher, i.e. more clearly open).
const verifyBlinkPattern = (frames) => {
  if (!Array.isArray(frames) || frames.length !== 3) {
    return { ok: false, reason: 'Expected exactly 3 captured frames (open, closed, open).' };
  }
  const [openEAR1, closedEAR, openEAR2] = frames.map(frameEAR);
  if (openEAR1 === null || closedEAR === null || openEAR2 === null) {
    return { ok: false, reason: 'Could not read eye landmarks from one or more frames.' };
  }

  const openBaseline = (openEAR1 + openEAR2) / 2;
  if (openBaseline < MIN_PLAUSIBLE_OPEN_EAR) {
    return { ok: false, reason: 'Eyes were not clearly open.' };
  }
  if (closedEAR > openBaseline * RELATIVE_DROP_RATIO) {
    return { ok: false, reason: 'No clear blink detected.' };
  }

  const bestOpenFrameIndex = openEAR1 >= openEAR2 ? 0 : 2;
  return { ok: true, bestOpenFrameIndex };
};

// ---- Head turn (alternative to blink — see FaceVerifyGate.jsx) ----
// Same reasoning as the blink check above: a static photo can't
// produce a centered -> turned -> centered sequence either, and the
// client sends raw jaw-outline + nose landmark points, never a
// pre-computed yaw number — this recomputes it independently
// server-side, the same principle as EAR above. Offered as an
// alternative for anyone who finds blink detection unreliable for
// their particular camera/face/lighting; either method satisfies the
// same liveness requirement.
//
// Unlike the blink thresholds above (tuned across real usage over two
// prior rounds — see the history in this file), these are a first
// pass with no real-camera data behind them yet — see
// frontend/utils/livenessState.js, which documents the same caveat
// for its copy of these constants (kept in sync deliberately, same
// as the blink ones).
const YAW_TRIGGER_RATIO = 0.09;
const YAW_CENTERED_MAX_RATIO = 0.12; // looser than the frontend's own 0.05 "still centering" band — this only needs the OPEN frames to be plausibly forward-facing, not perfectly centered

const isValidPointArray = (pts, minLen) => Array.isArray(pts) && pts.length >= minLen
  && pts.every((p) => p && typeof p.x === 'number' && typeof p.y === 'number' && Number.isFinite(p.x) && Number.isFinite(p.y));

// Same formula as frontend/src/utils/faceApi.js's estimateYawRatio —
// kept in sync deliberately, same as EAR.
const frameYaw = (frame) => {
  if (!frame || !isValidPointArray(frame.jawOutline, 2) || !isValidPointArray(frame.nose, 1)) return null;
  const jaw = frame.jawOutline;
  const nose = frame.nose;
  const noseX = nose.reduce((sum, p) => sum + p.x, 0) / nose.length;
  const faceLeftX = jaw[0].x;
  const faceRightX = jaw[jaw.length - 1].x;
  const faceWidth = Math.abs(faceRightX - faceLeftX);
  if (faceWidth === 0) return null;
  return (noseX - (faceLeftX + faceRightX) / 2) / faceWidth;
};

// frames: [centeredFrame1, turnedFrame, centeredFrame2] — exactly 3,
// mirroring verifyBlinkPattern's shape. Confirms a genuine
// centered->turned->centered pattern; returns which centered frame is
// the better identity-match candidate (whichever sat closer to
// actually centered).
const verifyHeadTurnPattern = (frames) => {
  if (!Array.isArray(frames) || frames.length !== 3) {
    return { ok: false, reason: 'Expected exactly 3 captured frames (centered, turned, centered).' };
  }
  const [yaw1, turnedYaw, yaw2] = frames.map(frameYaw);
  if (yaw1 === null || turnedYaw === null || yaw2 === null) {
    return { ok: false, reason: 'Could not read face position from one or more frames.' };
  }
  if (Math.abs(yaw1) > YAW_CENTERED_MAX_RATIO || Math.abs(yaw2) > YAW_CENTERED_MAX_RATIO) {
    return { ok: false, reason: 'Face was not clearly centered at the start and end.' };
  }

  const centerBaseline = (yaw1 + yaw2) / 2;
  if (Math.abs(turnedYaw - centerBaseline) < YAW_TRIGGER_RATIO) {
    return { ok: false, reason: 'No clear head turn detected.' };
  }

  const bestOpenFrameIndex = Math.abs(yaw1) <= Math.abs(yaw2) ? 0 : 2;
  return { ok: true, bestOpenFrameIndex };
};

module.exports = {
  verifyBlinkPattern, frameEAR, RELATIVE_DROP_RATIO, MIN_PLAUSIBLE_OPEN_EAR,
  verifyHeadTurnPattern, frameYaw, YAW_TRIGGER_RATIO, YAW_CENTERED_MAX_RATIO,
};

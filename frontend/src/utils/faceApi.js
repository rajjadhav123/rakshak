// Wraps @vladmandic/face-api — dynamically imported (not a top-level
// import) so its ~1.3MB TensorFlow.js bundle only ever downloads for
// someone who actually opens a face-capture screen. Everyone else's
// first page load stays exactly as small as before this feature
// existed. Models are self-hosted in /public/models (downloaded from
// the face-api.js project, see README) — no CDN dependency at runtime.

let modelsLoadedPromise = null;

async function loadFaceApi() {
  const faceapi = await import('@vladmandic/face-api');
  if (!modelsLoadedPromise) {
    const MODEL_URL = '/models';
    modelsLoadedPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
  }
  await modelsLoadedPromise;
  return faceapi;
}

// Starts downloading models before the person actually needs them
// (e.g. the moment a face-capture screen mounts), so the real capture
// UI isn't sitting on a spinner the first time it's used.
export function preloadFaceApi() {
  loadFaceApi().catch(() => {}); // swallow — the real call site will surface any error
}

// Detects a single face in a video/canvas/image element and returns
// its 128-d descriptor. Deliberately refuses to return a descriptor
// for zero OR more-than-one detected face — an ambiguous frame should
// never silently produce SOME answer.
export async function detectFaceDescriptor(mediaElement) {
  const faceapi = await loadFaceApi();
  const detections = await faceapi
    .detectAllFaces(mediaElement, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptors();

  if (detections.length === 0) return { ok: false, reason: 'No face detected — center your face in the frame.' };
  if (detections.length > 1) return { ok: false, reason: 'More than one face in frame — make sure it\u2019s just you.' };

  return { ok: true, descriptor: Array.from(detections[0].descriptor) };
}

// Detects faces in a static photo (not live video) — used for photo
// quality checking (utils/photoQuality.js), never for identity: it
// deliberately returns only bounding boxes, never a descriptor, so
// this can't accidentally be repurposed as a verification check.
export async function detectFacesInImage(imageOrCanvas) {
  const faceapi = await loadFaceApi();
  const detections = await faceapi.detectAllFaces(imageOrCanvas, new faceapi.TinyFaceDetectorOptions());
  return detections.map((d) => ({
    box: { x: d.box.x, y: d.box.y, width: d.box.width, height: d.box.height },
    score: d.score,
  }));
}

// Eye Aspect Ratio — same formula and point order as
// backend/utils/liveness.js (kept in sync deliberately; see that file
// for the reasoning). Used here only for real-time on-screen feedback
// ("eyes open" / blink detected) — the actual pass/fail decision is
// always made server-side from the raw points this same detection
// call produces, never from this number alone.
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const earForEye = (p) => (dist(p[1], p[5]) + dist(p[2], p[4])) / (2 * dist(p[0], p[3]));
export function averageEAR(landmarks) {
  const left = landmarks.getLeftEye();
  const right = landmarks.getRightEye();
  return (earForEye(left) + earForEye(right)) / 2;
}

// Cheap 2D proxy for head yaw (left/right turn), not a real 3D pose
// estimate: how far the nose sits from the jaw outline's midpoint,
// as a fraction of face width. Roughly 0 when facing the camera;
// magnitude grows as the head turns either direction (which way is
// positive vs negative isn't meaningful on its own — only tracked
// relative to each session's own centered baseline, same reasoning
// as the blink baseline being relative rather than a fixed cutoff).
// Same formula server-side (utils/liveness.js) — kept in sync
// deliberately, same as EAR above.
export function estimateYawRatio(landmarks) {
  const jaw = landmarks.getJawOutline();
  const nose = landmarks.getNose();
  const noseX = nose.reduce((sum, p) => sum + p.x, 0) / nose.length;
  const faceLeftX = jaw[0].x;
  const faceRightX = jaw[jaw.length - 1].x;
  const faceWidth = Math.abs(faceRightX - faceLeftX) || 1; // guard against a degenerate zero-width read
  return (noseX - (faceLeftX + faceRightX) / 2) / faceWidth;
}

// One polling tick for EITHER liveness capture loop (blink or head
// turn) — face + landmarks only, deliberately NOT the descriptor.
// This is the fix for why liveness capture used to need 100+ attempts:
// the old per-tick call ran the FULL pipeline including descriptor
// extraction (by far face-api's most expensive stage) on every ~100ms
// tick, and a naive setInterval doesn't wait for one tick to finish
// before starting the next — so on any hardware where a full detection
// took longer than the poll interval (common without GPU
// acceleration), calls piled up and got progressively slower, right
// when catching a fast blink most needed a quick, responsive sample
// rate. Descriptors are only ever extracted once, at the very end,
// from the specific frames actually kept — see detectFaceDescriptor
// above, called against saved snapshots by the capture components,
// never against live video on a timer.
export async function detectLivenessFrameLight(mediaElement) {
  const faceapi = await loadFaceApi();
  const detection = await faceapi
    // inputSize 224 (vs the 416 default used everywhere else in this
    // file) specifically here — this is the one call made repeatedly,
    // ~10x/second, so it's the one place a smaller, faster input is
    // worth the small accuracy trade-off. Left at 416 for
    // detectFaceDescriptor/detectFacesInImage above, both one-time
    // calls where the extra precision matters more than shaving
    // milliseconds. Held back on this specific change until there was
    // real evidence a close-up webcam face still detects reliably at
    // this size on hardware like this — a genuinely tuned blink
    // capture, logged actually completing and registering real
    // cases, is exactly that evidence.
    .detectSingleFace(mediaElement, new faceapi.TinyFaceDetectorOptions({ inputSize: 224 }))
    .withFaceLandmarks();

  if (!detection) return null;

  const leftEye = detection.landmarks.getLeftEye().map((p) => ({ x: p.x, y: p.y }));
  const rightEye = detection.landmarks.getRightEye().map((p) => ({ x: p.x, y: p.y }));
  const jawOutline = detection.landmarks.getJawOutline().map((p) => ({ x: p.x, y: p.y }));
  const nose = detection.landmarks.getNose().map((p) => ({ x: p.x, y: p.y }));
  return {
    leftEye,
    rightEye,
    jawOutline,
    nose,
    ear: averageEAR(detection.landmarks),
    yawRatio: estimateYawRatio(detection.landmarks),
  };
}

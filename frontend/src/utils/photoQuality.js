import { detectFacesInImage } from './faceApi.js';

// Runs entirely in the browser on the photo the person just uploaded
// — no extra round-trip to the server needed just to find out a
// photo is too blurry or dark to be useful. Two independent checks:
//  - Face detection reuses the same face-api.js models already
//    downloaded for the liveness/verification flow (see faceApi.js)
//    — no new dependency, and no extra download for anyone who's
//    already used a face-capture screen this session.
//  - Blur and brightness are classic, model-free pixel math (variance
//    of Laplacian for blur; mean grayscale for brightness) — plain
//    canvas operations, no ML needed for either.
//
// This is a heads-up, exactly like possible-duplicate detection: a
// warning the person can always dismiss and continue past, never a
// block. A missing, blurry, or dark photo must never be able to stop
// a report from going in — the report matters far more than the
// photo, and a family reporting an emergency won't always have a
// better one on hand.

// Every threshold here is a judgment call, not a derived constant —
// picked against a handful of synthetic test images (solid colour,
// checkerboard, gradients — see the test script this was developed
// against) rather than real submitted photos. Worth tuning once you
// have real usage to check them against, same as the duplicate-
// detection thresholds.
const BLUR_VARIANCE_THRESHOLD = 60;
const DARK_MEAN_THRESHOLD = 50; // 0-255 grayscale
const BRIGHT_MEAN_THRESHOLD = 235; // 0-255 grayscale
const MIN_FACE_AREA_FRACTION = 0.02; // face bounding box vs. whole frame

// Pure pixel math — deliberately takes a plain RGBA buffer rather
// than a canvas, so it can run (and be tested) outside a browser.
// `data` is a flat, 4-values-per-pixel RGBA array — exactly what
// CanvasRenderingContext2D.getImageData().data returns.
export function analyzePixels(data, width, height) {
  const gray = new Float32Array(width * height);
  let sum = 0;
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray[p] = g;
    sum += g;
  }
  const brightness = gray.length ? sum / gray.length : 0;

  // 3x3 Laplacian kernel [[0,1,0],[1,-4,1],[0,1,0]], 1px border
  // skipped. A sharp image has strong edges (high-variance second
  // derivative); a blurry one doesn't.
  let lapSum = 0;
  let lapSumSq = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap = gray[i - 1] + gray[i + 1] + gray[i - width] + gray[i + width] - 4 * gray[i];
      lapSum += lap;
      lapSumSq += lap * lap;
      count++;
    }
  }
  const mean = count ? lapSum / count : 0;
  const blurVariance = count ? lapSumSq / count - mean * mean : 0;

  return { brightness, blurVariance };
}

const loadImage = (url) => new Promise((resolve, reject) => {
  const img = new Image();
  // Needed for getImageData() below to work at all: the uploads
  // server runs on a different origin/port than the frontend in dev,
  // and an image loaded cross-origin without this taints the canvas
  // (getImageData throws a SecurityError). server.js already sends
  // the matching CORS + cross-origin-resource-policy headers on
  // /uploads specifically because other parts of the app already
  // depend on fetching these images cross-origin — see the comment
  // there.
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('Could not load the image'));
  img.src = url;
});

// Downscaled before the pixel pass — a full-resolution phone photo
// (4000px+) would make the per-pixel brightness/blur loop needlessly
// slow for no real accuracy gain, and face-api resizes internally
// regardless.
const ANALYSIS_MAX_DIM = 600;

const toCanvas = (img) => {
  const scale = Math.min(1, ANALYSIS_MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  canvas.getContext('2d', { willReadFrequently: true }).drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
};

// Returns { warnings: [{code, message}], details }. Empty warnings
// means nothing stood out. Never a pass/fail boolean — the caller
// always lets the person continue regardless of what comes back.
export async function analyzePhotoQuality(imageUrl) {
  const img = await loadImage(imageUrl);
  const canvas = toCanvas(img);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { brightness, blurVariance } = analyzePixels(data, canvas.width, canvas.height);

  // A face-api load/run failure (model fetch blocked, WebGL
  // unavailable, whatever) is not itself a statement about the
  // photo — skip the face-related warnings rather than misreport it
  // as "no face detected."
  let faces = null;
  try {
    faces = await detectFacesInImage(canvas);
  } catch {
    faces = null;
  }

  const warnings = [];
  if (faces !== null) {
    if (faces.length === 0) {
      warnings.push({ code: 'no_face', message: "We couldn't detect a clear face in this photo." });
    } else if (faces.length > 1) {
      warnings.push({ code: 'multiple_faces', message: 'This photo has more than one person in it.' });
    } else {
      const { width, height } = faces[0].box;
      const faceFraction = (width * height) / (canvas.width * canvas.height);
      if (faceFraction < MIN_FACE_AREA_FRACTION) {
        warnings.push({ code: 'face_too_small', message: 'The face is quite small in this photo — a closer photo works better for matching sightings.' });
      }
    }
  }
  if (blurVariance < BLUR_VARIANCE_THRESHOLD) {
    warnings.push({ code: 'blurry', message: 'This photo looks blurry.' });
  }
  if (brightness < DARK_MEAN_THRESHOLD) {
    warnings.push({ code: 'too_dark', message: 'This photo looks quite dark.' });
  } else if (brightness > BRIGHT_MEAN_THRESHOLD) {
    warnings.push({ code: 'too_bright', message: 'This photo looks overexposed.' });
  }

  return { warnings, details: { brightness, blurVariance, faceCount: faces?.length ?? null } };
}

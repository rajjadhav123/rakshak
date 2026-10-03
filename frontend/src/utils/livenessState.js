// Pure state-transition logic for both liveness challenge types —
// deliberately has zero DOM/camera/face-api dependency, so it can be
// tested against synthetic reading sequences without a browser (see
// the test script this was developed against). The video/canvas/
// timing/snapshot concerns live in the capture components; this file
// only ever answers "given where we were and what we just measured,
// where are we now."
//
// Both challenges share the same shape: track a baseline while
// resting, detect a clear deviation from it, wait for a return to
// baseline. What differs is only what's being measured and which
// direction counts as a deviation — a blink is a RELATIVE DROP in eye-
// openness (EAR) below the person's own observed-open baseline; a
// head turn is an ABSOLUTE DEVIATION in a yaw estimate away from
// roughly centered. Kept as two separate functions rather than one
// generalized over a comparator — the two are similar in shape but
// different enough (relative-vs-absolute, drop-vs-either-direction)
// that one abstraction covering both would be harder to read than two
// short, direct ones.

// ---- Blink (Eye Aspect Ratio) ----
// Same thresholds as backend/utils/liveness.js — kept in sync
// deliberately, though only the backend's copy is authoritative for
// the actual pass/fail decision (see that file).
export const BLINK_RELATIVE_DROP_RATIO = 0.72;
export const BLINK_RECOVERY_RATIO = 0.85;
export const BLINK_MIN_PLAUSIBLE_OPEN_EAR = 0.14;

// state: { stage: 'watching'|'detected'|'done', baseline: number, pendingCount?: number }
// Returns the next state plus an `event` describing what just
// happened this tick, so the caller can decide what frame/snapshot
// bookkeeping to do — this function itself never touches frames.
export function nextBlinkState(state, ear) {
  if (state.stage === 'watching') {
    // baseline is a running max with no decay by design (it needs to
    // remember "how open were this person's eyes, at best" for the
    // whole watching phase) — which also means a single noisy frame
    // reporting an artificially high EAR (a landmark-tracking glitch,
    // not a real change) could permanently inflate it, since nothing
    // ever brings it back down. That can make a genuine full blink
    // afterward never register as a big enough drop relative to a
    // baseline that was never real to begin with. Requiring 2
    // consecutive ticks above the current baseline (~200ms at the
    // normal poll rate) before promoting it filters an isolated spike
    // — which by definition won't repeat on the very next tick —
    // while still tracking a genuine rise within one extra tick.
    if (ear > state.baseline) {
      const pendingCount = (state.pendingCount || 0) + 1;
      if (pendingCount >= 2) {
        return { stage: 'watching', baseline: ear, pendingCount: 0, event: 'new_baseline' };
      }
      return { stage: 'watching', baseline: state.baseline, pendingCount, event: 'none' };
    }
    if (state.baseline >= BLINK_MIN_PLAUSIBLE_OPEN_EAR && ear < state.baseline * BLINK_RELATIVE_DROP_RATIO) {
      return { stage: 'detected', baseline: state.baseline, event: 'triggered' };
    }
    return { stage: 'watching', baseline: state.baseline, pendingCount: 0, event: 'none' };
  }
  if (state.stage === 'detected') {
    if (ear > state.baseline * BLINK_RECOVERY_RATIO) {
      return { stage: 'done', baseline: state.baseline, event: 'recovered' };
    }
    return { stage: 'detected', baseline: state.baseline, event: 'none' };
  }
  return { ...state, event: 'none' };
}

// ---- Head turn (yaw proxy from 2D landmarks) ----
// yawRatio = how far the nose center sits from the jaw-outline
// midpoint, as a fraction of face width — see faceApi.js's
// estimateYawRatio for the geometry. Roughly 0 when facing the
// camera; magnitude grows as the head turns either direction. Unlike
// the blink thresholds above (tuned across two prior rounds against
// real usage — see liveness.js's own history), these are a first
// pass with no real-camera data behind them yet, and are documented
// as exactly that everywhere they're used — expect to revisit once
// there's real usage to check them against.
// Recovery deliberately gets MORE tolerance than the centered band
// used to establish the baseline in the first place — that asymmetry
// is intentional, not an oversight: the baseline is smoothed across
// many ticks (the EMA below), which naturally filters single-frame
// noise, but recovery is checked against one instantaneous reading —
// so it's structurally more exposed to that same noise than
// establishing the baseline ever was. Requiring the same tight
// tolerance for both meant recovery could fail on noise alone even
// after a completely genuine turn-and-return. 0.065 isn't an
// arbitrary bump — it's the centered band scaled up by roughly the
// same margin the EMA's smoothing buys the baseline side (~30%).
export const YAW_TRIGGER_RATIO = 0.09;
export const YAW_RECOVER_RATIO = 0.065;
export const YAW_CENTERED_MAX_RATIO = 0.05; // baseline must start roughly centered, not already mid-turn

// state: { stage: 'watching'|'detected'|'done', baseline: number }
// baseline tracks the resting (centered) yaw reading, established
// from the first few frames before any turn — unlike blink's baseline
// (a running MAX), this is closer to a running AVERAGE while near
// zero, since "centered" isn't a peak to chase toward, it's wherever
// the person happens to be resting.
export function nextHeadTurnState(state, yawRatio) {
  const absYaw = Math.abs(yawRatio);

  if (state.stage === 'watching') {
    // Only refine the baseline while still plausibly centered — once
    // a turn is underway, later readings are the turn itself, not a
    // better "centered" estimate.
    const baseline = absYaw <= YAW_CENTERED_MAX_RATIO
      ? (state.baseline === null ? yawRatio : state.baseline * 0.8 + yawRatio * 0.2)
      : state.baseline;

    if (baseline !== null && Math.abs(yawRatio - baseline) > YAW_TRIGGER_RATIO) {
      return { stage: 'detected', baseline, event: 'triggered' };
    }
    return { stage: 'watching', baseline, event: baseline !== state.baseline ? 'new_baseline' : 'none' };
  }
  if (state.stage === 'detected') {
    if (Math.abs(yawRatio - state.baseline) < YAW_RECOVER_RATIO) {
      return { stage: 'done', baseline: state.baseline, event: 'recovered' };
    }
    return { stage: 'detected', baseline: state.baseline, event: 'none' };
  }
  return { ...state, event: 'none' };
}

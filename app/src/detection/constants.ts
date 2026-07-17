/**
 * All detection-layer tuning constants live in this one file (ARCH §3).
 * These get tuned on the physical iPhone during S1 — change them here,
 * hot-reload, judge with eyes + the debug HUD.
 */

/** Minimum interval between detector runs. ~12/sec sits inside the 10–15/sec budget. */
export const DETECTION_INTERVAL_MS = 80;

/**
 * Low-pass factor for guide geometry: each new detection pulls the displayed
 * box this fraction of the way toward the target. Higher = snappier, lower = smoother.
 */
export const SMOOTHING_ALPHA = 0.35;

/** Drop the face box after this long without a detection (debounces detector flicker). */
export const FACE_LOST_TIMEOUT_MS = 300;

/** Minimum time a nudge stays on screen before it may switch or clear (ARCH §4). */
export const NUDGE_DWELL_MS = 300;

/**
 * §8.4 gotcha knobs — expected values for iPhone portrait orientation.
 * Sensors deliver landscape frames; the front preview is mirrored. If the
 * box tracks with wrong geometry on-device, these are the first things to
 * flip, per camera (see e2e-checklists/s1-face-spike.md and s4).
 */
export const CAMERA_TUNING = {
  front: { rotation: 90, mirrored: true },
  back: { rotation: 90, mirrored: false },
} as const;
/** Flip to -1 if tilt cues read backwards on-device (ML Kit sign convention check). */
export const ANGLE_SIGN: 1 | -1 = 1;

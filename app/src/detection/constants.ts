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
 * §8.4 gotcha knobs — expected values for iPhone portrait + front camera.
 * The front sensor delivers landscape frames and the preview is mirrored.
 * If the box tracks with wrong geometry on-device, these two are the first
 * things to flip (see e2e-checklists/s1-face-spike.md).
 */
export const FRONT_PREVIEW_MIRRORED = true;
/** Clockwise degrees from sensor frame to portrait engine space: 0 | 90 | 180 | 270. */
export const FRAME_ROTATION_PORTRAIT = 90;

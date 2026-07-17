import type { Guidance, Nudge, NormalizedRect, SceneInput } from '../types';
import { evaluateGeneric } from './generic';

/**
 * Portrait/selfie rule v1.
 *
 * Composition model (tunable constants below):
 *  - The face should sit on one of the two upper rule-of-thirds intersections
 *    (whichever is nearer) — classic eyes-at-upper-third framing.
 *  - The face should fill a comfortable fraction of the frame height.
 *
 * Score = 60% placement + 40% size. Nudges: one directional cue toward the
 * target, plus closer/back when size is off — never more than two (contract).
 * Input geometry is engine space (mirror-corrected), so "left" always means
 * "move toward the left of what the user sees".
 */

/** Upper thirds intersections in engine space. */
const TARGETS = [
  { x: 1 / 3, y: 1 / 3 },
  { x: 2 / 3, y: 1 / 3 },
];

/** Ideal face height as a fraction of frame height, and its comfort band. */
const IDEAL_FACE_HEIGHT = 0.35;
const FACE_HEIGHT_BAND = 0.1; // full marks within ±band around ideal
const FACE_HEIGHT_MIN = 0.08; // zero size-score at/below this
const FACE_HEIGHT_MAX = 0.75; // zero size-score at/above this

/** Placement deadzone: inside this distance no directional nudge fires. */
const PLACEMENT_DEADZONE = 0.07;
/** Distance at which the placement score reaches zero. */
const PLACEMENT_ZERO_AT = 0.55;
/** Size deviation (fraction of ideal) beyond which closer/back nudges fire. */
const SIZE_NUDGE_THRESHOLD = 0.35;

/** Head roll (sideways tilt): free within ±8°, zero angle-marks at 35°. */
const ROLL_FREE_DEG = 8;
const ROLL_ZERO_DEG = 35;
/** Roll beyond this fires a tilt nudge (if a cue slot is free). */
const ROLL_NUDGE_DEG = 12;
/** Head yaw (turn): anything up to ±25° reads as a nice 3/4 or straight-on. */
const YAW_FREE_DEG = 25;
const YAW_ZERO_DEG = 60;

const CELEBRATE_AT = 85;

const POSITION_WEIGHT = 55;
const SIZE_WEIGHT = 30;
const ANGLE_WEIGHT = 15;

function clamp01(n: number): number {
  'worklet';
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

export function evaluatePortrait(input: SceneInput): Guidance {
  'worklet';
  const faces = input.subjects.filter((s) => s.kind === 'face');
  if (faces.length === 0) {
    return evaluateGeneric(input);
  }

  // Dominant face only in v1.
  let face = faces[0]!;
  for (let i = 1; i < faces.length; i++) {
    const f = faces[i]!;
    if (f.boundingBox.width * f.boundingBox.height > face.boundingBox.width * face.boundingBox.height) {
      face = f;
    }
  }
  const box = face.boundingBox;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  // Nearest upper-thirds intersection.
  const t0 = TARGETS[0]!;
  const t1 = TARGETS[1]!;
  const d0 = Math.hypot(cx - t0.x, cy - t0.y);
  const d1 = Math.hypot(cx - t1.x, cy - t1.y);
  const target = d0 <= d1 ? t0 : t1;
  const dist = Math.min(d0, d1);

  // --- scores ---
  const positionScore = clamp01(1 - dist / PLACEMENT_ZERO_AT);

  const h = box.height;
  let sizeScore: number;
  const deviation = Math.abs(h - IDEAL_FACE_HEIGHT);
  if (deviation <= FACE_HEIGHT_BAND) {
    sizeScore = 1;
  } else if (h < IDEAL_FACE_HEIGHT) {
    sizeScore = clamp01((h - FACE_HEIGHT_MIN) / (IDEAL_FACE_HEIGHT - FACE_HEIGHT_BAND - FACE_HEIGHT_MIN));
  } else {
    sizeScore = clamp01((FACE_HEIGHT_MAX - h) / (FACE_HEIGHT_MAX - IDEAL_FACE_HEIGHT - FACE_HEIGHT_BAND));
  }

  // Angle score: neutral (or unreported) angles get full marks, so detectors
  // without angle output are never penalized.
  const roll = face.angles?.roll ?? 0;
  const yaw = face.angles?.yaw ?? 0;
  const rollScore =
    Math.abs(roll) <= ROLL_FREE_DEG
      ? 1
      : clamp01(1 - (Math.abs(roll) - ROLL_FREE_DEG) / (ROLL_ZERO_DEG - ROLL_FREE_DEG));
  const yawScore =
    Math.abs(yaw) <= YAW_FREE_DEG
      ? 1
      : clamp01(1 - (Math.abs(yaw) - YAW_FREE_DEG) / (YAW_ZERO_DEG - YAW_FREE_DEG));
  const angleScore = 0.7 * rollScore + 0.3 * yawScore;

  const score = Math.round(
    POSITION_WEIGHT * positionScore + SIZE_WEIGHT * sizeScore + ANGLE_WEIGHT * angleScore,
  );

  // --- nudges (≤ 2 by contract; priority: placement, size, tilt) ---
  const nudges: Nudge[] = [];
  if (dist > PLACEMENT_DEADZONE) {
    const dx = target.x - cx;
    const dy = target.y - cy;
    const strength = clamp01(dist / 0.4);
    if (Math.abs(dx) >= Math.abs(dy)) {
      nudges.push({ direction: dx < 0 ? 'left' : 'right', strength });
    } else {
      nudges.push({ direction: dy < 0 ? 'up' : 'down', strength });
    }
  }
  const sizeDeviationFrac = (h - IDEAL_FACE_HEIGHT) / IDEAL_FACE_HEIGHT;
  if (Math.abs(sizeDeviationFrac) > SIZE_NUDGE_THRESHOLD) {
    nudges.push({
      direction: sizeDeviationFrac < 0 ? 'closer' : 'back',
      strength: clamp01(Math.abs(sizeDeviationFrac)),
    });
  }
  // Tilt cue: head rolled clockwise → tilt back to the left, and vice versa.
  if (nudges.length < 2 && Math.abs(roll) > ROLL_NUDGE_DEG) {
    nudges.push({
      direction: roll > 0 ? 'tiltLeft' : 'tiltRight',
      strength: clamp01(Math.abs(roll) / ROLL_ZERO_DEG),
    });
  }

  // --- guides ---
  const zoneW = IDEAL_FACE_HEIGHT * 0.85; // faces are a bit narrower than tall
  const zoneH = IDEAL_FACE_HEIGHT;
  const targetZone: NormalizedRect = {
    x: clamp01(target.x - zoneW / 2),
    y: clamp01(target.y - zoneH / 2),
    width: zoneW,
    height: zoneH,
  };

  return {
    guides: [
      { kind: 'thirdsGrid', emphasis: 0.5 },
      { kind: 'targetZone', region: targetZone, emphasis: clamp01(0.35 + dist) },
    ],
    score,
    nudges,
    celebrate: score >= CELEBRATE_AT,
  };
}

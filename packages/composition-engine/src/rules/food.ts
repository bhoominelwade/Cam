import type { Guidance, Nudge, NormalizedRect, SceneInput } from '../types';
import { evaluateGeneric } from './generic';

/**
 * Food rule v1 (S5).
 *
 * Composition model:
 *  - The dish should sit either dead-center (classic flat-lay) or on a
 *    rule-of-thirds intersection — whichever the shooter is closer to.
 *    Both are legitimate food framings; we coach toward the nearest.
 *  - The dish should FILL the frame generously (the classic amateur mistake
 *    is shooting food from too far away).
 *  - The phone should be level (input.horizon, degrees) — a skewed table
 *    line ruins a food shot. Detectors without horizon data are not penalized.
 *
 * Score = 45% placement + 35% fill + 20% level. Nudges ≤ 2 by contract,
 * priority: placement, fill, level.
 */

const ANCHORS = [
  { x: 0.5, y: 0.5 },
  { x: 1 / 3, y: 1 / 3 },
  { x: 2 / 3, y: 1 / 3 },
  { x: 1 / 3, y: 2 / 3 },
  { x: 2 / 3, y: 2 / 3 },
];

/** Ideal dish area as a fraction of the frame, with a comfort band. */
const IDEAL_FILL = 0.45;
const FILL_BAND = 0.18;
const FILL_MIN = 0.04;
const FILL_MAX = 0.97;

const PLACEMENT_DEADZONE = 0.06;
const PLACEMENT_ZERO_AT = 0.5;
/** Fill deviation (fraction of ideal) beyond which closer/back fires. */
const FILL_NUDGE_THRESHOLD = 0.35;

/** Horizon: free within ±3°, zero marks at 15°, cue beyond 5°. */
const LEVEL_FREE_DEG = 3;
const LEVEL_ZERO_DEG = 15;
const LEVEL_NUDGE_DEG = 5;

const CELEBRATE_AT = 85;

const PLACEMENT_WEIGHT = 45;
const FILL_WEIGHT = 35;
const LEVEL_WEIGHT = 20;

function clamp01(n: number): number {
  'worklet';
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

export function evaluateFood(input: SceneInput): Guidance {
  'worklet';
  const foods = input.subjects.filter((s) => s.kind === 'food' || s.kind === 'object');
  if (foods.length === 0) {
    return evaluateGeneric(input);
  }

  // Dominant (largest) subject.
  let dish = foods[0]!;
  for (let i = 1; i < foods.length; i++) {
    const f = foods[i]!;
    if (f.boundingBox.width * f.boundingBox.height > dish.boundingBox.width * dish.boundingBox.height) {
      dish = f;
    }
  }
  const box = dish.boundingBox;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  // Nearest anchor (center or a thirds intersection).
  let anchor = ANCHORS[0]!;
  let dist = Math.hypot(cx - anchor.x, cy - anchor.y);
  for (let i = 1; i < ANCHORS.length; i++) {
    const a = ANCHORS[i]!;
    const d = Math.hypot(cx - a.x, cy - a.y);
    if (d < dist) {
      dist = d;
      anchor = a;
    }
  }

  // --- scores ---
  const placementScore = clamp01(1 - dist / PLACEMENT_ZERO_AT);

  const area = box.width * box.height;
  let fillScore: number;
  const deviation = Math.abs(area - IDEAL_FILL);
  if (deviation <= FILL_BAND) {
    fillScore = 1;
  } else if (area < IDEAL_FILL) {
    fillScore = clamp01((area - FILL_MIN) / (IDEAL_FILL - FILL_BAND - FILL_MIN));
  } else {
    fillScore = clamp01((FILL_MAX - area) / (FILL_MAX - IDEAL_FILL - FILL_BAND));
  }

  const horizon = input.horizon ?? 0;
  const levelScore =
    Math.abs(horizon) <= LEVEL_FREE_DEG
      ? 1
      : clamp01(1 - (Math.abs(horizon) - LEVEL_FREE_DEG) / (LEVEL_ZERO_DEG - LEVEL_FREE_DEG));

  const score = Math.round(
    PLACEMENT_WEIGHT * placementScore + FILL_WEIGHT * fillScore + LEVEL_WEIGHT * levelScore,
  );

  // --- nudges (≤ 2 by contract; priority: placement, fill, level) ---
  const nudges: Nudge[] = [];
  if (dist > PLACEMENT_DEADZONE) {
    const dx = anchor.x - cx;
    const dy = anchor.y - cy;
    const strength = clamp01(dist / 0.35);
    if (Math.abs(dx) >= Math.abs(dy)) {
      nudges.push({ direction: dx < 0 ? 'left' : 'right', strength });
    } else {
      nudges.push({ direction: dy < 0 ? 'up' : 'down', strength });
    }
  }
  const fillDeviationFrac = (area - IDEAL_FILL) / IDEAL_FILL;
  if (Math.abs(fillDeviationFrac) > FILL_NUDGE_THRESHOLD) {
    nudges.push({
      direction: fillDeviationFrac < 0 ? 'closer' : 'back',
      strength: clamp01(Math.abs(fillDeviationFrac)),
    });
  }
  if (nudges.length < 2 && Math.abs(horizon) > LEVEL_NUDGE_DEG) {
    nudges.push({
      direction: horizon > 0 ? 'tiltLeft' : 'tiltRight',
      strength: clamp01(Math.abs(horizon) / LEVEL_ZERO_DEG),
    });
  }

  // --- guides ---
  const zoneW = 0.62;
  const zoneH = 0.5;
  const targetZone: NormalizedRect = {
    x: clamp01(anchor.x - zoneW / 2),
    y: clamp01(anchor.y - zoneH / 2),
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

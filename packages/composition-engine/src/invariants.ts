import type { Guidance, SceneInput } from './types';

/**
 * Contract invariants, checked in tests and (in dev builds) at the engine
 * boundary. The engine is pure and must never throw on valid input (ARCH §5);
 * these functions define "valid".
 */

const inUnit = (n: number): boolean => Number.isFinite(n) && n >= 0 && n <= 1;

export function isValidSceneInput(input: SceneInput): boolean {
  if (!Number.isFinite(input.frameAspect) || input.frameAspect <= 0) return false;
  if (input.horizon !== undefined && !Number.isFinite(input.horizon)) return false;
  return input.subjects.every(({ boundingBox: b, confidence }) => {
    if (confidence !== undefined && !inUnit(confidence)) return false;
    return (
      inUnit(b.x) && inUnit(b.y) && inUnit(b.width) && inUnit(b.height) &&
      b.x + b.width <= 1 && b.y + b.height <= 1
    );
  });
}

export function isValidGuidance(g: Guidance): boolean {
  if (!Number.isFinite(g.score) || g.score < 0 || g.score > 100) return false;
  if (g.nudges.length > 2) return false;
  if (!g.nudges.every((n) => inUnit(n.strength))) return false;
  return g.guides.every((guide) => inUnit(guide.emphasis));
}

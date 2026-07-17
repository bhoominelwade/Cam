import { evaluateFood } from './rules/food';
import { evaluateGeneric } from './rules/generic';
import { evaluatePortrait } from './rules/portrait';
import type { Guidance, SceneInput } from './types';

/**
 * The engine's single entry point. Dispatches to the pluggable rule for the
 * scene type (pose arrives in v1.1). Pure, worklet-safe, and by contract
 * cannot throw on valid input — guaranteed by the test suite.
 */
export function computeGuidance(input: SceneInput): Guidance {
  'worklet';
  if (input.sceneType === 'portrait') {
    return evaluatePortrait(input);
  }
  if (input.sceneType === 'food') {
    return evaluateFood(input);
  }
  return evaluateGeneric(input);
}

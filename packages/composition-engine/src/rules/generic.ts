import type { Guidance, SceneInput } from '../types';

/**
 * Fallback rule: no recognized subject, or detection unavailable. Cam without
 * AI is still a nice camera (ARCH §5) — show a calm thirds grid, coach nothing.
 */
export function evaluateGeneric(_input: SceneInput): Guidance {
  'worklet';
  return {
    guides: [{ kind: 'thirdsGrid', emphasis: 0.5 }],
    score: 0,
    nudges: [],
    celebrate: false,
  };
}

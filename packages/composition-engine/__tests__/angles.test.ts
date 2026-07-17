import { evaluatePortrait, type SceneInput, type Subject } from '../src';

const faceAt = (cx: number, cy: number, h: number, angles?: Subject['angles']): Subject => {
  const base: Subject = {
    kind: 'face',
    boundingBox: { x: cx - (h * 0.8) / 2, y: cy - h / 2, width: h * 0.8, height: h },
  };
  return angles ? { ...base, angles } : base;
};

const input = (s: Subject): SceneInput => ({ sceneType: 'portrait', subjects: [s], frameAspect: 3 / 4 });

const golden = (angles?: Subject['angles']) => evaluatePortrait(input(faceAt(1 / 3, 1 / 3, 0.35, angles)));

describe('portrait rule — head angles', () => {
  test('no angle data → no penalty (detectors without angles are never punished)', () => {
    expect(golden().score).toBeGreaterThanOrEqual(95);
    expect(golden().celebrate).toBe(true);
  });

  test('level head and slight 3/4 turn keep full marks', () => {
    expect(golden({ roll: 3, yaw: 15 }).score).toBeGreaterThanOrEqual(95);
  });

  test('heavy sideways tilt costs points', () => {
    const level = golden({ roll: 0 }).score;
    const tilted = golden({ roll: 30 }).score;
    expect(tilted).toBeLessThan(level);
  });

  test('extreme yaw (looking away) costs points', () => {
    const straight = golden({ yaw: 0 }).score;
    const away = golden({ yaw: 55 }).score;
    expect(away).toBeLessThan(straight);
  });

  test('clockwise roll → tiltLeft cue; counter-clockwise → tiltRight', () => {
    expect(golden({ roll: 25 }).nudges.some((n) => n.direction === 'tiltLeft')).toBe(true);
    expect(golden({ roll: -25 }).nudges.some((n) => n.direction === 'tiltRight')).toBe(true);
  });

  test('mild roll inside the nudge threshold stays quiet', () => {
    expect(golden({ roll: 10 }).nudges).toHaveLength(0);
  });

  test('tilt never claims a third cue slot', () => {
    // Badly placed AND tiny AND tilted: placement + size take the two slots.
    const g = evaluatePortrait(input(faceAt(0.9, 0.85, 0.1, { roll: 30 })));
    expect(g.nudges.length).toBeLessThanOrEqual(2);
    expect(g.nudges.some((n) => n.direction === 'tiltLeft' || n.direction === 'tiltRight')).toBe(false);
  });
});

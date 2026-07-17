import { evaluateFood, type SceneInput, type Subject } from '../src';

/** A dish whose CENTER sits at (cx, cy) covering `area` of the frame (square). */
const dishAt = (cx: number, cy: number, area = 0.45): Subject => {
  const side = Math.sqrt(area);
  return {
    kind: 'food',
    boundingBox: { x: cx - side / 2, y: cy - side / 2, width: side, height: side },
  };
};

const input = (subjects: Subject[], horizon?: number): SceneInput => ({
  sceneType: 'food',
  subjects,
  frameAspect: 3 / 4,
  ...(horizon !== undefined ? { horizon } : {}),
});

describe('food rule — golden cases', () => {
  test('generous centered dish on a level table scores ≥ 95', () => {
    const g = evaluateFood(input([dishAt(0.5, 0.5)], 0));
    expect(g.score).toBeGreaterThanOrEqual(95);
    expect(g.nudges).toHaveLength(0);
    expect(g.celebrate).toBe(true);
  });

  test('a thirds-intersection dish is just as good as centered', () => {
    const g = evaluateFood(input([dishAt(2 / 3, 1 / 3)]));
    expect(g.score).toBeGreaterThanOrEqual(95);
  });

  test('no dish → generic guidance (grid only, no coaching)', () => {
    const g = evaluateFood(input([]));
    expect(g.score).toBe(0);
    expect(g.nudges).toHaveLength(0);
    expect(g.guides.map((x) => x.kind)).toEqual(['thirdsGrid']);
  });
});

describe('food rule — coaching', () => {
  test('tiny far-away plate → "closer" (the classic amateur food mistake)', () => {
    const g = evaluateFood(input([dishAt(0.5, 0.5, 0.06)]));
    expect(g.nudges.some((n) => n.direction === 'closer')).toBe(true);
    expect(g.score).toBeLessThan(85);
  });

  test('dish shoved into a corner → directional cue toward the nearest anchor', () => {
    const g = evaluateFood(input([dishAt(0.12, 0.5, 0.2)]));
    expect(g.nudges[0]?.direction).toBe('right');
  });

  test('skewed table line → tilt cue in the correcting direction', () => {
    const g = evaluateFood(input([dishAt(0.5, 0.5)], 10));
    expect(g.nudges.some((n) => n.direction === 'tiltLeft')).toBe(true);
    const g2 = evaluateFood(input([dishAt(0.5, 0.5)], -10));
    expect(g2.nudges.some((n) => n.direction === 'tiltRight')).toBe(true);
  });

  test('no horizon data → never penalized, never nagged about level', () => {
    const g = evaluateFood(input([dishAt(0.5, 0.5)]));
    expect(g.score).toBeGreaterThanOrEqual(95);
    expect(g.nudges.some((n) => n.direction === 'tiltLeft' || n.direction === 'tiltRight')).toBe(false);
  });

  test('never more than two cues, placement and fill outrank level', () => {
    const g = evaluateFood(input([dishAt(0.1, 0.85, 0.05)], 12));
    expect(g.nudges.length).toBeLessThanOrEqual(2);
    expect(g.nudges.some((n) => n.direction === 'tiltLeft')).toBe(false);
  });

  test('largest dish wins when several objects are visible', () => {
    const crumb = dishAt(0.9, 0.9, 0.02);
    const feast = dishAt(0.5, 0.5, 0.45);
    const g = evaluateFood(input([crumb, feast], 0));
    expect(g.score).toBeGreaterThanOrEqual(95);
  });
});

import {
  computeGuidance,
  evaluatePortrait,
  isValidGuidance,
  type SceneInput,
  type Subject,
} from '../src';

const face = (x: number, y: number, w: number, h: number): Subject => ({
  kind: 'face',
  boundingBox: { x, y, width: w, height: h },
});

/** A face whose CENTER sits at (cx, cy) with height h (width 0.8h). */
const faceCenteredAt = (cx: number, cy: number, h = 0.35): Subject =>
  face(cx - (h * 0.8) / 2, cy - h / 2, h * 0.8, h);

const portraitInput = (subjects: Subject[]): SceneInput => ({
  sceneType: 'portrait',
  subjects,
  frameAspect: 3 / 4,
});

describe('portrait rule — golden cases', () => {
  test('face at exact upper-thirds intersection with ideal size scores ≥ 95', () => {
    const g = evaluatePortrait(portraitInput([faceCenteredAt(1 / 3, 1 / 3)]));
    expect(g.score).toBeGreaterThanOrEqual(95);
    expect(g.nudges).toHaveLength(0);
    expect(g.celebrate).toBe(true);
  });

  test('the right-hand intersection is just as good as the left', () => {
    const g = evaluatePortrait(portraitInput([faceCenteredAt(2 / 3, 1 / 3)]));
    expect(g.score).toBeGreaterThanOrEqual(95);
    expect(g.celebrate).toBe(true);
  });

  test('no face → generic guidance (thirds grid only, no coaching)', () => {
    const g = evaluatePortrait(portraitInput([]));
    expect(g.guides.map((x) => x.kind)).toEqual(['thirdsGrid']);
    expect(g.score).toBe(0);
    expect(g.nudges).toHaveLength(0);
    expect(g.celebrate).toBe(false);
  });
});

describe('portrait rule — nudge directions (engine space is what the user sees)', () => {
  test('face too far right → nudge left', () => {
    const g = evaluatePortrait(portraitInput([faceCenteredAt(0.93, 1 / 3, 0.3)]));
    expect(g.nudges[0]?.direction).toBe('left');
  });

  test('face too far left → nudge right', () => {
    const g = evaluatePortrait(portraitInput([faceCenteredAt(0.05, 1 / 3, 0.3)]));
    expect(g.nudges[0]?.direction).toBe('right');
  });

  test('face too low → nudge up', () => {
    const g = evaluatePortrait(portraitInput([faceCenteredAt(1 / 3, 0.85, 0.3)]));
    expect(g.nudges[0]?.direction).toBe('up');
  });

  test('face too high → nudge down', () => {
    const g = evaluatePortrait(portraitInput([faceCenteredAt(1 / 3, 0.05, 0.22)]));
    expect(g.nudges[0]?.direction).toBe('down');
  });

  test('tiny distant face → includes a closer nudge', () => {
    const g = evaluatePortrait(portraitInput([faceCenteredAt(1 / 3, 1 / 3, 0.1)]));
    expect(g.nudges.some((n) => n.direction === 'closer')).toBe(true);
  });

  test('face filling the frame → includes a back nudge', () => {
    const g = evaluatePortrait(portraitInput([faceCenteredAt(0.5, 0.5, 0.7)]));
    expect(g.nudges.some((n) => n.direction === 'back')).toBe(true);
  });

  test('well-placed face never gets a directional nudge from inside the deadzone', () => {
    const g = evaluatePortrait(portraitInput([faceCenteredAt(1 / 3 + 0.03, 1 / 3 - 0.03)]));
    const directional = g.nudges.filter((n) => ['left', 'right', 'up', 'down'].includes(n.direction));
    expect(directional).toHaveLength(0);
  });
});

describe('portrait rule — structure', () => {
  test('dominant (largest) face wins when several are visible', () => {
    const small = faceCenteredAt(0.9, 0.9, 0.12);
    const big = faceCenteredAt(1 / 3, 1 / 3, 0.35);
    const g = evaluatePortrait(portraitInput([small, big]));
    expect(g.score).toBeGreaterThanOrEqual(95);
  });

  test('guides include the target zone anchored to the nearest intersection', () => {
    const g = evaluatePortrait(portraitInput([faceCenteredAt(0.6, 0.4)]));
    const zone = g.guides.find((x) => x.kind === 'targetZone');
    expect(zone?.region).toBeDefined();
    const r = zone!.region!;
    expect(r.x + r.width / 2).toBeCloseTo(2 / 3, 1);
  });

  test('score degrades monotonically with distance from the intersection', () => {
    const at = (cx: number) =>
      evaluatePortrait(portraitInput([faceCenteredAt(cx, 1 / 3)])).score;
    // 0.5 is the worst horizontal spot (equidistant from both intersections);
    // 0.95 is even farther from its nearest one.
    expect(at(1 / 3)).toBeGreaterThan(at(0.5));
    expect(at(0.5)).toBeGreaterThanOrEqual(at(0.95));
  });
});

describe('engine contract holds for any valid input (fuzz sweep)', () => {
  test('computeGuidance never throws and always returns valid Guidance', () => {
    // Deterministic pseudo-random sweep — no Math.random so failures reproduce.
    let seed = 42;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let i = 0; i < 2000; i++) {
      const x = rnd();
      const y = rnd();
      const w = rnd() * (1 - x);
      const h = rnd() * (1 - y);
      const sceneType = (['portrait', 'food', 'generic'] as const)[i % 3]!;
      const input: SceneInput = {
        sceneType,
        subjects: i % 5 === 0 ? [] : [{ kind: 'face', boundingBox: { x, y, width: w, height: h } }],
        frameAspect: 0.25 + rnd() * 2,
      };
      const g = computeGuidance(input);
      expect(isValidGuidance(g)).toBe(true);
    }
  });
});

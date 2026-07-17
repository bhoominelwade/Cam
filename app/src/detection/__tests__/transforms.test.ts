import { engineToScreen, frameToEngine, type FrameSpace, type Rect } from '../transforms';

const approx = (a: Rect, b: Rect, eps = 1e-9) => {
  expect(Math.abs(a.x - b.x)).toBeLessThan(eps);
  expect(Math.abs(a.y - b.y)).toBeLessThan(eps);
  expect(Math.abs(a.width - b.width)).toBeLessThan(eps);
  expect(Math.abs(a.height - b.height)).toBeLessThan(eps);
};

describe('frameToEngine', () => {
  const landscapeFrame: FrameSpace = { width: 1920, height: 1080, rotation: 0, mirrored: false };

  test('normalizes without rotation or mirror', () => {
    approx(
      frameToEngine({ x: 192, y: 108, width: 384, height: 216 }, landscapeFrame),
      { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
    );
  });

  test('center stays center under every rotation and mirror', () => {
    const centered = { x: 860, y: 440, width: 200, height: 200 };
    for (const rotation of [0, 90, 180, 270] as const) {
      for (const mirrored of [false, true]) {
        const r = frameToEngine(centered, { ...landscapeFrame, rotation, mirrored });
        expect(r.x + r.width / 2).toBeCloseTo(0.5, 6);
        expect(r.y + r.height / 2).toBeCloseTo(0.5, 6);
      }
    }
  });

  test('90° rotation maps sensor-left to engine-top and swaps aspect', () => {
    // A face near the sensor's left edge (x small), vertically centered.
    const r = frameToEngine({ x: 0, y: 390, width: 300, height: 300 }, { ...landscapeFrame, rotation: 90 });
    // After rotating cw, it should sit near the top of portrait engine space.
    expect(r.y).toBeCloseTo(0, 6);
    // Normalized sizes swap denominators: 300/1080 horizontal, 300/1920 vertical.
    expect(r.width).toBeCloseTo(300 / 1080, 6);
    expect(r.height).toBeCloseTo(300 / 1920, 6);
  });

  test('mirror flips horizontally and is an involution', () => {
    const bounds = { x: 192, y: 108, width: 384, height: 216 };
    const once = frameToEngine(bounds, { ...landscapeFrame, mirrored: true });
    expect(once.x).toBeCloseTo(1 - (0.1 + 0.2), 6);
    // Mirroring the mirrored rect reproduces the unmirrored one.
    const back = {
      ...once,
      x: 1 - (once.x + once.width),
    };
    approx(back, frameToEngine(bounds, landscapeFrame));
  });

  test('180° equals mirror applied to both axes', () => {
    const bounds = { x: 100, y: 200, width: 300, height: 150 };
    const rotated = frameToEngine(bounds, { ...landscapeFrame, rotation: 180 });
    const plain = frameToEngine(bounds, landscapeFrame);
    expect(rotated.x).toBeCloseTo(1 - (plain.x + plain.width), 6);
    expect(rotated.y).toBeCloseTo(1 - (plain.y + plain.height), 6);
  });

  test('clamps out-of-frame detector output into engine space', () => {
    const r = frameToEngine({ x: -100, y: 900, width: 400, height: 400 }, landscapeFrame);
    expect(r.x).toBe(0);
    expect(r.y + r.height).toBeLessThanOrEqual(1);
    expect(r.width).toBeGreaterThan(0);
  });
});

describe('engineToScreen (aspect-fill preview)', () => {
  const screen = { width: 390, height: 844 };

  test('full engine frame covers the screen with symmetric crop', () => {
    const full = engineToScreen({ x: 0, y: 0, width: 1, height: 1 }, 3 / 4, screen);
    expect(full.width).toBeGreaterThanOrEqual(screen.width);
    expect(full.height).toBeGreaterThanOrEqual(screen.height);
    expect(full.x).toBeCloseTo((screen.width - full.width) / 2, 6);
    expect(full.y).toBeCloseTo((screen.height - full.height) / 2, 6);
    // One axis fits exactly.
    const fitsW = Math.abs(full.width - screen.width) < 1e-6;
    const fitsH = Math.abs(full.height - screen.height) < 1e-6;
    expect(fitsW || fitsH).toBe(true);
  });

  test('engine center lands on screen center', () => {
    const c = engineToScreen({ x: 0.5, y: 0.5, width: 0, height: 0 }, 3 / 4, screen);
    expect(c.x).toBeCloseTo(screen.width / 2, 6);
    expect(c.y).toBeCloseTo(screen.height / 2, 6);
  });

  test('relative positions are preserved linearly', () => {
    const a = engineToScreen({ x: 0.25, y: 0.25, width: 0.5, height: 0.5 }, 3 / 4, screen);
    const b = engineToScreen({ x: 0, y: 0, width: 1, height: 1 }, 3 / 4, screen);
    expect(a.width).toBeCloseTo(b.width / 2, 6);
    expect(a.height).toBeCloseTo(b.height / 2, 6);
    expect(a.x).toBeCloseTo(b.x + b.width * 0.25, 6);
  });
});

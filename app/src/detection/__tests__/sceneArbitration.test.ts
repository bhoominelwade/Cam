import {
  arbitrate,
  initialArbitration,
  SCENE_ENTER_MS,
  SCENE_EXIT_MS,
  type ArbitrationState,
} from '../sceneArbitration';

const FACE = { faceArea: 0.2, salientFresh: false };
const SMALL_FACE_WITH_DISH = { faceArea: 0.03, salientFresh: true };
const DISH = { faceArea: 0, salientFresh: true };
const NOTHING = { faceArea: 0, salientFresh: false };

/** Run arbitrate over a timeline of (signals, at) steps. */
const run = (steps: Array<[typeof FACE, number]>, from?: ArbitrationState) =>
  steps.reduce((s, [sig, at]) => arbitrate(s, sig, at), from ?? initialArbitration());

describe('scene arbitration', () => {
  test('dominant face persisting past the enter dwell → portrait', () => {
    const s = run([
      [FACE, 0],
      [FACE, 100],
      [FACE, SCENE_ENTER_MS + 10],
    ]);
    expect(s.scene).toBe('portrait');
  });

  test('a face blip shorter than the dwell never switches the scene', () => {
    const s = run([
      [FACE, 0],
      [FACE, 100],
      [NOTHING, 200],
      [NOTHING, 5000],
    ]);
    expect(s.scene).toBe('generic');
  });

  test('plate with no dominant face → food', () => {
    const s = run([
      [DISH, 0],
      [DISH, SCENE_ENTER_MS + 10],
    ]);
    expect(s.scene).toBe('food');
  });

  test('a small face in a food scene does NOT steal the scene', () => {
    const s = run([
      [SMALL_FACE_WITH_DISH, 0],
      [SMALL_FACE_WITH_DISH, SCENE_ENTER_MS + 10],
    ]);
    expect(s.scene).toBe('food');
  });

  test('dominant face beats the dish (portrait wins arbitration)', () => {
    const both = { faceArea: 0.2, salientFresh: true };
    const s = run([
      [both, 0],
      [both, SCENE_ENTER_MS + 10],
    ]);
    expect(s.scene).toBe('portrait');
  });

  test('sticky exit: brief detection dropouts while panning do not flicker to generic', () => {
    const food = run([
      [DISH, 0],
      [DISH, SCENE_ENTER_MS + 10],
    ]);
    // Dropout shorter than the exit dwell, then the dish is back.
    const s = run(
      [
        [NOTHING, 1000],
        [NOTHING, 1000 + SCENE_EXIT_MS - 50],
        [DISH, 1000 + SCENE_EXIT_MS - 20],
      ],
      food,
    );
    expect(s.scene).toBe('food');
  });

  test('a real walk-away eventually falls back to generic', () => {
    const food = run([
      [DISH, 0],
      [DISH, SCENE_ENTER_MS + 10],
    ]);
    const s = run(
      [
        [NOTHING, 1000],
        [NOTHING, 1000 + SCENE_EXIT_MS + 10],
      ],
      food,
    );
    expect(s.scene).toBe('generic');
  });

  test('portrait → food handoff when the phone pans from a person to the plate', () => {
    const portrait = run([
      [FACE, 0],
      [FACE, SCENE_ENTER_MS + 10],
    ]);
    const s = run(
      [
        [DISH, 1000],
        [DISH, 1000 + SCENE_ENTER_MS + 10],
      ],
      portrait,
    );
    expect(s.scene).toBe('food');
  });
});

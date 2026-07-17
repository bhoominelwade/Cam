import {
  ENGINE_CONTRACT_VERSION,
  isValidGuidance,
  isValidSceneInput,
  type Guidance,
  type SceneInput,
} from '../src';

const validInput: SceneInput = {
  sceneType: 'portrait',
  subjects: [
    { kind: 'face', boundingBox: { x: 0.55, y: 0.2, width: 0.2, height: 0.25 }, confidence: 0.98 },
  ],
  frameAspect: 3 / 4,
};

const validGuidance: Guidance = {
  guides: [{ kind: 'thirdsGrid', emphasis: 0.5 }],
  score: 87,
  nudges: [{ direction: 'left', strength: 0.4 }],
  celebrate: false,
};

describe('engine contract v' + ENGINE_CONTRACT_VERSION, () => {
  test('accepts a well-formed SceneInput', () => {
    expect(isValidSceneInput(validInput)).toBe(true);
  });

  test('rejects geometry outside engine space', () => {
    expect(
      isValidSceneInput({
        ...validInput,
        subjects: [{ kind: 'face', boundingBox: { x: 0.9, y: 0.1, width: 0.2, height: 0.2 } }],
      }),
    ).toBe(false);
    expect(isValidSceneInput({ ...validInput, frameAspect: 0 })).toBe(false);
    expect(isValidSceneInput({ ...validInput, horizon: NaN })).toBe(false);
  });

  test('accepts well-formed Guidance', () => {
    expect(isValidGuidance(validGuidance)).toBe(true);
  });

  test('rejects more than two nudges — the cue cap is a contract, not a style choice', () => {
    const n = { direction: 'left', strength: 0.5 } as const;
    expect(isValidGuidance({ ...validGuidance, nudges: [n, n, n] })).toBe(false);
  });

  test('rejects out-of-range scores', () => {
    expect(isValidGuidance({ ...validGuidance, score: 101 })).toBe(false);
    expect(isValidGuidance({ ...validGuidance, score: -1 })).toBe(false);
    expect(isValidGuidance({ ...validGuidance, score: NaN })).toBe(false);
  });
});

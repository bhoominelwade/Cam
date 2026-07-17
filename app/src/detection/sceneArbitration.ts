/**
 * Scene-type arbitration (ARCH §3): a small state machine with hysteresis,
 * living in the detection layer. Pure and worklet-safe; unit-tested.
 *
 * Rules: a dominant face (> ~8% of frame, fresh for ~300ms) wins portrait;
 * a fresh salient subject with no dominant face wins food; otherwise generic.
 * Exits are stickier than entries so panning across a table doesn't flicker.
 */

export type Scene = 'portrait' | 'food' | 'generic';

export interface ArbitrationState {
  scene: Scene;
  candidate: Scene;
  candidateSinceMs: number;
}

export interface SceneSignals {
  /** Area (0–1 of frame) of the freshest detected face, or 0 if none fresh. */
  faceArea: number;
  /** True when a salient subject was seen recently. */
  salientFresh: boolean;
}

/** A face bigger than this fraction of the frame makes the scene a portrait. */
export const FACE_DOMINANT_AREA = 0.08;
/** A new scene must persist this long before we switch to it. */
export const SCENE_ENTER_MS = 300;
/** Falling back to generic waits longer — losing detection blips constantly. */
export const SCENE_EXIT_MS = 700;

export function initialArbitration(): ArbitrationState {
  'worklet';
  return { scene: 'generic', candidate: 'generic', candidateSinceMs: 0 };
}

export function arbitrate(state: ArbitrationState, signals: SceneSignals, nowMs: number): ArbitrationState {
  'worklet';
  const desired: Scene =
    signals.faceArea > FACE_DOMINANT_AREA ? 'portrait' : signals.salientFresh ? 'food' : 'generic';

  if (desired === state.scene) {
    return state.candidate === state.scene
      ? state
      : { scene: state.scene, candidate: state.scene, candidateSinceMs: nowMs };
  }

  if (desired !== state.candidate) {
    return { scene: state.scene, candidate: desired, candidateSinceMs: nowMs };
  }

  const dwell = desired === 'generic' ? SCENE_EXIT_MS : SCENE_ENTER_MS;
  if (nowMs - state.candidateSinceMs >= dwell) {
    return { scene: desired, candidate: desired, candidateSinceMs: nowMs };
  }
  return state;
}

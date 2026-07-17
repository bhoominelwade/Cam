import type { Nudge } from '@cam/composition-engine';
import { useMemo } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import type { Scene } from './sceneArbitration';
import type { Rect } from './transforms';

/**
 * The ONE module where the fast plane and the slow plane meet (ADR-006).
 * Detection results and engine guidance are written to these shared values
 * from the frame-processor worklet and consumed by the Skia overlay on the
 * UI thread. They must never be copied into React state on the hot path.
 */
export interface DetectionBridge {
  /** Smoothed bounds of the tracked subject (face or dish), engine space. */
  subjectRect: SharedValue<Rect | null>;
  /** width / height of the frame in engine (display) orientation. */
  frameAspect: SharedValue<number>;
  /** Sensor→engine rotation for the ACTIVE camera (set on flip, ADR-006 slow→fast handoff). */
  rotation: SharedValue<0 | 90 | 180 | 270>;
  /** Whether the ACTIVE camera's preview is mirrored (front = true). */
  isMirrored: SharedValue<boolean>;
  /** Exponential moving average of detector runs per second (debug HUD). */
  detectionFps: SharedValue<number>;
  /** Timestamp (ms) of the last detector run — used for throttling. */
  lastRunAtMs: SharedValue<number>;
  /** Timestamp (ms) the subject was last seen — used for the lost timeout. */
  subjectSeenAtMs: SharedValue<number>;

  // --- salient-object signal (written from the object output, JS thread) ---
  /** Latest salient-subject bounds in engine space. */
  salientRect: SharedValue<Rect | null>;
  /** Timestamp (ms) the salient subject was last reported. */
  salientSeenAtMs: SharedValue<number>;

  // --- scene arbitration state (ARCH §3 state machine) ---
  scene: SharedValue<Scene>;
  sceneCandidate: SharedValue<Scene>;
  sceneCandidateSinceMs: SharedValue<number>;

  // --- engine guidance ---
  /** Composition score 0–100 from the engine. */
  score: SharedValue<number>;
  /** True when the shot is worth celebrating (green moment). */
  celebrate: SharedValue<boolean>;
  /** The single displayed nudge (hysteresis applied); null = no cue. */
  nudge: SharedValue<Nudge | null>;
  /** Worded cue (closer/back/tilt) for the hint chip; null = none. */
  hint: SharedValue<Nudge | null>;
  /** Timestamp (ms) the displayed nudge last changed — dwell-time gate. */
  nudgeChangedAtMs: SharedValue<number>;
  /** Target zone rect in engine space; null when not coaching. */
  targetZone: SharedValue<Rect | null>;
}

export function useDetectionBridge(): DetectionBridge {
  const subjectRect = useSharedValue<Rect | null>(null);
  const frameAspect = useSharedValue(3 / 4);
  const rotation = useSharedValue<0 | 90 | 180 | 270>(90);
  const isMirrored = useSharedValue(true);
  const detectionFps = useSharedValue(0);
  const lastRunAtMs = useSharedValue(0);
  const subjectSeenAtMs = useSharedValue(0);
  const salientRect = useSharedValue<Rect | null>(null);
  const salientSeenAtMs = useSharedValue(0);
  const scene = useSharedValue<Scene>('generic');
  const sceneCandidate = useSharedValue<Scene>('generic');
  const sceneCandidateSinceMs = useSharedValue(0);
  const score = useSharedValue(0);
  const celebrate = useSharedValue(false);
  const nudge = useSharedValue<Nudge | null>(null);
  const hint = useSharedValue<Nudge | null>(null);
  const nudgeChangedAtMs = useSharedValue(0);
  const targetZone = useSharedValue<Rect | null>(null);

  return useMemo(
    () => ({
      subjectRect,
      frameAspect,
      rotation,
      isMirrored,
      detectionFps,
      lastRunAtMs,
      subjectSeenAtMs,
      salientRect,
      salientSeenAtMs,
      scene,
      sceneCandidate,
      sceneCandidateSinceMs,
      score,
      celebrate,
      nudge,
      hint,
      nudgeChangedAtMs,
      targetZone,
    }),
    [subjectRect, frameAspect, rotation, isMirrored, detectionFps, lastRunAtMs, subjectSeenAtMs, salientRect, salientSeenAtMs, scene, sceneCandidate, sceneCandidateSinceMs, score, celebrate, nudge, hint, nudgeChangedAtMs, targetZone],
  );
}

import type { Nudge } from '@cam/composition-engine';
import { useMemo } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import type { Rect } from './transforms';

/**
 * The ONE module where the fast plane and the slow plane meet (ADR-006).
 * Detection results and engine guidance are written to these shared values
 * from the frame-processor worklet and consumed by the Skia overlay on the
 * UI thread. They must never be copied into React state on the hot path.
 */
export interface DetectionBridge {
  /** Smoothed face bounds in engine space; null when no face is tracked. */
  faceRect: SharedValue<Rect | null>;
  /** width / height of the frame in engine (display) orientation. */
  frameAspect: SharedValue<number>;
  /** Exponential moving average of detector runs per second (debug HUD). */
  detectionFps: SharedValue<number>;
  /** Timestamp (ms) of the last detector run — used for throttling. */
  lastRunAtMs: SharedValue<number>;
  /** Timestamp (ms) a face was last seen — used for the lost-face timeout. */
  faceSeenAtMs: SharedValue<number>;

  // --- engine guidance (S2) ---
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
  const faceRect = useSharedValue<Rect | null>(null);
  const frameAspect = useSharedValue(3 / 4);
  const detectionFps = useSharedValue(0);
  const lastRunAtMs = useSharedValue(0);
  const faceSeenAtMs = useSharedValue(0);
  const score = useSharedValue(0);
  const celebrate = useSharedValue(false);
  const nudge = useSharedValue<Nudge | null>(null);
  const hint = useSharedValue<Nudge | null>(null);
  const nudgeChangedAtMs = useSharedValue(0);
  const targetZone = useSharedValue<Rect | null>(null);

  return useMemo(
    () => ({
      faceRect,
      frameAspect,
      detectionFps,
      lastRunAtMs,
      faceSeenAtMs,
      score,
      celebrate,
      nudge,
      hint,
      nudgeChangedAtMs,
      targetZone,
    }),
    [faceRect, frameAspect, detectionFps, lastRunAtMs, faceSeenAtMs, score, celebrate, nudge, hint, nudgeChangedAtMs, targetZone],
  );
}

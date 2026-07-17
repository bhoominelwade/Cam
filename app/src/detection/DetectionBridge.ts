import { useMemo } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import type { Rect } from './transforms';

/**
 * The ONE module where the fast plane and the slow plane meet (ADR-006).
 * Detection results are written to these shared values from the frame-processor
 * worklet and consumed by the Skia overlay on the UI thread. They must never
 * be copied into React state on the hot path.
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
}

export function useDetectionBridge(): DetectionBridge {
  const faceRect = useSharedValue<Rect | null>(null);
  const frameAspect = useSharedValue(3 / 4);
  const detectionFps = useSharedValue(0);
  const lastRunAtMs = useSharedValue(0);
  const faceSeenAtMs = useSharedValue(0);

  return useMemo(
    () => ({ faceRect, frameAspect, detectionFps, lastRunAtMs, faceSeenAtMs }),
    [faceRect, frameAspect, detectionFps, lastRunAtMs, faceSeenAtMs],
  );
}

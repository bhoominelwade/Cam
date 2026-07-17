import type { Face } from 'react-native-vision-camera-face-detector';
import {
  FACE_LOST_TIMEOUT_MS,
  FRAME_ROTATION_PORTRAIT,
  FRONT_PREVIEW_MIRRORED,
  SMOOTHING_ALPHA,
} from './constants';
import type { DetectionBridge } from './DetectionBridge';
import { frameToEngine } from './transforms';

/**
 * Runs on the frame-processor thread. Takes raw detector output, normalizes
 * the dominant face into engine space, applies low-pass smoothing, and writes
 * the result to the DetectionBridge shared values. React is not involved.
 */
export function processFaces(
  faces: Face[],
  frameWidth: number,
  frameHeight: number,
  nowMs: number,
  bridge: DetectionBridge,
): void {
  'worklet';

  // Detector cadence for the debug HUD (EMA over instantaneous rate).
  const prevRun = bridge.lastRunAtMs.value;
  if (prevRun > 0) {
    const instantFps = 1000 / Math.max(1, nowMs - prevRun);
    bridge.detectionFps.value = bridge.detectionFps.value * 0.8 + instantFps * 0.2;
  }
  bridge.lastRunAtMs.value = nowMs;

  const rotated = FRAME_ROTATION_PORTRAIT === 90 || FRAME_ROTATION_PORTRAIT === 270;
  bridge.frameAspect.value = rotated ? frameHeight / frameWidth : frameWidth / frameHeight;

  // Track the dominant (largest) face only — S1 scope.
  let best: Face | null = null;
  let bestArea = 0;
  for (const face of faces) {
    const area = face.bounds.width * face.bounds.height;
    if (area > bestArea) {
      bestArea = area;
      best = face;
    }
  }

  if (best == null) {
    // Debounce detector flicker: hold the last box briefly, then drop it.
    if (bridge.faceRect.value != null && nowMs - bridge.faceSeenAtMs.value > FACE_LOST_TIMEOUT_MS) {
      bridge.faceRect.value = null;
    }
    return;
  }

  bridge.faceSeenAtMs.value = nowMs;
  const target = frameToEngine(best.bounds, {
    width: frameWidth,
    height: frameHeight,
    rotation: FRAME_ROTATION_PORTRAIT,
    mirrored: FRONT_PREVIEW_MIRRORED,
  });

  const prev = bridge.faceRect.value;
  if (prev == null) {
    bridge.faceRect.value = target;
  } else {
    const a = SMOOTHING_ALPHA;
    bridge.faceRect.value = {
      x: prev.x + (target.x - prev.x) * a,
      y: prev.y + (target.y - prev.y) * a,
      width: prev.width + (target.width - prev.width) * a,
      height: prev.height + (target.height - prev.height) * a,
    };
  }
}

import { computeGuidance, type SceneInput } from '@cam/composition-engine';
import type { Face } from 'react-native-vision-camera-face-detector';
import {
  FACE_LOST_TIMEOUT_MS,
  FRAME_ROTATION_PORTRAIT,
  FRONT_PREVIEW_MIRRORED,
  NUDGE_DWELL_MS,
  SMOOTHING_ALPHA,
} from './constants';
import type { DetectionBridge } from './DetectionBridge';
import { frameToEngine } from './transforms';

/**
 * Runs on the frame-processor thread. Takes raw detector output, normalizes
 * the dominant face into engine space, applies low-pass smoothing, runs the
 * composition engine, and writes everything to the DetectionBridge shared
 * values. React is not involved.
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

  // Track the dominant (largest) face only — MVP scope.
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
    // Debounce detector flicker: hold the last state briefly, then drop it.
    if (bridge.faceRect.value != null && nowMs - bridge.faceSeenAtMs.value > FACE_LOST_TIMEOUT_MS) {
      bridge.faceRect.value = null;
      bridge.targetZone.value = null;
      bridge.nudge.value = null;
      bridge.score.value = 0;
      bridge.celebrate.value = false;
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
  const smoothed =
    prev == null
      ? target
      : {
          x: prev.x + (target.x - prev.x) * SMOOTHING_ALPHA,
          y: prev.y + (target.y - prev.y) * SMOOTHING_ALPHA,
          width: prev.width + (target.width - prev.width) * SMOOTHING_ALPHA,
          height: prev.height + (target.height - prev.height) * SMOOTHING_ALPHA,
        };
  bridge.faceRect.value = smoothed;

  // --- composition engine (pure, mirror-agnostic by construction) ---
  const input: SceneInput = {
    sceneType: 'portrait',
    subjects: [{ kind: 'face', boundingBox: smoothed }],
    frameAspect: bridge.frameAspect.value,
  };
  const guidance = computeGuidance(input);

  // EMA on the displayed score so the number glides instead of jittering
  // with per-frame detector noise. Celebrate stays computed from raw score.
  bridge.score.value = Math.round(bridge.score.value * 0.6 + guidance.score * 0.4);
  bridge.celebrate.value = guidance.celebrate;

  const zone = guidance.guides.find((g) => g.kind === 'targetZone');
  bridge.targetZone.value = zone?.region ?? null;

  // Nudge hysteresis (ARCH §4): a displayed cue must dwell ≥ NUDGE_DWELL_MS
  // before it can switch or disappear — prevents cue-flapping.
  const nextNudge = guidance.nudges.length > 0 ? guidance.nudges[0]! : null;
  const current = bridge.nudge.value;
  const dwellOver = nowMs - bridge.nudgeChangedAtMs.value >= NUDGE_DWELL_MS;
  if (current == null && nextNudge != null) {
    bridge.nudge.value = nextNudge;
    bridge.nudgeChangedAtMs.value = nowMs;
  } else if (current != null && nextNudge == null) {
    if (dwellOver) {
      bridge.nudge.value = null;
      bridge.nudgeChangedAtMs.value = nowMs;
    }
  } else if (current != null && nextNudge != null) {
    if (current.direction === nextNudge.direction) {
      bridge.nudge.value = nextNudge; // same cue, fresher strength — no dwell reset
    } else if (dwellOver) {
      bridge.nudge.value = nextNudge;
      bridge.nudgeChangedAtMs.value = nowMs;
    }
  }
}

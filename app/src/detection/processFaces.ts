import { computeGuidance, type SceneInput, type Subject } from '@cam/composition-engine';
import type { Face } from 'react-native-vision-camera-face-detector';
import {
  ANGLE_SIGN,
  FACE_LOST_TIMEOUT_MS,
  NUDGE_DWELL_MS,
  SALIENT_FRESH_MS,
  SMOOTHING_ALPHA,
} from './constants';
import type { DetectionBridge } from './DetectionBridge';
import { arbitrate } from './sceneArbitration';
import { anglesToEngine, frameToEngine, type Rect } from './transforms';

/**
 * Runs on the frame-processor thread every detector tick. Normalizes the
 * dominant face, arbitrates the scene (faces vs. the salient dish reported
 * by the object output), runs the composition engine on the winning subject,
 * and writes everything to the DetectionBridge shared values. React is not
 * involved.
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

  const rotation = bridge.rotation.value;
  const mirrored = bridge.isMirrored.value;
  const rotated = rotation === 90 || rotation === 270;
  bridge.frameAspect.value = rotated ? frameHeight / frameWidth : frameWidth / frameHeight;

  // Dominant (largest) face, normalized to engine space.
  let best: Face | null = null;
  let bestArea = 0;
  for (const face of faces) {
    const area = face.bounds.width * face.bounds.height;
    if (area > bestArea) {
      bestArea = area;
      best = face;
    }
  }
  const faceTarget =
    best == null
      ? null
      : frameToEngine(best.bounds, { width: frameWidth, height: frameHeight, rotation, mirrored });

  // --- scene arbitration (ARCH §3) ---
  const salientFresh = nowMs - bridge.salientSeenAtMs.value < SALIENT_FRESH_MS;
  const st = arbitrate(
    {
      scene: bridge.scene.value,
      candidate: bridge.sceneCandidate.value,
      candidateSinceMs: bridge.sceneCandidateSinceMs.value,
    },
    {
      faceArea: faceTarget == null ? 0 : faceTarget.width * faceTarget.height,
      salientFresh,
    },
    nowMs,
  );
  bridge.scene.value = st.scene;
  bridge.sceneCandidate.value = st.candidate;
  bridge.sceneCandidateSinceMs.value = st.candidateSinceMs;

  // --- pick the subject the winning scene coaches ---
  let target: Rect | null = null;
  if (st.scene === 'portrait') {
    target = faceTarget;
  } else if (st.scene === 'food') {
    target = salientFresh ? bridge.salientRect.value : null;
  }

  if (target == null) {
    // Debounce detector flicker: hold the last state briefly, then drop it.
    if (bridge.subjectRect.value != null && nowMs - bridge.subjectSeenAtMs.value > FACE_LOST_TIMEOUT_MS) {
      bridge.subjectRect.value = null;
      bridge.targetZone.value = null;
      bridge.nudge.value = null;
      bridge.hint.value = null;
      bridge.score.value = 0;
      bridge.celebrate.value = false;
    }
    return;
  }

  bridge.subjectSeenAtMs.value = nowMs;
  const prev = bridge.subjectRect.value;
  const a = SMOOTHING_ALPHA;
  const smoothed =
    prev == null
      ? target
      : {
          x: prev.x + (target.x - prev.x) * a,
          y: prev.y + (target.y - prev.y) * a,
          width: prev.width + (target.width - prev.width) * a,
          height: prev.height + (target.height - prev.height) * a,
        };
  bridge.subjectRect.value = smoothed;

  // --- composition engine (pure, mirror-agnostic by construction) ---
  let subject: Subject;
  if (st.scene === 'portrait' && best != null) {
    const angles = anglesToEngine(
      { pitch: best.pitchAngle, roll: best.rollAngle, yaw: best.yawAngle },
      mirrored,
      ANGLE_SIGN,
    );
    subject = { kind: 'face', boundingBox: smoothed, angles };
  } else {
    subject = { kind: 'food', boundingBox: smoothed };
  }
  const input: SceneInput = {
    sceneType: st.scene,
    subjects: [subject],
    frameAspect: bridge.frameAspect.value,
  };
  const guidance = computeGuidance(input);

  // EMA on the displayed score so the number glides instead of jittering
  // with per-frame detector noise. Celebrate stays computed from raw score.
  bridge.score.value = Math.round(bridge.score.value * 0.6 + guidance.score * 0.4);
  bridge.celebrate.value = guidance.celebrate;

  const zone = guidance.guides.find((g) => g.kind === 'targetZone');
  bridge.targetZone.value = zone?.region ?? null;

  // Worded cue (closer/back/tilt) for the hint chip — may be the second nudge.
  bridge.hint.value =
    guidance.nudges.find(
      (n) => n.direction === 'closer' || n.direction === 'back' || n.direction === 'tiltLeft' || n.direction === 'tiltRight',
    ) ?? null;

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

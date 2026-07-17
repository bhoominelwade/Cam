/**
 * The engine contract — the load-bearing wall of the codebase (ARCH §3).
 *
 * Detection adapters produce `SceneInput`; the overlay renders `Guidance`.
 * Neither side knows the other exists. All geometry is normalized 0–1 in
 * engine space: orientation-corrected and mirror-corrected (ARCH §4), so
 * every rule in this package is mirror-agnostic by construction.
 *
 * This interface is versioned. Breaking changes bump ENGINE_CONTRACT_VERSION
 * and require a same-commit update to the adapters and the overlay.
 */

export const ENGINE_CONTRACT_VERSION = 1;

export type SceneType = 'portrait' | 'food' | 'generic';

/** A point in engine space. Both axes in [0, 1]. */
export interface NormalizedPoint {
  x: number;
  y: number;
}

/** An axis-aligned box in engine space. All fields in [0, 1]. */
export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type SubjectKind = 'face' | 'food' | 'object';

/** One detected subject, already normalized by a detection adapter. */
export interface Subject {
  kind: SubjectKind;
  boundingBox: NormalizedRect;
  /** Detector confidence in [0, 1], if the detector provides one. */
  confidence?: number;
}

/** Everything the engine is allowed to know about a frame. */
export interface SceneInput {
  sceneType: SceneType;
  subjects: Subject[];
  /** Horizon roll angle in degrees, if available. 0 = level, positive = clockwise. */
  horizon?: number;
  /** Frame aspect ratio as width / height in engine space. */
  frameAspect: number;
}

export type GuideKind = 'thirdsGrid' | 'targetZone' | 'levelLine';

/** One visual guide for the overlay to draw. Geometry meaning depends on kind. */
export interface Guide {
  kind: GuideKind;
  /** Region the guide anchors to (e.g. the target zone rect). Omitted for full-frame guides. */
  region?: NormalizedRect;
  /** Emphasis in [0, 1]; the overlay maps this to opacity/weight. */
  emphasis: number;
}

export type NudgeDirection = 'left' | 'right' | 'up' | 'down' | 'closer' | 'back' | 'tiltLeft' | 'tiltRight';

/** One actionable coaching cue. The overlay shows at most two (Spec). */
export interface Nudge {
  direction: NudgeDirection;
  /** Strength in [0, 1]; drives arrow size/urgency. */
  strength: number;
}

/** The engine's complete answer for one frame. */
export interface Guidance {
  guides: Guide[];
  /** Composition score in [0, 100]. */
  score: number;
  /** At most two, by contract — enforced by assertGuidanceInvariants. */
  nudges: Nudge[];
  /** True when the shot is good enough to celebrate (green moment). */
  celebrate: boolean;
}

import type { Guidance, SceneInput } from '../types';

/**
 * A scene rule turns a SceneInput into Guidance. Rules are pluggable modules
 * (ADR-007): portrait and food ship in MVP, pose lands in v1.1 without
 * touching core code. Every rule must be a pure worklet-safe function that
 * never throws on valid input.
 */
export type SceneRule = (input: SceneInput) => Guidance;

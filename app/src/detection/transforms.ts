/**
 * The ONLY place coordinates convert (ARCH §4). Three spaces exist:
 *  - sensor frame: raw detector output, sensor-oriented pixels
 *  - engine space: normalized 0–1, orientation- and mirror-corrected
 *  - screen space: pixels, after the preview's aspect-fill crop/scale
 *
 * `frameToEngine` and `engineToScreen` are pure worklet-safe functions,
 * property-tested in __tests__/transforms.test.ts. Everything downstream
 * (engine rules, overlay) is mirror- and orientation-agnostic because of them.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FrameSpace {
  /** Sensor frame size in pixels, as delivered by the detector. */
  width: number;
  height: number;
  /** Clockwise rotation (deg) that maps sensor space onto engine space. */
  rotation: 0 | 90 | 180 | 270;
  /** True when the preview the user sees is mirrored (front camera). */
  mirrored: boolean;
}

export interface ScreenSpace {
  /** Overlay canvas size in pixels. */
  width: number;
  height: number;
}

function clamp01(n: number): number {
  'worklet';
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/** Sensor-frame pixel rect → engine space. */
export function frameToEngine(bounds: Rect, frame: FrameSpace): Rect {
  'worklet';
  // 1. Normalize in sensor orientation.
  let x = bounds.x / frame.width;
  let y = bounds.y / frame.height;
  let w = bounds.width / frame.width;
  let h = bounds.height / frame.height;

  // 2. Rotate into engine (display) orientation.
  if (frame.rotation === 90) {
    const nx = 1 - (y + h);
    const ny = x;
    x = nx; y = ny; [w, h] = [h, w];
  } else if (frame.rotation === 180) {
    x = 1 - (x + w);
    y = 1 - (y + h);
  } else if (frame.rotation === 270) {
    const nx = y;
    const ny = 1 - (x + w);
    x = nx; y = ny; [w, h] = [h, w];
  }

  // 3. Mirror-correct so engine space always matches what the user sees.
  if (frame.mirrored) {
    x = 1 - (x + w);
  }

  const cx = clamp01(x);
  const cy = clamp01(y);
  return { x: cx, y: cy, width: clamp01(x + w) - cx, height: clamp01(y + h) - cy };
}

/**
 * Engine space → overlay pixels, under an aspect-fill ("cover") preview:
 * the frame is scaled up until it covers the screen and the overflow is
 * cropped symmetrically.
 *
 * @param frameAspect width / height of the frame in engine orientation.
 */
export function engineToScreen(rect: Rect, frameAspect: number, screen: ScreenSpace): Rect {
  'worklet';
  const scale = Math.max(screen.height, screen.width / frameAspect);
  const dispW = frameAspect * scale;
  const dispH = scale;
  const offX = (screen.width - dispW) / 2;
  const offY = (screen.height - dispH) / 2;
  return {
    x: offX + rect.x * dispW,
    y: offY + rect.y * dispH,
    width: rect.width * dispW,
    height: rect.height * dispH,
  };
}

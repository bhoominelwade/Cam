import { Canvas, Line, Path, RoundedRect, vec } from '@shopify/react-native-skia';
import { StyleSheet } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';
import type { DetectionBridge } from '../detection/DetectionBridge';
import { engineToScreen, type Rect } from '../detection/transforms';

/**
 * Design language: iPhone-camera-native + liquid glass. Hairline grid, soft
 * rounded corner brackets on the face (white; iOS green on celebrate), a
 * barely-there glass target zone, one thin iOS-yellow chevron.
 *
 * All guides draw on the GPU via Skia (ADR-005); geometry flows from the
 * DetectionBridge shared values through useDerivedValue — no React re-renders
 * at detection frequency.
 */

const GRID_COLOR = 'rgba(255, 255, 255, 0.16)';
const BRACKET_COLOR = 'rgba(255, 255, 255, 0.92)';
const BRACKET_NICE_COLOR = 'rgba(48, 209, 88, 0.95)';
const ZONE_FILL = 'rgba(255, 255, 255, 0.045)';
const ZONE_STROKE = 'rgba(255, 255, 255, 0.22)';
const ARROW_COLOR = 'rgba(255, 214, 10, 0.95)';

interface Props {
  bridge: DetectionBridge;
  width: number;
  height: number;
}

/** iOS-focus-style rounded corner brackets. */
function bracketPath(r: Rect): string {
  'worklet';
  const { x, y, width: w, height: h } = r;
  const len = Math.min(w, h) * 0.24;
  const rad = Math.min(14, len * 0.6);
  const x2 = x + w;
  const y2 = y + h;
  return (
    `M ${x} ${y + len} L ${x} ${y + rad} Q ${x} ${y} ${x + rad} ${y} L ${x + len} ${y} ` +
    `M ${x2 - len} ${y} L ${x2 - rad} ${y} Q ${x2} ${y} ${x2} ${y + rad} L ${x2} ${y + len} ` +
    `M ${x2} ${y2 - len} L ${x2} ${y2 - rad} Q ${x2} ${y2} ${x2 - rad} ${y2} L ${x2 - len} ${y2} ` +
    `M ${x + len} ${y2} L ${x + rad} ${y2} Q ${x} ${y2} ${x} ${y2 - rad} L ${x} ${y2 - len}`
  );
}

export function OverlayCanvas({ bridge, width, height }: Props) {
  const screen = { width, height };

  const box = useDerivedValue(() => {
    const r = bridge.faceRect.value;
    if (r == null) return { x: 0, y: 0, width: 0, height: 0 };
    return engineToScreen(r, bridge.frameAspect.value, screen);
  });
  const bracket = useDerivedValue(() =>
    bridge.faceRect.value == null ? '' : bracketPath(box.value),
  );
  const bracketOpacity = useDerivedValue(() => (bridge.faceRect.value == null ? 0 : 1));
  const bracketColor = useDerivedValue(() =>
    bridge.celebrate.value ? BRACKET_NICE_COLOR : BRACKET_COLOR,
  );

  const zone = useDerivedValue(() => {
    const r = bridge.targetZone.value;
    if (r == null) return { x: 0, y: 0, width: 0, height: 0 };
    return engineToScreen(r, bridge.frameAspect.value, screen);
  });
  const zoneX = useDerivedValue(() => zone.value.x);
  const zoneY = useDerivedValue(() => zone.value.y);
  const zoneW = useDerivedValue(() => zone.value.width);
  const zoneH = useDerivedValue(() => zone.value.height);
  const zoneOpacity = useDerivedValue(() =>
    bridge.targetZone.value == null || bridge.celebrate.value ? 0 : 1,
  );

  const arrowPath = useDerivedValue(() => {
    const n = bridge.nudge.value;
    const b = box.value;
    if (n == null || b.width === 0) return '';
    const size = 11 + 10 * n.strength;
    const gap = 16;
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    if (n.direction === 'left') {
      const x = b.x - gap;
      return `M ${x} ${cy - size} L ${x - size} ${cy} L ${x} ${cy + size}`;
    }
    if (n.direction === 'right') {
      const x = b.x + b.width + gap;
      return `M ${x} ${cy - size} L ${x + size} ${cy} L ${x} ${cy + size}`;
    }
    if (n.direction === 'up') {
      const y = b.y - gap;
      return `M ${cx - size} ${y} L ${cx} ${y - size} L ${cx + size} ${y}`;
    }
    if (n.direction === 'down') {
      const y = b.y + b.height + gap;
      return `M ${cx - size} ${y} L ${cx} ${y + size} L ${cx + size} ${y}`;
    }
    return '';
  });
  const arrowOpacity = useDerivedValue(() => (arrowPath.value === '' ? 0 : 1));

  const w3 = width / 3;
  const h3 = height / 3;

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Line p1={vec(w3, 0)} p2={vec(w3, height)} color={GRID_COLOR} strokeWidth={0.75} />
      <Line p1={vec(2 * w3, 0)} p2={vec(2 * w3, height)} color={GRID_COLOR} strokeWidth={0.75} />
      <Line p1={vec(0, h3)} p2={vec(width, h3)} color={GRID_COLOR} strokeWidth={0.75} />
      <Line p1={vec(0, 2 * h3)} p2={vec(width, 2 * h3)} color={GRID_COLOR} strokeWidth={0.75} />
      <RoundedRect
        x={zoneX}
        y={zoneY}
        width={zoneW}
        height={zoneH}
        r={22}
        color={ZONE_FILL}
        opacity={zoneOpacity}
      />
      <RoundedRect
        x={zoneX}
        y={zoneY}
        width={zoneW}
        height={zoneH}
        r={22}
        color={ZONE_STROKE}
        style="stroke"
        strokeWidth={1}
        opacity={zoneOpacity}
      />
      <Path
        path={bracket}
        color={bracketColor}
        style="stroke"
        strokeWidth={2}
        strokeCap="round"
        opacity={bracketOpacity}
      />
      <Path
        path={arrowPath}
        color={ARROW_COLOR}
        style="stroke"
        strokeWidth={3}
        strokeCap="round"
        strokeJoin="round"
        opacity={arrowOpacity}
      />
    </Canvas>
  );
}

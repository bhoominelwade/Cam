import { Canvas, Line, Path, Rect as SkiaRect, RoundedRect, vec } from '@shopify/react-native-skia';
import { StyleSheet } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';
import type { DetectionBridge } from '../detection/DetectionBridge';
import { engineToScreen } from '../detection/transforms';

const GRID_COLOR = 'rgba(255, 255, 255, 0.35)';
const BOX_COLOR = 'rgba(124, 252, 0, 0.9)';
const ZONE_COLOR = 'rgba(255, 255, 255, 0.7)';
const ARROW_COLOR = 'rgba(255, 214, 10, 0.95)';

interface Props {
  bridge: DetectionBridge;
  width: number;
  height: number;
}

/**
 * All guides draw on the GPU via Skia (ADR-005). Geometry comes straight from
 * the DetectionBridge shared values through useDerivedValue — no React
 * re-renders at detection frequency.
 */
export function OverlayCanvas({ bridge, width, height }: Props) {
  const screen = { width, height };

  const box = useDerivedValue(() => {
    const r = bridge.faceRect.value;
    if (r == null) return { x: 0, y: 0, width: 0, height: 0 };
    return engineToScreen(r, bridge.frameAspect.value, screen);
  });
  const boxX = useDerivedValue(() => box.value.x);
  const boxY = useDerivedValue(() => box.value.y);
  const boxW = useDerivedValue(() => box.value.width);
  const boxH = useDerivedValue(() => box.value.height);
  const boxOpacity = useDerivedValue(() => (bridge.faceRect.value == null ? 0 : 1));

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
    bridge.targetZone.value == null || bridge.celebrate.value ? 0 : 0.8,
  );

  // Directional nudge arrow: a chevron beside the face box, pointing where to
  // move the face. closer/back cues are worded in the ScoreBadge instead.
  const arrowPath = useDerivedValue(() => {
    const n = bridge.nudge.value;
    const b = box.value;
    if (n == null || b.width === 0) return '';
    const size = 18 + 18 * n.strength;
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    const gap = 24;
    if (n.direction === 'left') {
      const x = b.x - gap;
      return `M ${x} ${cy - size / 2} L ${x - size} ${cy} L ${x} ${cy + size / 2}`;
    }
    if (n.direction === 'right') {
      const x = b.x + b.width + gap;
      return `M ${x} ${cy - size / 2} L ${x + size} ${cy} L ${x} ${cy + size / 2}`;
    }
    if (n.direction === 'up') {
      const y = b.y - gap;
      return `M ${cx - size / 2} ${y} L ${cx} ${y - size} L ${cx + size / 2} ${y}`;
    }
    if (n.direction === 'down') {
      const y = b.y + b.height + gap;
      return `M ${cx - size / 2} ${y} L ${cx} ${y + size} L ${cx + size / 2} ${y}`;
    }
    return '';
  });
  const arrowOpacity = useDerivedValue(() => (arrowPath.value === '' ? 0 : 1));

  const w3 = width / 3;
  const h3 = height / 3;

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Line p1={vec(w3, 0)} p2={vec(w3, height)} color={GRID_COLOR} strokeWidth={1} />
      <Line p1={vec(2 * w3, 0)} p2={vec(2 * w3, height)} color={GRID_COLOR} strokeWidth={1} />
      <Line p1={vec(0, h3)} p2={vec(width, h3)} color={GRID_COLOR} strokeWidth={1} />
      <Line p1={vec(0, 2 * h3)} p2={vec(width, 2 * h3)} color={GRID_COLOR} strokeWidth={1} />
      <RoundedRect
        x={zoneX}
        y={zoneY}
        width={zoneW}
        height={zoneH}
        r={16}
        color={ZONE_COLOR}
        style="stroke"
        strokeWidth={1.5}
        opacity={zoneOpacity}
      />
      <SkiaRect
        x={boxX}
        y={boxY}
        width={boxW}
        height={boxH}
        color={BOX_COLOR}
        style="stroke"
        strokeWidth={2}
        opacity={boxOpacity}
      />
      <Path
        path={arrowPath}
        color={ARROW_COLOR}
        style="stroke"
        strokeWidth={5}
        strokeCap="round"
        strokeJoin="round"
        opacity={arrowOpacity}
      />
    </Canvas>
  );
}

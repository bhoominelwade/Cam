import { Canvas, Line, Rect as SkiaRect, vec } from '@shopify/react-native-skia';
import { StyleSheet } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';
import type { DetectionBridge } from '../detection/DetectionBridge';
import { engineToScreen } from '../detection/transforms';

const GRID_COLOR = 'rgba(255, 255, 255, 0.35)';
const BOX_COLOR = 'rgba(124, 252, 0, 0.9)';

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

  const w3 = width / 3;
  const h3 = height / 3;

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Line p1={vec(w3, 0)} p2={vec(w3, height)} color={GRID_COLOR} strokeWidth={1} />
      <Line p1={vec(2 * w3, 0)} p2={vec(2 * w3, height)} color={GRID_COLOR} strokeWidth={1} />
      <Line p1={vec(0, h3)} p2={vec(width, h3)} color={GRID_COLOR} strokeWidth={1} />
      <Line p1={vec(0, 2 * h3)} p2={vec(width, 2 * h3)} color={GRID_COLOR} strokeWidth={1} />
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
    </Canvas>
  );
}

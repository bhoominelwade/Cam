import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { DetectionBridge } from '../detection/DetectionBridge';

/**
 * Dev-builds-only HUD (ARCH §5): live detection cadence so every session sees
 * the numbers. Polls the shared value at 2 Hz on the JS thread — deliberately
 * off the hot path.
 */
export function DebugHud({ bridge }: { bridge: DetectionBridge }) {
  const [fps, setFps] = useState(0);
  const [tracking, setTracking] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setFps(Math.round(bridge.detectionFps.value));
      setTracking(bridge.faceRect.value != null);
    }, 500);
    return () => clearInterval(id);
  }, [bridge]);

  if (!__DEV__) return null;

  return (
    <View style={styles.hud} pointerEvents="none">
      <Text style={styles.text}>
        det {fps}/s {tracking ? '· face' : '· —'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hud: {
    position: 'absolute',
    top: 60,
    right: 12,
    backgroundColor: 'rgba(80,80,85,0.32)',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  text: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.3,
    fontVariant: ['tabular-nums'],
  },
});

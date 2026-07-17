import { BlurView } from 'expo-blur';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { DetectionBridge } from '../detection/DetectionBridge';

/**
 * Liquid-glass score capsule: real blur behind a translucent pill, a status
 * dot that lights iOS-green on a great shot, and a small glass hint chip for
 * closer/back cues. Polls the bridge at 4 Hz on the JS thread — deliberately
 * off the hot path (ADR-006); the Skia guides carry the full frame rate.
 */
export function ScoreBadge({ bridge }: { bridge: DetectionBridge }) {
  const [score, setScore] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
  const [sizeHint, setSizeHint] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(bridge.subjectRect.value != null);
      setScore(bridge.score.value);
      setCelebrate(bridge.celebrate.value);
      const n = bridge.hint.value;
      const food = bridge.scene.value === 'food';
      setSizeHint(
        n?.direction === 'closer' ? 'move closer'
        : n?.direction === 'back' ? 'step back'
        : n?.direction === 'tiltLeft' ? (food ? 'level the phone' : 'tilt head left')
        : n?.direction === 'tiltRight' ? (food ? 'level the phone' : 'tilt head right')
        : null,
      );
    }, 250);
    return () => clearInterval(id);
  }, [bridge]);

  if (!visible) return null;

  return (
    <View style={styles.wrap} pointerEvents="none">
      <BlurView intensity={40} tint="dark" style={[styles.pill, celebrate && styles.pillNice]}>
        <View style={[styles.dot, celebrate && styles.dotNice]} />
        <Text style={styles.score}>{score}</Text>
      </BlurView>
      {sizeHint ? (
        <BlurView intensity={40} tint="dark" style={styles.hintChip}>
          <Text style={styles.hint}>{sizeHint}</Text>
        </BlurView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 196,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
    overflow: 'hidden',
    backgroundColor: 'rgba(80,80,85,0.32)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  pillNice: {
    backgroundColor: 'rgba(48,209,88,0.30)',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotNice: {
    backgroundColor: '#30D158',
    shadowColor: '#30D158',
    shadowOpacity: 0.9,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  score: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '600',
    letterSpacing: -0.2,
    fontVariant: ['tabular-nums'],
    minWidth: 26,
    textAlign: 'center',
  },
  hintChip: {
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 4,
    overflow: 'hidden',
    backgroundColor: 'rgba(80,80,85,0.32)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  hint: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 11,
    fontWeight: '500',
  },
});

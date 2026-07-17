import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { DetectionBridge } from '../detection/DetectionBridge';

/**
 * Live composition score. Polls the bridge at 4 Hz on the JS thread — a number
 * changing 4×/sec reads as live to a human without touching the hot path
 * (the Skia guides are the ones that must move at full rate, and do).
 */
export function ScoreBadge({ bridge }: { bridge: DetectionBridge }) {
  const [score, setScore] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
  const [sizeHint, setSizeHint] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(bridge.faceRect.value != null);
      setScore(bridge.score.value);
      setCelebrate(bridge.celebrate.value);
      const n = bridge.nudge.value;
      setSizeHint(n?.direction === 'closer' ? 'come closer' : n?.direction === 'back' ? 'step back' : null);
    }, 250);
    return () => clearInterval(id);
  }, [bridge]);

  if (!visible) return null;

  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={[styles.badge, celebrate && styles.badgeNice]}>
        <Text style={[styles.score, celebrate && styles.scoreNice]}>{score}</Text>
        {celebrate ? <Text style={styles.nice}>nice</Text> : null}
      </View>
      {sizeHint ? <Text style={styles.hint}>{sizeHint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  badgeNice: {
    backgroundColor: 'rgba(38, 130, 8, 0.75)',
  },
  score: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  scoreNice: {
    color: '#d8ffc4',
  },
  nice: {
    color: '#d8ffc4',
    fontSize: 15,
    fontWeight: '600',
  },
  hint: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    overflow: 'hidden',
  },
});

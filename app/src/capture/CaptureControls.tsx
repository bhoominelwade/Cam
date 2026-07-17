import { BlurView } from 'expo-blur';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type SceneMode = 'portrait' | 'food';

interface Props {
  onShutter: () => void;
  onFlip?: () => void;
  mode: SceneMode;
  disabled?: boolean;
}

/**
 * iPhone-camera-style bottom chrome in the liquid glass language:
 * mode labels (active in camera yellow), white shutter ring, glass flip
 * button. Slow plane only — plain React, event-driven.
 */
export function CaptureControls({ onShutter, onFlip, mode, disabled }: Props) {
  return (
    <View style={styles.chrome} pointerEvents="box-none">
      <View style={styles.modes}>
        <Text style={[styles.mode, mode === 'portrait' && styles.modeActive]}>PORTRAIT</Text>
        <Text style={[styles.mode, mode === 'food' && styles.modeActive]}>FOOD</Text>
      </View>
      <View style={styles.deck}>
        <View style={styles.thumb} />
        <Pressable
          onPress={onShutter}
          disabled={disabled}
          accessibilityLabel="Take photo"
          style={({ pressed }) => [styles.shutter, pressed && styles.shutterPressed]}
        >
          <View style={styles.shutterInner} />
        </Pressable>
        <Pressable onPress={onFlip} disabled={onFlip == null} accessibilityLabel="Flip camera">
          <BlurView intensity={40} tint="dark" style={styles.flip}>
            <Text style={styles.flipGlyph}>⟲</Text>
          </BlurView>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chrome: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 26,
    paddingBottom: 34,
    gap: 16,
  },
  modes: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  mode: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.4,
  },
  modeActive: {
    color: '#FFD60A',
  },
  deck: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  thumb: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: 'rgba(80,80,85,0.4)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  shutter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3.5,
    borderColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterPressed: {
    opacity: 0.7,
  },
  shutterInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fff',
  },
  flip: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    backgroundColor: 'rgba(80,80,85,0.32)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipGlyph: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 18,
    lineHeight: 20,
  },
});

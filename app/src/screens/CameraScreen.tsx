import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';

/**
 * S0: the viewfinder. Live preview, camera permission flow, designed denial
 * state (ARCH §5: no permission, no crash, ever). Detection, overlays, and
 * capture arrive in later slices.
 */
export function CameraScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const [isForeground, setIsForeground] = useState(true);

  // Re-check permission when returning from Settings.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      setIsForeground(state === 'active');
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!hasPermission) {
      void requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const openSettings = useCallback(() => {
    void Linking.openSettings();
  }, []);

  if (!hasPermission) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackTitle}>Cam needs the camera</Text>
        <Text style={styles.fallbackBody}>
          The viewfinder is the whole app — without camera access there is nothing to show.
          Everything stays on your phone: Cam makes no network calls, ever.
        </Text>
        <Pressable style={styles.settingsButton} onPress={openSettings}>
          <Text style={styles.settingsButtonText}>Open Settings</Text>
        </Pressable>
      </View>
    );
  }

  if (device == null) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackTitle}>No camera found</Text>
        <Text style={styles.fallbackBody}>
          This device doesn&apos;t report a back camera. Cam can&apos;t run here.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera style={StyleSheet.absoluteFill} device={device} isActive={isForeground} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  fallback: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  fallbackTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  fallbackBody: {
    color: '#bbb',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  settingsButton: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#fff',
  },
  settingsButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});

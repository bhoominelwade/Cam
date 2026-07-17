import { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import {
  Camera,
  useAsyncRunner,
  useCameraDevice,
  useCameraPermission,
  useFrameOutput,
} from 'react-native-vision-camera';
import { useFaceDetector } from 'react-native-vision-camera-face-detector';
import { DETECTION_INTERVAL_MS } from '../detection/constants';
import { useDetectionBridge } from '../detection/DetectionBridge';
import { processFaces } from '../detection/processFaces';
import { DebugHud } from '../overlay/DebugHud';
import { OverlayCanvas } from '../overlay/OverlayCanvas';
import { ScoreBadge } from '../overlay/ScoreBadge';

/**
 * S1: the spike. Front camera + face detection on the frame-processor thread,
 * thirds grid + smoothed tracking box drawn by Skia. The go/no-go question:
 * does this feel great while panning? (PLAN §4)
 */
export function CameraScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('front');
  const [isForeground, setIsForeground] = useState(true);
  const [layout, setLayout] = useState<{ width: number; height: number } | null>(null);

  const bridge = useDetectionBridge();
  // Don't destructure — Nitro hybrid objects lose their `this` binding.
  const faceDetector = useFaceDetector({ performanceMode: 'fast', cameraFacing: 'front' });
  const asyncRunner = useAsyncRunner();

  const frameOutput = useFrameOutput({
    enablePreviewSizedOutputBuffers: true,
    onFrame(frame) {
      'worklet';
      const now = Date.now();
      // Throttle to the 10–15/sec detection budget (ARCH §4).
      if (now - bridge.lastRunAtMs.value < DETECTION_INTERVAL_MS) {
        frame.dispose();
        return;
      }
      const wasHandled = asyncRunner.runAsync(() => {
        'worklet';
        const faces = faceDetector.detectFaces(frame);
        processFaces(faces, frame.width, frame.height, Date.now(), bridge);
        frame.dispose();
      });
      if (!wasHandled) {
        // Runner still busy with the previous frame — drop this one.
        frame.dispose();
      }
    },
  });

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

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setLayout({ width, height });
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
          This device doesn&apos;t report a front camera. Cam can&apos;t run here.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container} onLayout={onLayout}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isForeground}
        outputs={[frameOutput]}
      />
      {layout != null && (
        <OverlayCanvas bridge={bridge} width={layout.width} height={layout.height} />
      )}
      <ScoreBadge bridge={bridge} />
      <DebugHud bridge={bridge} />
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

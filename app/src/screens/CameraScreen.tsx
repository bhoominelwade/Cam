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
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import {
  Camera,
  useAsyncRunner,
  useCameraDevice,
  useCameraPermission,
  useFrameOutput,
  useObjectOutput,
} from 'react-native-vision-camera';
import { useFaceDetector } from 'react-native-vision-camera-face-detector';
import { BlurView } from 'expo-blur';
import { CaptureControls } from '../capture/CaptureControls';
import { useCapture } from '../capture/useCapture';
import { CAMERA_TUNING, DETECTION_INTERVAL_MS, SALIENT_Y_FLIP } from '../detection/constants';
import { useAppStore } from '../state/store';
import { useDetectionBridge } from '../detection/DetectionBridge';
import { processFaces } from '../detection/processFaces';
import { normalizedToEngine } from '../detection/transforms';
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
  const position = useAppStore((s) => s.position);
  const flashMode = useAppStore((s) => s.flashMode);
  const sceneMode = useAppStore((s) => s.sceneMode);
  const flipCamera = useAppStore((s) => s.flipCamera);
  const cycleFlash = useAppStore((s) => s.cycleFlash);
  const device = useCameraDevice(position);
  const [isForeground, setIsForeground] = useState(true);
  const [layout, setLayout] = useState<{ width: number; height: number } | null>(null);

  const bridge = useDetectionBridge();
  // Don't destructure — Nitro hybrid objects lose their `this` binding.
  const faceDetector = useFaceDetector({ performanceMode: 'fast', cameraFacing: position });
  const asyncRunner = useAsyncRunner();

  // Slow→fast plane handoff: retune coordinate conversion when the camera flips.
  useEffect(() => {
    const tuning = CAMERA_TUNING[position === 'front' ? 'front' : 'back'];
    bridge.rotation.value = tuning.rotation;
    bridge.isMirrored.value = tuning.mirrored;
    bridge.subjectRect.value = null; // drop stale geometry from the other camera
    bridge.targetZone.value = null;
    bridge.nudge.value = null;
    bridge.hint.value = null;
  }, [position, bridge]);
  const { photoOutput, capture, status, errorText } = useCapture();

  // Salient-subject signal for food-scene arbitration (S5). The callback is
  // tiny and event-driven; it only writes shared values, never React state.
  const objectOutput = useObjectOutput({
    types: ['salient-object'],
    onObjectsScanned(objects) {
      const o = objects.find((x) => x.type === 'salient-object') ?? objects[0];
      if (o == null) return;
      bridge.salientRect.value = normalizedToEngine(o.boundingBox, SALIENT_Y_FLIP, bridge.isMirrored.value);
      bridge.salientSeenAtMs.value = Date.now();
    },
  });

  // Reflect the arbitrated scene into the slow-plane store (mode label).
  const setSceneMode = useAppStore((s) => s.setSceneMode);
  useEffect(() => {
    const id = setInterval(() => {
      setSceneMode(bridge.scene.value === 'food' ? 'food' : 'portrait');
    }, 250);
    return () => clearInterval(id);
  }, [bridge, setSceneMode]);

  // White blink over the viewfinder on capture.
  const flashOpacity = useSharedValue(0);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));
  const onShutter = useCallback(() => {
    flashOpacity.value = 0.85;
    flashOpacity.value = withTiming(0, { duration: 320 });
    void capture(flashMode);
  }, [capture, flashOpacity, flashMode]);

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
        outputs={[frameOutput, photoOutput, objectOutput]}
        enableNativeTapToFocusGesture
        enableNativeZoomGesture
      />
      <Pressable onPress={cycleFlash} style={styles.flashChipWrap} accessibilityLabel="Flash mode">
        <BlurView intensity={40} tint="dark" style={styles.flashChip}>
          <Text style={[styles.flashText, flashMode !== 'off' && styles.flashTextOn]}>
            {flashMode === 'off' ? '⚡︎ off' : flashMode === 'on' ? '⚡︎ on' : '⚡︎ auto'}
          </Text>
        </BlurView>
      </Pressable>
      {layout != null && (
        <OverlayCanvas bridge={bridge} width={layout.width} height={layout.height} />
      )}
      <Animated.View style={[StyleSheet.absoluteFill, styles.captureFlash, flashStyle]} pointerEvents="none" />
      <ScoreBadge bridge={bridge} />
      <DebugHud bridge={bridge} />
      {errorText != null && (
        <View style={styles.errorChip}>
          <Text style={styles.errorText}>{errorText}</Text>
        </View>
      )}
      <CaptureControls mode={sceneMode} onShutter={onShutter} onFlip={flipCamera} disabled={status === 'capturing'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  captureFlash: {
    backgroundColor: '#fff',
  },
  flashChipWrap: {
    position: 'absolute',
    top: 60,
    left: 12,
  },
  flashChip: {
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(80,80,85,0.32)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 11,
    paddingVertical: 4,
  },
  flashText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    fontWeight: '500',
  },
  flashTextOn: {
    color: '#FFD60A',
  },
  errorChip: {
    position: 'absolute',
    bottom: 200,
    alignSelf: 'center',
    backgroundColor: 'rgba(80,80,85,0.5)',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  errorText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12,
    fontWeight: '500',
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

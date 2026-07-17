import { create } from 'zustand';
import type { FlashMode } from 'react-native-vision-camera';
import type { SceneMode } from '../capture/CaptureControls';

/**
 * The SLOW plane (ADR-006): app state that changes on user events only.
 * Hot-path data (detections, score, guide geometry) lives in DetectionBridge
 * shared values and must never appear here.
 */
interface AppState {
  position: 'front' | 'back';
  flashMode: FlashMode;
  sceneMode: SceneMode;
  flipCamera: () => void;
  cycleFlash: () => void;
  setSceneMode: (m: SceneMode) => void;
}

const FLASH_ORDER: FlashMode[] = ['off', 'on', 'auto'];

export const useAppStore = create<AppState>((set) => ({
  position: 'front',
  flashMode: 'off',
  sceneMode: 'portrait',
  flipCamera: () => set((s) => ({ position: s.position === 'front' ? 'back' : 'front' })),
  cycleFlash: () =>
    set((s) => ({ flashMode: FLASH_ORDER[(FLASH_ORDER.indexOf(s.flashMode) + 1) % FLASH_ORDER.length]! })),
  setSceneMode: (sceneMode) => set({ sceneMode }),
}));

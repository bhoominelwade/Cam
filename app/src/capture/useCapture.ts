import { File } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePhotoOutput, type FlashMode } from 'react-native-vision-camera';

export type CaptureStatus = 'idle' | 'capturing' | 'saved' | 'error';

/**
 * S3: shutter → photo file → Apple Photos, via ADD-ONLY library permission
 * requested at the moment of first capture, never at launch (ARCH §5).
 * Errors surface as one human sentence — never a stack trace.
 */
export function useCapture() {
  const photoOutput = usePhotoOutput();
  const [status, setStatus] = useState<CaptureStatus>('idle');
  const [errorText, setErrorText] = useState<string | null>(null);
  const busy = useRef(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resetTimer.current != null) clearTimeout(resetTimer.current);
  }, []);

  const capture = useCallback(
    async (flashMode: FlashMode) => {
      if (busy.current) return;
      busy.current = true;
      setStatus('capturing');
      setErrorText(null);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      let tempPath: string | null = null;
      try {
        const file = await photoOutput.capturePhotoToFile({ flashMode }, {});
        tempPath = file.filePath;

        const permission = await MediaLibrary.requestPermissionsAsync(true);
        if (!permission.granted) {
          setStatus('error');
          setErrorText('To keep your shot, allow Cam to add photos in Settings.');
          return;
        }

        await MediaLibrary.saveToLibraryAsync('file://' + file.filePath);
        setStatus('saved');
        resetTimer.current = setTimeout(() => setStatus('idle'), 1200);
      } catch {
        setStatus('error');
        setErrorText("That shot didn't save. Try again.");
      } finally {
        // No image data lingers in app-private storage on ANY path —
        // the security promise (PLAN §6.2), not an optimization.
        if (tempPath != null) {
          try {
            new File('file://' + tempPath).delete();
          } catch {
            // Best-effort: the OS clears the cache dir eventually.
          }
        }
        busy.current = false;
      }
    },
    [photoOutput],
  );

  return { photoOutput, capture, status, errorText };
}

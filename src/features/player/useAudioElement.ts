import { useEffect, useRef, useCallback } from 'react';
import { downloadFileAsBlob } from '@/lib/drive';
import { usePlayerStore } from './usePlayerStore';
import { localPosition } from './localPosition';

const audio = new Audio();
audio.preload = 'auto';

// In-session blob URL cache — avoids re-downloading when going back/forward
const blobUrlCache = new Map<string, string>();
const BLOB_CACHE_MAX = 3;

async function getBlobUrl(fileId: string): Promise<string> {
  const cached = blobUrlCache.get(fileId);
  if (cached) return cached;

  const blob = await downloadFileAsBlob(fileId);
  const url = URL.createObjectURL(blob);

  if (blobUrlCache.size >= BLOB_CACHE_MAX) {
    const oldestKey = blobUrlCache.keys().next().value!;
    URL.revokeObjectURL(blobUrlCache.get(oldestKey)!);
    blobUrlCache.delete(oldestKey);
  }

  blobUrlCache.set(fileId, url);
  return url;
}

export function useAudioElement(onEnded?: () => void) {
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  const loadFile = useCallback(
    async (fileId: string, fileName: string, bookId: string, ignorePosition = false) => {
      const store = usePlayerStore.getState();
      audio.pause();
      store.setIsLoading(true);
      store.setIsPlaying(false);
      store.setCurrentFile(fileId, fileName);

      try {
        const url = await getBlobUrl(fileId);
        audio.src = url;

        const saved = ignorePosition ? 0 : localPosition.get(bookId, fileId);
        audio.load();

        await new Promise<void>((resolve, reject) => {
          const onReady = () => {
            audio.removeEventListener('canplay', onReady);
            audio.removeEventListener('error', onError);
            resolve();
          };
          const onError = () => {
            audio.removeEventListener('canplay', onReady);
            audio.removeEventListener('error', onError);
            reject(new Error('Audio load error'));
          };
          audio.addEventListener('canplay', onReady, { once: true });
          audio.addEventListener('error', onError, { once: true });
        });

        if (saved > 0) audio.currentTime = saved;
        usePlayerStore.getState().setDuration(audio.duration || 0);
        usePlayerStore.getState().setPosition(audio.currentTime);
      } finally {
        usePlayerStore.getState().setIsLoading(false);
      }
    },
    [],
  );

  const play = useCallback(() => {
    void audio.play();
  }, []);

  const pause = useCallback(() => {
    audio.pause();
  }, []);

  const seek = useCallback((seconds: number) => {
    audio.currentTime = seconds;
  }, []);

  const skip = useCallback((delta: number) => {
    audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + delta));
  }, []);

  const setRate = useCallback((rate: number) => {
    audio.playbackRate = rate;
    usePlayerStore.getState().setPlaybackRate(rate);
  }, []);

  // Register audio element listeners once — empty deps prevents the ended listener
  // from being briefly removed on every timeupdate (which fires 4x/sec and triggers
  // store updates → effect re-run). In background, that removal window is larger
  // and can swallow the ended event, causing auto-advance to silently fail.
  useEffect(() => {
    const onPlay = () => usePlayerStore.getState().setIsPlaying(true);
    const onPause = () => usePlayerStore.getState().setIsPlaying(false);
    const onTimeUpdate = () => usePlayerStore.getState().setPosition(audio.currentTime);
    const onDurationChange = () => usePlayerStore.getState().setDuration(audio.duration || 0);
    const onEndedHandler = () => onEndedRef.current?.();

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEndedHandler);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEndedHandler);
    };
  }, []);

  return { loadFile, play, pause, seek, skip, setRate };
}

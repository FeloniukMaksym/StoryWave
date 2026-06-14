import { useEffect, useRef, useCallback } from 'react';
import { downloadFileAsBlob } from '@/lib/drive';
import { usePlayerStore } from './usePlayerStore';

const audio = new Audio();
audio.preload = 'auto';

// In-session blob URL cache — avoids re-downloading when going back/forward
const blobUrlCache = new Map<string, string>();
const BLOB_CACHE_MAX = 3;

async function getBlobUrl(fileId: string): Promise<string> {
  const cached = blobUrlCache.get(fileId);
  if (cached) {
    // Refresh LRU order — re-inserting moves it to the end (most recently used),
    // so going back/forward keeps recent tracks instead of evicting them first.
    blobUrlCache.delete(fileId);
    blobUrlCache.set(fileId, cached);
    return cached;
  }

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

  // Monotonic load token. Every loadFile call claims a new id; if a newer call
  // starts before this one finishes its awaits, the stale call bails out instead
  // of clobbering audio.src / position / isLoading with the wrong file.
  const loadIdRef = useRef(0);

  const loadFile = useCallback(
    async (fileId: string, fileName: string, startAt = 0) => {
      const myLoad = ++loadIdRef.current;
      const store = usePlayerStore.getState();
      audio.pause();
      store.setIsLoading(true);
      store.setIsPlaying(false);
      store.setCurrentFile(fileId, fileName);

      try {
        const url = await getBlobUrl(fileId);
        if (myLoad !== loadIdRef.current) return; // superseded during download

        await new Promise<void>((resolve, reject) => {
          const cleanup = () => {
            audio.removeEventListener('canplay', onReady);
            audio.removeEventListener('error', onError);
          };
          const onReady = () => { cleanup(); resolve(); };
          const onError = () => { cleanup(); reject(new Error('Audio load error')); };
          // Attach listeners before assigning src so an immediate `canplay` (cached
          // resource) can't fire before we're listening.
          audio.addEventListener('canplay', onReady, { once: true });
          audio.addEventListener('error', onError, { once: true });
          audio.src = url;
          audio.load();
        });
        if (myLoad !== loadIdRef.current) return; // superseded during load

        const duration = audio.duration || 0;
        // Never resume to (or past) the very end — the element would fire `ended`
        // immediately and auto-advance. Treat near-end as a fresh start.
        const target = duration > 0 && startAt >= duration - 2 ? 0 : Math.max(0, startAt);
        if (target > 0) audio.currentTime = target;
        usePlayerStore.getState().setDuration(duration);
        usePlayerStore.getState().setPosition(audio.currentTime);
      } finally {
        if (myLoad === loadIdRef.current) usePlayerStore.getState().setIsLoading(false);
      }
    },
    [],
  );

  // Warm a file's blob into the cache without touching the active audio element.
  const prefetch = useCallback((fileId: string) => {
    void getBlobUrl(fileId).catch(() => {});
  }, []);

  const play = useCallback(() => {
    void audio.play();
  }, []);

  const pause = useCallback(() => {
    audio.pause();
  }, []);

  const seek = useCallback((seconds: number) => {
    const dur = audio.duration;
    audio.currentTime =
      isFinite(dur) && dur > 0 ? Math.max(0, Math.min(dur, seconds)) : Math.max(0, seconds);
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

  return { loadFile, prefetch, play, pause, seek, skip, setRate };
}

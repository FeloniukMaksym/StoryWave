import { useEffect, useRef, useCallback } from 'react';
import { downloadFileAsBlob } from '@/lib/drive';
import { usePlayerStore } from './usePlayerStore';
import { localPosition } from './localPosition';

const audio = new Audio();
audio.preload = 'auto';

export function useAudioElement(onEnded?: () => void) {
  const blobUrlRef = useRef<string | null>(null);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const store = usePlayerStore();

  const loadFile = useCallback(
    async (fileId: string, fileName: string, bookId: string) => {
      audio.pause();
      store.setIsLoading(true);
      store.setIsPlaying(false);
      store.setCurrentFile(fileId, fileName);

      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }

      try {
        const blob = await downloadFileAsBlob(fileId);
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        audio.src = url;

        const saved = localPosition.get(bookId, fileId);
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
        store.setDuration(audio.duration || 0);
        store.setPosition(audio.currentTime);
      } finally {
        store.setIsLoading(false);
      }
    },
    [store],
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
    store.setPlaybackRate(rate);
  }, [store]);

  useEffect(() => {
    const onPlay = () => store.setIsPlaying(true);
    const onPause = () => store.setIsPlaying(false);
    const onTimeUpdate = () => store.setPosition(audio.currentTime);
    const onDurationChange = () => store.setDuration(audio.duration || 0);
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
  }, [store]);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  return { loadFile, play, pause, seek, skip, setRate };
}

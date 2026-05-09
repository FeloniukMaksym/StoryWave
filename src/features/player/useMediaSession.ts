import { useEffect } from 'react';
import { usePlayerStore } from './usePlayerStore';

interface UseMediaSessionOptions {
  onPlay: () => void;
  onPause: () => void;
  onSkip: (delta: number) => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

export function useMediaSession({
  onPlay,
  onPause,
  onSkip,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: UseMediaSessionOptions) {
  const { bookTitle, currentFileName, isPlaying, position, duration, playbackRate } =
    usePlayerStore();

  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentFileName) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentFileName,
      artist: bookTitle,
      artwork: [
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      ],
    });
  }, [bookTitle, currentFileName]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  useEffect(() => {
    if (!('mediaSession' in navigator) || duration <= 0) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate,
        position: Math.min(position, duration),
      });
    } catch {
      // some browsers throw on invalid duration
    }
  }, [position, duration, playbackRate]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const trySet = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // browser doesn't support this action
      }
    };

    trySet('play', onPlay);
    trySet('pause', onPause);
    trySet('seekbackward', (d) => onSkip(-(d.seekOffset ?? 30)));
    trySet('seekforward', (d) => onSkip(d.seekOffset ?? 30));
    trySet('previoustrack', hasPrev ? onPrev : null);
    trySet('nexttrack', hasNext ? onNext : null);

    return () => {
      for (const action of ['play', 'pause', 'seekbackward', 'seekforward', 'previoustrack', 'nexttrack'] as MediaSessionAction[]) {
        try { navigator.mediaSession.setActionHandler(action, null); } catch { /* ignore */ }
      }
    };
  }, [onPlay, onPause, onSkip, onPrev, onNext, hasPrev, hasNext]);
}

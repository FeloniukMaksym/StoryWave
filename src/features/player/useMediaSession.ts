import { useEffect, useRef } from 'react';
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

  // Keep refs current so handlers never go stale and never need re-registration
  const onPlayRef = useRef(onPlay);
  const onPauseRef = useRef(onPause);
  const onSkipRef = useRef(onSkip);
  const onPrevRef = useRef(onPrev);
  const onNextRef = useRef(onNext);
  const hasPrevRef = useRef(hasPrev);
  const hasNextRef = useRef(hasNext);
  onPlayRef.current = onPlay;
  onPauseRef.current = onPause;
  onSkipRef.current = onSkip;
  onPrevRef.current = onPrev;
  onNextRef.current = onNext;
  hasPrevRef.current = hasPrev;
  hasNextRef.current = hasNext;

  // Register handlers once — refs mean we never need to re-register,
  // so there's no window where handlers are null and another app can steal the session
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const trySet = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try { navigator.mediaSession.setActionHandler(action, handler); } catch { /* unsupported */ }
    };

    trySet('play', () => onPlayRef.current());
    trySet('pause', () => onPauseRef.current());
    trySet('stop', () => onPauseRef.current());
    trySet('seekbackward', (d) => onSkipRef.current(-(d.seekOffset ?? 15)));
    trySet('seekforward', (d) => onSkipRef.current(d.seekOffset ?? 15));
    trySet('previoustrack', () => { if (hasPrevRef.current) onPrevRef.current(); });
    trySet('nexttrack', () => { if (hasNextRef.current) onNextRef.current(); });

    return () => {
      for (const action of ['play', 'pause', 'stop', 'seekbackward', 'seekforward', 'previoustrack', 'nexttrack'] as MediaSessionAction[]) {
        try { navigator.mediaSession.setActionHandler(action, null); } catch { /* ignore */ }
      }
    };
  }, []); // intentionally empty — refs handle freshness

  // Metadata
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

  // Playback state
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  // Position state
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

  // Re-assert media session when tab regains visibility — reclaims focus from YouTube etc.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible' || !currentFileName) return;
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      if (navigator.mediaSession.metadata?.title !== currentFileName) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentFileName,
          artist: bookTitle,
          artwork: [
            { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          ],
        });
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [bookTitle, currentFileName, isPlaying]);
}

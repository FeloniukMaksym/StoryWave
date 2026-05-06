import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/features/player/usePlayerStore';
import { localPosition } from '@/features/player/localPosition';
import { upsertPosition, upsertCurrentSession, touchBookLastPlayed } from '@/lib/supabaseSync';
import { useAuth } from '@/features/auth/useAuth';

const DEBOUNCE_MS = 5000;

export function usePositionSync(bookId: string) {
  const { user } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFlushedRef = useRef<number>(0);

  const flush = (fileId: string, position: number, duration: number) => {
    if (!bookId || !fileId || position <= 0) return;
    localPosition.set(bookId, fileId, position);
    void upsertPosition(bookId, fileId, position, duration || undefined);
  };

  useEffect(() => {
    const unsub = usePlayerStore.subscribe((state, prev) => {
      const { currentFileId, position, duration, isPlaying, supabaseBookId } = state;
      if (!currentFileId || !supabaseBookId || supabaseBookId !== bookId) return;

      // Flush immediately on pause or stop
      if (prev.isPlaying && !isPlaying && currentFileId) {
        if (timerRef.current) clearTimeout(timerRef.current);
        flush(currentFileId, position, duration);
        lastFlushedRef.current = position;
        return;
      }

      // Debounced flush every 5s while playing
      if (isPlaying && Math.abs(position - lastFlushedRef.current) >= 5) {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          flush(currentFileId, position, duration);
          lastFlushedRef.current = position;
        }, DEBOUNCE_MS);
      }
    });

    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  // Update current_session when file changes
  useEffect(() => {
    const unsub = usePlayerStore.subscribe((state, prev) => {
      const { currentFileId, supabaseBookId } = state;
      if (!currentFileId || !supabaseBookId || supabaseBookId !== bookId) return;
      if (currentFileId === prev.currentFileId) return;

      if (user?.id) {
        void upsertCurrentSession(user.id, bookId, currentFileId);
        void touchBookLastPlayed(bookId);
      }
    });
    return unsub;
  }, [bookId, user?.id]);

  // Flush on page hide (tab switch / close)
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const { currentFileId, position, duration } = usePlayerStore.getState();
        if (currentFileId) flush(currentFileId, position, duration);
      }
    };
    const onBeforeUnload = () => {
      const { currentFileId, position, duration } = usePlayerStore.getState();
      if (currentFileId) flush(currentFileId, position, duration);
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);
}

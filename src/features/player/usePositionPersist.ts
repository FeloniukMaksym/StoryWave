import { useEffect, useRef } from 'react';
import { usePlayerStore } from './usePlayerStore';
import { localPosition } from './localPosition';

export function usePositionPersist(bookId: string) {
  const store = usePlayerStore();
  const bookIdRef = useRef(bookId);
  bookIdRef.current = bookId;

  useEffect(() => {
    const flush = () => {
      const { currentFileId, position } = usePlayerStore.getState();
      if (currentFileId && bookIdRef.current && position > 0) {
        localPosition.set(bookIdRef.current, currentFileId, position);
      }
    };

    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, []);

  useEffect(() => {
    if (!store.isPlaying && store.currentFileId && store.position > 0) {
      localPosition.set(bookId, store.currentFileId, store.position);
    }
  }, [store.isPlaying, store.currentFileId, store.position, bookId]);
}

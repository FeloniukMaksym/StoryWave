const key = (bookId: string, fileId: string) => `sw_pos:${bookId}:${fileId}`;

export const localPosition = {
  get(bookId: string, fileId: string): number {
    try {
      return Number(localStorage.getItem(key(bookId, fileId)) ?? 0);
    } catch {
      return 0;
    }
  },
  set(bookId: string, fileId: string, position: number) {
    try {
      localStorage.setItem(key(bookId, fileId), String(position));
    } catch {
      // storage full or private mode — silently ignore
    }
  },
};

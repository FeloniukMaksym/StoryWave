import { create } from 'zustand';
import type { DriveFileRef } from '@/types/domain';

export interface PlayerState {
  bookId: string | null;          // Drive folder ID
  supabaseBookId: string | null;  // UUID from books table
  bookTitle: string;
  playlist: DriveFileRef[];
  currentFileId: string | null;
  currentFileName: string;
  isPlaying: boolean;
  position: number;
  duration: number;
  playbackRate: number;
  isLoading: boolean;

  setBook: (bookId: string, title: string, playlist: DriveFileRef[]) => void;
  setSupabaseBookId: (id: string) => void;
  setCurrentFile: (fileId: string, fileName: string) => void;
  setIsPlaying: (playing: boolean) => void;
  setPosition: (pos: number) => void;
  setDuration: (dur: number) => void;
  setPlaybackRate: (rate: number) => void;
  setIsLoading: (loading: boolean) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  bookId: null,
  supabaseBookId: null,
  bookTitle: '',
  playlist: [],
  currentFileId: null,
  currentFileName: '',
  isPlaying: false,
  position: 0,
  duration: 0,
  playbackRate: 1,
  isLoading: false,

  setBook: (bookId, title, playlist) => set({ bookId, bookTitle: title, playlist }),
  setSupabaseBookId: (supabaseBookId) => set({ supabaseBookId }),
  setCurrentFile: (fileId, fileName) =>
    set({ currentFileId: fileId, currentFileName: fileName, position: 0, duration: 0 }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setPosition: (position) => set({ position }),
  setDuration: (duration) => set({ duration }),
  setPlaybackRate: (playbackRate) => set({ playbackRate }),
  setIsLoading: (isLoading) => set({ isLoading }),
}));

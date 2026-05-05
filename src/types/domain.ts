export interface DriveFileRef {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
}

export interface Book {
  id: string;
  userId: string;
  driveFolderId: string;
  title: string;
  coverUrl?: string | null;
  createdAt: string;
  lastPlayedAt?: string | null;
}

export interface PlaybackPosition {
  bookId: string;
  driveFileId: string;
  positionSeconds: number;
  durationSeconds?: number;
  updatedAt: string;
}

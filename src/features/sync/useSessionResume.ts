import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentSession, getPosition, getBook } from '@/lib/supabaseSync';
import { localPosition } from '@/features/player/localPosition';
import { useAuth } from '@/features/auth/useAuth';

export interface ResumeTarget {
  supabaseBookId: string;
  driveFolderId: string;
  bookTitle: string;
  driveFileId: string;
  positionSeconds: number;
  navigateTo: string;
}

function buildNavigateTo(
  driveFolderId: string,
  supabaseBookId: string,
  title: string,
  driveFileId: string,
  positionSeconds: number,
): string {
  const params = new URLSearchParams({
    folderId: driveFolderId,
    title,
    resumeFileId: driveFileId,
    resumeAt: String(Math.floor(positionSeconds)),
  });
  return `/player/${supabaseBookId}?${params.toString()}`;
}

function pickPosition(serverSec: number, serverUpdatedAt: string | undefined, localPos: number): number {
  if (!serverUpdatedAt) return localPos;
  // If local is bigger by more than 10s, it was likely saved more recently (e.g. same device, offline)
  if (localPos > serverSec + 10) return localPos;
  return serverSec;
}

async function fetchResume(userId: string): Promise<ResumeTarget | null> {
  const session = await getCurrentSession(userId);
  if (!session?.book_id || !session.drive_file_id) return null;

  const [book, serverPos] = await Promise.all([
    getBook(session.book_id),
    getPosition(session.book_id, session.drive_file_id),
  ]);

  if (!book) return null;

  const localPos = localPosition.get(session.book_id, session.drive_file_id);
  const serverSec = serverPos?.position_seconds ?? 0;
  const positionSeconds = pickPosition(serverSec, serverPos?.updated_at, localPos);

  return {
    supabaseBookId: session.book_id,
    driveFolderId: book.drive_folder_id,
    bookTitle: book.title,
    driveFileId: session.drive_file_id,
    positionSeconds,
    navigateTo: buildNavigateTo(book.drive_folder_id, session.book_id, book.title, session.drive_file_id, positionSeconds),
  };
}

export function useSessionResume() {
  const { user } = useAuth();
  const [resume, setResume] = useState<ResumeTarget | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user?.id) { setChecked(true); return; }
    let cancelled = false;

    fetchResume(user.id)
      .then((r) => { if (!cancelled) setResume(r); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setChecked(true); });

    return () => { cancelled = true; };
  }, [user?.id]);

  // Re-check on window focus (cross-device sync)
  useEffect(() => {
    if (!user?.id) return;
    const onFocus = () => {
      fetchResume(user.id!)
        .then((r) => { if (r) setResume(r); })
        .catch(() => {});
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user?.id]);

  return { resume, checked };
}

export function useNavigateToResume() {
  const { resume, checked } = useSessionResume();
  const navigate = useNavigate();
  const go = () => { if (resume) navigate(resume.navigateTo); };
  return { resume, checked, go };
}

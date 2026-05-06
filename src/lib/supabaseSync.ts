import { supabase } from './supabase';

export interface BookRow {
  id: string;
  user_id: string;
  drive_folder_id: string;
  title: string;
  cover_url: string | null;
  created_at: string;
  last_played_at: string | null;
}

export interface PositionRow {
  book_id: string;
  drive_file_id: string;
  position_seconds: number;
  duration_seconds: number | null;
  updated_at: string;
}

export interface SessionRow {
  user_id: string;
  book_id: string | null;
  drive_file_id: string | null;
  updated_at: string;
}

export async function upsertBook(
  userId: string,
  driveFolderId: string,
  title: string,
): Promise<BookRow> {
  const { data, error } = await supabase
    .from('books')
    .upsert(
      { user_id: userId, drive_folder_id: driveFolderId, title },
      { onConflict: 'user_id,drive_folder_id', ignoreDuplicates: false },
    )
    .select()
    .single();

  if (error) throw error;
  return data as BookRow;
}

export async function upsertPosition(
  bookId: string,
  driveFileId: string,
  positionSeconds: number,
  durationSeconds?: number,
): Promise<void> {
  const { error } = await supabase.from('playback_positions').upsert({
    book_id: bookId,
    drive_file_id: driveFileId,
    position_seconds: positionSeconds,
    duration_seconds: durationSeconds ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function getPosition(
  bookId: string,
  driveFileId: string,
): Promise<PositionRow | null> {
  const { data, error } = await supabase
    .from('playback_positions')
    .select()
    .eq('book_id', bookId)
    .eq('drive_file_id', driveFileId)
    .maybeSingle();

  if (error) throw error;
  return data as PositionRow | null;
}

export async function upsertCurrentSession(
  userId: string,
  bookId: string,
  driveFileId: string,
): Promise<void> {
  const { error } = await supabase.from('current_session').upsert({
    user_id: userId,
    book_id: bookId,
    drive_file_id: driveFileId,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function getCurrentSession(userId: string): Promise<SessionRow | null> {
  const { data, error } = await supabase
    .from('current_session')
    .select()
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as SessionRow | null;
}

export async function getBook(bookId: string): Promise<BookRow | null> {
  const { data, error } = await supabase
    .from('books')
    .select()
    .eq('id', bookId)
    .maybeSingle();
  if (error) throw error;
  return data as BookRow | null;
}

export async function touchBookLastPlayed(bookId: string): Promise<void> {
  const { error } = await supabase
    .from('books')
    .update({ last_played_at: new Date().toISOString() })
    .eq('id', bookId);
  if (error) throw error;
}

export async function listBooks(userId: string): Promise<BookRow[]> {
  const { data, error } = await supabase
    .from('books')
    .select()
    .eq('user_id', userId)
    .order('last_played_at', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data as BookRow[];
}

export async function deleteBook(bookId: string): Promise<void> {
  const { error } = await supabase.from('books').delete().eq('id', bookId);
  if (error) throw error;
}

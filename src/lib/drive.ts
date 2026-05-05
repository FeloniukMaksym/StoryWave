import { supabase } from './supabase';

const BASE = 'https://www.googleapis.com/drive/v3';

const AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
  'audio/wav',
  'audio/flac',
  'audio/aac',
  'audio/x-m4a',
  'audio/m4a',
  'audio/x-wav',
  'audio/webm',
];

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
}

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.provider_token;
  if (!token) throw new Error('No Google provider token. Please sign in again.');
  return token;
}

async function driveGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const token = await getToken();
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export async function listFolder(folderId: string): Promise<DriveFile[]> {
  const audioMimeQuery = AUDIO_MIME_TYPES.map((m) => `mimeType='${m}'`).join(' or ');
  const q = `'${folderId}' in parents and (mimeType='application/vnd.google-apps.folder' or ${audioMimeQuery}) and trashed=false`;

  const data = await driveGet<{ files: DriveFile[] }>('/files', {
    q,
    fields: 'files(id,name,mimeType,size,modifiedTime)',
    orderBy: 'name',
    pageSize: '500',
  });

  return data.files;
}

export async function getRootFolders(): Promise<DriveFile[]> {
  const data = await driveGet<{ files: DriveFile[] }>('/files', {
    q: `mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false`,
    fields: 'files(id,name,mimeType)',
    orderBy: 'name',
    pageSize: '100',
  });
  return data.files;
}

export async function getFile(fileId: string): Promise<DriveFile> {
  return driveGet<DriveFile>(`/files/${fileId}`, {
    fields: 'id,name,mimeType,size,modifiedTime',
  });
}

export async function downloadFileAsBlob(fileId: string): Promise<Blob> {
  const token = await getToken();
  const res = await fetch(`${BASE}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Drive download error ${res.status}`);
  return res.blob();
}

export function isAudioFile(file: DriveFile): boolean {
  return AUDIO_MIME_TYPES.includes(file.mimeType);
}

export function isFolder(file: DriveFile): boolean {
  return file.mimeType === 'application/vnd.google-apps.folder';
}

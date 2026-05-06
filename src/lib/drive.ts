import { supabase } from './supabase';

const BASE = 'https://www.googleapis.com/drive/v3';

export class DriveAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DriveAuthError';
  }
}

// In-memory cache so we don't refresh on every call
let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

async function refreshProviderToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;

  // Token still valid (with 60s buffer)
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) return cachedToken;

  // Fresh provider_token from session (just signed in or Supabase refreshed)
  if (session?.provider_token) {
    cachedToken = session.provider_token;
    // expires_at on session is Supabase JWT expiry, not Google token expiry.
    // Google tokens live 1h — set our cache to 55 min from now.
    tokenExpiresAt = Date.now() + 55 * 60 * 1000;
    return cachedToken;
  }

  // Try to exchange provider_refresh_token for a new access token via Google
  const refreshToken = session?.provider_refresh_token;
  if (!refreshToken) {
    throw new DriveAuthError('No Google refresh token — user must re-authenticate.');
  }

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('VITE_GOOGLE_CLIENT_ID is not set');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    await supabase.auth.signOut();
    throw new DriveAuthError('Google session expired. Please sign in again.');
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = json.access_token;
  tokenExpiresAt = Date.now() + json.expires_in * 1000;
  return cachedToken;
}

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

async function driveGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  let token = await refreshProviderToken();
  let res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  // On 401 invalidate cache and retry once with a fresh token
  if (res.status === 401) {
    cachedToken = null;
    tokenExpiresAt = 0;
    token = await refreshProviderToken();
    res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

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
  let token = await refreshProviderToken();
  let res = await fetch(`${BASE}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    cachedToken = null;
    tokenExpiresAt = 0;
    token = await refreshProviderToken();
    res = await fetch(`${BASE}/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  if (!res.ok) throw new Error(`Drive download error ${res.status}`);
  return res.blob();
}

export function isAudioFile(file: DriveFile): boolean {
  return AUDIO_MIME_TYPES.includes(file.mimeType);
}

export function isFolder(file: DriveFile): boolean {
  return file.mimeType === 'application/vnd.google-apps.folder';
}

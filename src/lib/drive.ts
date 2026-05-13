import { supabase } from './supabase';
import { STORED_GOOGLE_REFRESH_TOKEN_KEY } from '@/features/auth/useAuth';

const BASE = 'https://www.googleapis.com/drive/v3';

export class DriveAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DriveAuthError';
  }
}

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

function cacheToken(token: string, expiresInMs = 55 * 60 * 1000) {
  cachedToken = token;
  tokenExpiresAt = Date.now() + expiresInMs;
}

async function refreshProviderToken(): Promise<string> {
  // 1. In-memory cache
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) return cachedToken;

  // 2. Current session already has a valid provider_token
  const { data } = await supabase.auth.getSession();
  if (data.session?.provider_token) {
    cacheToken(data.session.provider_token);
    return cachedToken!;
  }

  // 3. Ask Supabase to refresh its session — it holds the Google refresh token
  //    server-side and may return a fresh provider_token
  const { data: refreshed } = await supabase.auth.refreshSession();
  if (refreshed.session?.provider_token) {
    cacheToken(refreshed.session.provider_token);
    return cachedToken!;
  }

  // 4. Direct Google token exchange using refresh token persisted in localStorage
  //    (Supabase drops provider_refresh_token from client session after JWT refresh)
  const refreshToken =
    refreshed.session?.provider_refresh_token ??
    localStorage.getItem(STORED_GOOGLE_REFRESH_TOKEN_KEY);

  if (!refreshToken) {
    throw new DriveAuthError('Google Drive access expired. Please reconnect.');
  }

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
  if (!clientId) throw new Error('VITE_GOOGLE_CLIENT_ID is not set');
  if (!clientSecret) throw new Error('VITE_GOOGLE_CLIENT_SECRET is not set');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    // Don't sign out — just surface a reconnect prompt
    throw new DriveAuthError('Google Drive access expired. Please reconnect.');
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cacheToken(json.access_token, json.expires_in * 1000);
  return cachedToken!;
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

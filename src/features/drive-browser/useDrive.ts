import { useQuery } from '@tanstack/react-query';
import { listFolder, getRootFolders } from '@/lib/drive';

export const DRIVE_ROOT = 'root';

export function useFolderContents(folderId: string) {
  return useQuery({
    queryKey: ['drive', 'folder', folderId],
    queryFn: () => (folderId === DRIVE_ROOT ? getRootFolders() : listFolder(folderId)),
    staleTime: 5 * 60 * 1000,
  });
}

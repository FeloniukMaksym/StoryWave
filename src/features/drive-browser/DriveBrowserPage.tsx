import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FolderIcon from '@mui/icons-material/Folder';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import HomeIcon from '@mui/icons-material/Home';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { useFolderContents, DRIVE_ROOT } from './useDrive';
import { isFolder, isAudioFile, type DriveFile } from '@/lib/drive';
import { upsertBook } from '@/lib/supabaseSync';
import { useAuth } from '@/features/auth/useAuth';
import { DriveAuthAlert } from '@/features/auth/DriveAuthAlert';
import { useQueryClient } from '@tanstack/react-query';

interface BreadcrumbEntry {
  id: string;
  name: string;
}

function parseBreadcrumbs(raw: string | null): BreadcrumbEntry[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw) as BreadcrumbEntry[];
  } catch {
    return [];
  }
}

export function DriveBrowserPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const folderId = searchParams.get('folderId') ?? DRIVE_ROOT;
  const folderName = searchParams.get('folderName') ?? 'Drive';
  const breadcrumbs = parseBreadcrumbs(searchParams.get('bc'));

  const { data: files, isLoading, error } = useFolderContents(folderId);

  const handleAddBook = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await upsertBook(user.id, folderId, folderName);
      void queryClient.invalidateQueries({ queryKey: ['books', user.id] });
      navigate('/library');
    } finally {
      setSaving(false);
    }
  };

  const navigateInto = (folder: DriveFile) => {
    const newBc: BreadcrumbEntry[] = [...breadcrumbs, { id: folderId, name: folderName }];
    setSearchParams({ folderId: folder.id, folderName: folder.name, bc: JSON.stringify(newBc) });
  };

  const navigateToBreadcrumb = (index: number) => {
    if (index < 0) {
      setSearchParams({});
      return;
    }
    const target = breadcrumbs[index];
    const newBc = breadcrumbs.slice(0, index);
    setSearchParams({ folderId: target.id, folderName: target.name, bc: JSON.stringify(newBc) });
  };

  const hasAudioFiles = files?.some(isAudioFile) ?? false;
  const folders = files?.filter(isFolder) ?? [];
  const audioFiles = files?.filter(isAudioFile) ?? [];

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 } }}>
      <Stack spacing={2}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate('/library')} size="small">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" component="h1" sx={{ flex: 1 }}>
            Add Book
          </Typography>
        </Box>

        {/* Breadcrumbs */}
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />}>
          <Box
            component="span"
            onClick={() => navigateToBreadcrumb(-1)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              cursor: 'pointer',
              color: breadcrumbs.length === 0 ? 'text.primary' : 'text.secondary',
              '&:hover': { color: 'primary.main' },
            }}
          >
            <HomeIcon fontSize="small" />
            <Typography variant="body2">Drive</Typography>
          </Box>

          {breadcrumbs.map((bc, i) => (
            <Box
              key={bc.id}
              component="span"
              onClick={() => navigateToBreadcrumb(i)}
              sx={{
                cursor: 'pointer',
                color: 'text.secondary',
                '&:hover': { color: 'primary.main' },
              }}
            >
              <Typography variant="body2">{bc.name}</Typography>
            </Box>
          ))}

          {folderId !== DRIVE_ROOT && (
            <Typography variant="body2" color="text.primary">{folderName}</Typography>
          )}
        </Breadcrumbs>

        {/* "Use this folder" CTA — shown when current folder has audio files */}
        {hasAudioFiles && (
          <Paper
            sx={{
              p: 2,
              border: 1,
              borderColor: 'primary.main',
              borderStyle: 'dashed',
              bgcolor: 'background.paper',
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={600}>
                  {audioFiles.length} audio file{audioFiles.length !== 1 ? 's' : ''} found
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Use this folder as a book in your library
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="small"
                startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <LibraryBooksIcon />}
                onClick={() => void handleAddBook()}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Add to Library'}
              </Button>
            </Stack>
          </Paper>
        )}

        {/* File list */}
        <Paper>
          {isLoading && (
            <List disablePadding>
              {Array.from({ length: 5 }).map((_, i) => (
                <ListItem key={i} sx={{ py: 1.5 }}>
                  <ListItemIcon>
                    <Skeleton variant="circular" width={24} height={24} />
                  </ListItemIcon>
                  <ListItemText
                    primary={<Skeleton width="60%" />}
                    secondary={<Skeleton width="30%" />}
                  />
                </ListItem>
              ))}
            </List>
          )}

          {error && (
            <Box sx={{ p: 3 }}>
              <DriveAuthAlert error={error} />
            </Box>
          )}

          {!isLoading && !error && files?.length === 0 && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary" variant="body2">
                This folder is empty
              </Typography>
            </Box>
          )}

          {!isLoading && !error && files && files.length > 0 && (
            <List disablePadding>
              {folders.map((item, idx) => (
                <Box key={item.id}>
                  {idx > 0 && <Divider component="li" />}
                  <ListItemButton onClick={() => navigateInto(item)} sx={{ py: 1.5 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <FolderIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={<Typography noWrap variant="body1">{item.name}</Typography>}
                    />
                  </ListItemButton>
                </Box>
              ))}

              {folders.length > 0 && audioFiles.length > 0 && <Divider />}

              {audioFiles.map((item, idx) => (
                <Box key={item.id}>
                  {idx > 0 && <Divider component="li" />}
                  <ListItem sx={{ py: 1.5 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <AudioFileIcon color="action" />
                    </ListItemIcon>
                    <ListItemText
                      primary={<Typography noWrap variant="body1">{item.name}</Typography>}
                      secondary={item.size ? formatBytes(Number(item.size)) : undefined}
                    />
                  </ListItem>
                </Box>
              ))}
            </List>
          )}
        </Paper>

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
      </Stack>
    </Container>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

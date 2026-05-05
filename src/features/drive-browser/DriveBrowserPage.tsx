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
import Alert from '@mui/material/Alert';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FolderIcon from '@mui/icons-material/Folder';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import HomeIcon from '@mui/icons-material/Home';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { useFolderContents, DRIVE_ROOT } from './useDrive';
import { isFolder, isAudioFile, type DriveFile } from '@/lib/drive';

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

  const folderId = searchParams.get('folderId') ?? DRIVE_ROOT;
  const breadcrumbs = parseBreadcrumbs(searchParams.get('bc'));

  const { data: files, isLoading, error, refetch } = useFolderContents(folderId);

  const navigateInto = (folder: DriveFile) => {
    const newBc: BreadcrumbEntry[] = [...breadcrumbs, { id: folderId, name: currentFolderName }];
    setSearchParams({ folderId: folder.id, bc: JSON.stringify(newBc) });
  };

  const navigateToBreadcrumb = (index: number) => {
    if (index < 0) {
      setSearchParams({});
      return;
    }
    const target = breadcrumbs[index];
    const newBc = breadcrumbs.slice(0, index);
    setSearchParams({ folderId: target.id, bc: JSON.stringify(newBc) });
  };

  const currentFolderName =
    breadcrumbs.length > 0 ? (breadcrumbs[breadcrumbs.length - 1]?.name ?? 'Drive') : 'Drive';

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
                cursor: i < breadcrumbs.length - 1 ? 'pointer' : 'default',
                color: i < breadcrumbs.length - 1 ? 'text.secondary' : 'text.primary',
                '&:hover':
                  i < breadcrumbs.length - 1 ? { color: 'primary.main' } : undefined,
              }}
            >
              <Typography variant="body2">{bc.name}</Typography>
            </Box>
          ))}
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
                startIcon={<LibraryBooksIcon />}
                onClick={() => {
                  // TODO Stage 5: save to Supabase books table
                  console.log('Add book folder:', folderId, currentFolderName);
                  navigate('/library');
                }}
              >
                Add to Library
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
              <Alert
                severity="error"
                action={
                  <Button size="small" onClick={() => void refetch()}>
                    Retry
                  </Button>
                }
              >
                {error instanceof Error ? error.message : 'Failed to load Drive contents'}
              </Alert>
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
                      primary={item.name}
                      primaryTypographyProps={{ noWrap: true }}
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
                      primary={item.name}
                      primaryTypographyProps={{ noWrap: true }}
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

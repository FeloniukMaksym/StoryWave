import { useEffect, useCallback, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Alert from '@mui/material/Alert';
import { DriveAuthAlert } from '@/features/auth/DriveAuthAlert';
import Box from '@mui/material/Box';
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
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useFolderContents } from '@/features/drive-browser/useDrive';
import { isAudioFile } from '@/lib/drive';
import { upsertBook } from '@/lib/supabaseSync';
import { useAuth } from '@/features/auth/useAuth';
import { toast } from '@/app/toastStore';
import { usePlayerStore } from './usePlayerStore';
import { useAudioElement } from './useAudioElement';
import { usePositionPersist } from './usePositionPersist';
import { PlayerControls } from './PlayerControls';
import { ProgressBar } from './ProgressBar';
import { usePositionSync } from '@/features/sync/usePositionSync';
import { useMediaSession } from './useMediaSession';

export function PlayerPage() {
  const { bookId: folderIdParam = '' } = useParams<{ bookId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const folderId = searchParams.get('folderId') ?? folderIdParam;
  const bookTitle = searchParams.get('title') ?? 'Book';
  const resumeFileId = searchParams.get('resumeFileId');
  const resumeAt = Number(searchParams.get('resumeAt') ?? 0);

  const { data: files, isLoading: filesLoading, error: filesError } = useFolderContents(folderId);
  const audioFiles = (files?.filter(isAudioFile) ?? []).slice().sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
  );

  const store = usePlayerStore();
  const [bookFinished, setBookFinished] = useState(false);

  const handleEnded = useCallback(() => {
    const { currentFileId, supabaseBookId: sbId } = usePlayerStore.getState();
    const bookKey = sbId || folderId;
    const idx = audioFiles.findIndex((f) => f.id === currentFileId);
    if (idx === -1) return;

    if (idx < audioFiles.length - 1) {
      const next = audioFiles[idx + 1];
      void loadFile(next.id, next.name, bookKey, true).then(() => {
        void play();
      });
    } else {
      setBookFinished(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioFiles, folderId]);

  const { loadFile, play, pause, seek, skip, setRate } = useAudioElement(handleEnded);

  const supabaseBookId = store.supabaseBookId ?? '';
  usePositionPersist(supabaseBookId);
  usePositionSync(supabaseBookId);

  useEffect(() => {
    if (!user?.id || !folderId || audioFiles.length === 0) return;
    upsertBook(user.id, folderId, bookTitle)
      .then((book) => {
        store.setSupabaseBookId(book.id);
        store.setBook(folderId, bookTitle, audioFiles);
      })
      .catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId, audioFiles.length, user?.id]);

  const currentFileRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    currentFileRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [store.currentFileId]);

  const resumeHandledRef = useRef(false);
  useEffect(() => {
    if (resumeHandledRef.current) return;
    if (!resumeFileId || audioFiles.length === 0) return;

    const file = audioFiles.find((f) => f.id === resumeFileId);
    if (!file) return;

    resumeHandledRef.current = true;
    loadFile(file.id, file.name, supabaseBookId || folderId)
      .then(() => {
        if (resumeAt > 0) seek(resumeAt);
      })
      .catch((e: unknown) => {
        toast.error(e instanceof Error ? e.message : 'Failed to load audio file');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeFileId, audioFiles.length, supabaseBookId]);

  const handleSelectFile = useCallback(
    async (fileId: string, fileName: string) => {
      setBookFinished(false);
      try {
        await loadFile(fileId, fileName, supabaseBookId || folderId);
        void play();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to load audio file');
      }
    },
    [loadFile, play, supabaseBookId, folderId],
  );

  const currentIdx = audioFiles.findIndex((f) => f.id === store.currentFileId);

  const handlePrev = useCallback(() => {
    if (currentIdx <= 0) return;
    const prev = audioFiles[currentIdx - 1];
    setBookFinished(false);
    void loadFile(prev.id, prev.name, supabaseBookId || folderId, true).then(() => void play());
  }, [currentIdx, audioFiles, loadFile, play, supabaseBookId, folderId]);

  const handleNext = useCallback(() => {
    if (currentIdx === -1 || currentIdx >= audioFiles.length - 1) return;
    const next = audioFiles[currentIdx + 1];
    setBookFinished(false);
    void loadFile(next.id, next.name, supabaseBookId || folderId, true).then(() => void play());
  }, [currentIdx, audioFiles, loadFile, play, supabaseBookId, folderId]);

  useMediaSession({
    onPlay: play,
    onPause: pause,
    onSkip: skip,
    onPrev: handlePrev,
    onNext: handleNext,
    hasPrev: currentIdx > 0,
    hasNext: currentIdx !== -1 && currentIdx < audioFiles.length - 1,
  });

  // Keyboard shortcuts: Space = play/pause, ← → = skip ±30s
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!store.currentFileId) return;
      if (e.code === 'Space') { e.preventDefault(); store.isPlaying ? pause() : play(); }
      if (e.code === 'ArrowLeft') { e.preventDefault(); skip(-10); }
      if (e.code === 'ArrowRight') { e.preventDefault(); skip(10); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [store.currentFileId, store.isPlaying, play, pause, skip]);

  return (
    <Container
      maxWidth="sm"
      sx={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        pt: { xs: 2, md: 4 },
        pb: 0,
      }}
    >
      <Stack spacing={3} sx={{ flex: 1, minHeight: 0 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate('/library')} size="small">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" noWrap sx={{ flex: 1 }}>
            {bookTitle}
          </Typography>
        </Box>

        {/* Player card */}
        {store.currentFileId && (
          <Paper sx={{ p: 3 }}>
            <Stack spacing={2}>
              {/* Track title — fades when track changes */}
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={store.currentFileName}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    noWrap
                    textAlign="center"
                  >
                    {store.currentFileName}
                  </Typography>
                </motion.div>
              </AnimatePresence>

              <ProgressBar
                position={store.position}
                duration={store.duration}
                onSeek={seek}
                disabled={store.isLoading}
              />

              <PlayerControls
                isPlaying={store.isPlaying}
                isLoading={store.isLoading}
                playbackRate={store.playbackRate}
                hasPrev={currentIdx > 0}
                hasNext={currentIdx !== -1 && currentIdx < audioFiles.length - 1}
                onPlay={play}
                onPause={pause}
                onSkip={skip}
                onPrev={handlePrev}
                onNext={handleNext}
                onRateChange={setRate}
              />
            </Stack>
          </Paper>
        )}

        {!store.currentFileId && !filesLoading && audioFiles.length > 0 && (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary" variant="body2">
              Select a file below to start listening
            </Typography>
          </Paper>
        )}

        {/* File list skeleton */}
        {filesLoading && (
          <Paper>
            <List disablePadding>
              {Array.from({ length: 5 }).map((_, i) => (
                <ListItem key={i} sx={{ py: 1.5 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Skeleton variant="circular" width={20} height={20} />
                  </ListItemIcon>
                  <ListItemText
                    primary={<Skeleton width={`${55 + (i % 3) * 15}%`} />}
                    secondary={<Skeleton width="25%" />}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        )}

        {filesError && <DriveAuthAlert error={filesError} />}

        {!filesLoading && audioFiles.length > 0 && (
          <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            <Typography variant="overline" sx={{ px: 2, pt: 1.5, display: 'block', flexShrink: 0 }} color="text.secondary">
              Files
            </Typography>
            <Box
              sx={{
                flex: 1,
                overflowY: 'auto',
                pb: { xs: 2, md: 4 },
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255,255,255,0.15) transparent',
                '&::-webkit-scrollbar': { width: 4 },
                '&::-webkit-scrollbar-track': { background: 'transparent' },
                '&::-webkit-scrollbar-thumb': {
                  background: 'rgba(255,255,255,0.15)',
                  borderRadius: 2,
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  background: 'rgba(255,255,255,0.3)',
                },
              }}
            >
              <List disablePadding>
                {audioFiles.map((file, idx) => {
                  const isCurrent = file.id === store.currentFileId;
                  return (
                    <Box key={file.id} ref={isCurrent ? currentFileRef : null}>
                      {idx > 0 && <Divider component="li" />}
                      <ListItemButton
                        selected={isCurrent}
                        onClick={() => void handleSelectFile(file.id, file.name)}
                        sx={{ py: 1.5 }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          {isCurrent && store.isPlaying ? (
                            <PlayArrowIcon color="primary" fontSize="small" />
                          ) : (
                            <AudioFileIcon
                              fontSize="small"
                              color={isCurrent ? 'primary' : 'action'}
                            />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={file.name}
                          slotProps={{
                            primary: {
                              noWrap: true,
                              variant: 'body2',
                              color: isCurrent ? 'primary' : 'text.primary',
                            },
                          }}
                          secondary={file.size ? formatBytes(Number(file.size)) : undefined}
                        />
                      </ListItemButton>
                    </Box>
                  );
                })}
              </List>
            </Box>
          </Paper>
        )}

        {!filesLoading && !filesError && audioFiles.length === 0 && (
          <Alert severity="info">No audio files found in this folder.</Alert>
        )}
      </Stack>

      <Snackbar
        open={bookFinished}
        message="Book finished"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        onClose={() => setBookFinished(false)}
        autoHideDuration={6000}
      />
    </Container>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

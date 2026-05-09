import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';

import Container from '@mui/material/Container';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid2';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import LogoutIcon from '@mui/icons-material/Logout';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useAuth } from '@/features/auth/useAuth';
import { useNavigateToResume } from '@/features/sync/useSessionResume';
import { useBooks, useDeleteBook } from './useBooks';
import type { BookRow } from '@/lib/supabaseSync';

function formatRelativeDate(iso: string | null): string {
  if (!iso) return 'Never played';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString();
}

function BookCard({
  book,
  onDelete,
}: {
  book: BookRow;
  onDelete: (book: BookRow) => void;
}) {
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setAnchor(e.currentTarget);
  };
  const handleMenuClose = () => setAnchor(null);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleMenuClose();
    onDelete(book);
  };

  const navigateToBook = () => {
    navigate(`/player/${book.id}?folderId=${book.drive_folder_id}&title=${encodeURIComponent(book.title)}`);
  };

  return (
    <Card
      variant="outlined"
      sx={{
        position: 'relative',
        transition: 'border-color 0.15s',
        '&:hover': { borderColor: 'primary.main' },
      }}
    >
      <CardActionArea onClick={navigateToBook} sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pr: 3 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 1.5,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              opacity: 0.85,
            }}
          >
            <LibraryBooksIcon sx={{ color: '#000', fontSize: 22 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body1" fontWeight={600} noWrap>
              {book.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatRelativeDate(book.last_played_at)}
            </Typography>
          </Box>
        </Box>
      </CardActionArea>

      <IconButton
        size="small"
        onClick={handleMenuOpen}
        sx={{ position: 'absolute', top: 10, right: 8 }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>

      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={handleMenuClose}>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Remove book
        </MenuItem>
      </Menu>
    </Card>
  );
}

export function LibraryPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { resume, checked, go } = useNavigateToResume();
  const { data: books, isLoading: booksLoading } = useBooks();
  const deleteBook = useDeleteBook();

  const [bookToDelete, setBookToDelete] = useState<BookRow | null>(null);

  const handleConfirmDelete = () => {
    if (!bookToDelete) return;
    deleteBook.mutate(bookToDelete.id);
    setBookToDelete(null);
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 6 } }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h4" component="h1">Library</Typography>
          <Button variant="outlined" startIcon={<LogoutIcon />} onClick={() => void signOut()}>
            Sign out
          </Button>
        </Box>

        {/* Continue listening */}
        {!checked && (
          <Paper sx={{ p: 3 }}>
            <Skeleton width="40%" height={20} />
            <Skeleton width="60%" height={16} sx={{ mt: 1 }} />
            <Skeleton width="100%" height={6} sx={{ mt: 2, borderRadius: 1 }} />
          </Paper>
        )}

        {checked && resume && (
          <Paper
            sx={{ p: 3, border: 1, borderColor: 'primary.main', cursor: 'pointer' }}
            onClick={go}
          >
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="overline" color="primary">Continue listening</Typography>
                  <Typography variant="body1" noWrap fontWeight={600}>
                    {resume.bookTitle}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<PlayArrowIcon />}
                  onClick={(e) => { e.stopPropagation(); go(); }}
                  sx={{ flexShrink: 0 }}
                >
                  Resume
                </Button>
              </Box>
              <LinearProgress
                variant="determinate"
                value={resume.positionSeconds > 0 ? Math.min(100, (resume.positionSeconds / 3600) * 100) : 0}
                sx={{ borderRadius: 1, height: 4 }}
              />
            </Stack>
          </Paper>
        )}

        {/* Books grid */}
        {booksLoading && (
          <Grid container spacing={2}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Grid key={i} size={{ xs: 12, sm: 6 }}>
                <Skeleton variant="rounded" height={80} />
              </Grid>
            ))}
          </Grid>
        )}

        {!booksLoading && books && books.length > 0 && (
          <Box>
            <Typography variant="overline" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
              Your books
            </Typography>
            <Grid container spacing={2}>
              {books.map((book) => (
                <Grid key={book.id} size={{ xs: 12, sm: 6 }}>
                  <BookCard book={book} onDelete={setBookToDelete} />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Empty state / Add CTA */}
        {!booksLoading && (!books || books.length === 0) && (
          <Paper sx={{ p: 4 }}>
            <Stack spacing={2} alignItems="center" sx={{ textAlign: 'center' }}>
              <LibraryBooksIcon sx={{ fontSize: 48 }} color="disabled" />
              <Box>
                <Typography variant="body1" fontWeight={600}>No books yet</Typography>
                <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
                  Browse your Google Drive to add your first audiobook.
                </Typography>
              </Box>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/browse')}>
                Add book from Drive
              </Button>
            </Stack>
          </Paper>
        )}

        {/* Add more CTA when books exist */}
        {!booksLoading && books && books.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => navigate('/browse')}>
              Add book from Drive
            </Button>
          </Box>
        )}

        {/* Account info */}
        <Typography variant="caption" color="text.disabled" textAlign="center">
          {user?.email}
        </Typography>
      </Stack>

      {/* Delete confirmation dialog */}
      <Dialog open={Boolean(bookToDelete)} onClose={() => setBookToDelete(null)}>
        <DialogTitle>Remove book?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            "{bookToDelete?.title}" will be removed from your library. Files on Google Drive won't be deleted.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBookToDelete(null)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

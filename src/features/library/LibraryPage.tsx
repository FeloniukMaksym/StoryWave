import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import LogoutIcon from '@mui/icons-material/Logout';
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from '@/features/auth/useAuth';

export function LibraryPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 6 } }}>
      <Stack spacing={3}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Typography variant="h4" component="h1">
            Library
          </Typography>
          <Button
            variant="outlined"
            startIcon={<LogoutIcon />}
            onClick={() => void signOut()}
          >
            Sign out
          </Button>
        </Box>

        <Paper sx={{ p: 3 }}>
          <Typography variant="overline" color="text.secondary">
            Signed in as
          </Typography>
          <Typography variant="body1">{user?.email ?? '—'}</Typography>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Stack spacing={2} alignItems="center" sx={{ py: 2, textAlign: 'center' }}>
            <Typography color="text.secondary" variant="body2">
              No books yet. Browse your Google Drive to add one.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/browse')}
            >
              Add book from Drive
            </Button>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}

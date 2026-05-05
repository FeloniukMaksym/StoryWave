import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuth } from './useAuth';

export function SignInPage() {
  const { session, loading, signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && session) {
    return <Navigate to="/library" replace />;
  }

  const handleSignIn = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signIn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed');
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ minHeight: '100dvh', display: 'flex', alignItems: 'center' }}>
      <Stack spacing={4} sx={{ width: '100%', textAlign: 'center', py: 6 }}>
        <Box>
          <Typography variant="h3" component="h1" gutterBottom>
            StoryWave
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Your personal audiobook player, powered by your Google Drive.
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        <Button
          variant="contained"
          size="large"
          startIcon={<GoogleIcon />}
          onClick={handleSignIn}
          disabled={submitting || loading}
          sx={{ alignSelf: 'center', minWidth: 240 }}
        >
          Sign in with Google
        </Button>

        <Typography variant="caption" color="text.secondary">
          We request read-only access to your Drive. We never modify or delete your files.
        </Typography>
      </Stack>
    </Container>
  );
}

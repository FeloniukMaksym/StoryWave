import { Component, type ReactNode, type ErrorInfo } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <Container maxWidth="sm" sx={{ minHeight: '100dvh', display: 'flex', alignItems: 'center' }}>
          <Box sx={{ textAlign: 'center', py: 6, width: '100%' }}>
            <Typography variant="h5" gutterBottom>Something went wrong</Typography>
            <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>
              {this.state.error.message}
            </Typography>
            <Button variant="contained" onClick={() => window.location.reload()}>
              Reload
            </Button>
          </Box>
        </Container>
      );
    }
    return this.props.children;
  }
}

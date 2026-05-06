import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import { DriveAuthError } from '@/lib/drive';
import { useAuth } from './useAuth';

export function isDriveAuthError(err: unknown): boolean {
  return err instanceof DriveAuthError;
}

export function DriveAuthAlert({ error }: { error: unknown }) {
  const { signIn } = useAuth();

  if (!isDriveAuthError(error)) {
    return (
      <Alert severity="error">
        {error instanceof Error ? error.message : 'Failed to load Drive contents'}
      </Alert>
    );
  }

  return (
    <Alert
      severity="warning"
      action={
        <Button color="inherit" size="small" onClick={() => void signIn()}>
          Reconnect
        </Button>
      }
    >
      Google Drive access expired. Reconnect to continue.
    </Alert>
  );
}

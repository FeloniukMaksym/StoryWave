import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { useToastStore } from './toastStore';

export function ToastSnackbar() {
  const { open, message, severity, close } = useToastStore();
  return (
    <Snackbar
      open={open}
      autoHideDuration={5000}
      onClose={close}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert onClose={close} severity={severity} variant="filled" sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
}

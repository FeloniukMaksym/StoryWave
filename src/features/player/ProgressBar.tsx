import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';

interface ProgressBarProps {
  position: number;
  duration: number;
  onSeek: (seconds: number) => void;
  disabled?: boolean;
}

function fmt(sec: number): string {
  if (!isFinite(sec)) return '0:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function ProgressBar({ position, duration, onSeek, disabled }: ProgressBarProps) {
  return (
    <Box sx={{ px: 1 }}>
      <Slider
        size="small"
        min={0}
        max={duration || 1}
        value={position}
        disabled={disabled || duration === 0}
        onChange={(_, value) => onSeek(value as number)}
        sx={{
          '& .MuiSlider-thumb': { width: 14, height: 14 },
          '& .MuiSlider-track': { transition: 'none' },
        }}
      />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: -0.5 }}>
        <Typography variant="caption" color="text.secondary">
          {fmt(position)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {fmt(duration)}
        </Typography>
      </Box>
    </Box>
  );
}

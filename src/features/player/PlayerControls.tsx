import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import Replay30Icon from '@mui/icons-material/Replay30';
import Forward30Icon from '@mui/icons-material/Forward30';

const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];

interface PlayerControlsProps {
  isPlaying: boolean;
  isLoading: boolean;
  playbackRate: number;
  onPlay: () => void;
  onPause: () => void;
  onSkip: (delta: number) => void;
  onRateChange: (rate: number) => void;
  disabled?: boolean;
}

export function PlayerControls({
  isPlaying,
  isLoading,
  playbackRate,
  onPlay,
  onPause,
  onSkip,
  onRateChange,
  disabled,
}: PlayerControlsProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      {/* Main controls row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton
          onClick={() => onSkip(-30)}
          disabled={disabled || isLoading}
          size="large"
          aria-label="Skip back 30 seconds"
        >
          <Replay30Icon fontSize="large" />
        </IconButton>

        <IconButton
          onClick={isPlaying ? onPause : onPlay}
          disabled={disabled || isLoading}
          size="large"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          sx={{
            bgcolor: 'primary.main',
            color: 'background.default',
            width: 64,
            height: 64,
            '&:hover': { bgcolor: 'primary.dark' },
            '&:disabled': { bgcolor: 'action.disabledBackground' },
          }}
        >
          {isLoading ? (
            <CircularProgress size={28} color="inherit" />
          ) : isPlaying ? (
            <PauseIcon fontSize="large" />
          ) : (
            <PlayArrowIcon fontSize="large" />
          )}
        </IconButton>

        <IconButton
          onClick={() => onSkip(30)}
          disabled={disabled || isLoading}
          size="large"
          aria-label="Skip forward 30 seconds"
        >
          <Forward30Icon fontSize="large" />
        </IconButton>
      </Box>

      {/* Speed selector */}
      <ToggleButtonGroup
        value={playbackRate}
        exclusive
        size="small"
        onChange={(_, val: number | null) => {
          if (val !== null) onRateChange(val);
        }}
        aria-label="Playback speed"
      >
        {RATES.map((r) => (
          <ToggleButton key={r} value={r} sx={{ minWidth: 48, px: 1 }}>
            <Typography variant="caption" fontWeight={600}>
              {r === 1 ? '1×' : `${r}×`}
            </Typography>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}

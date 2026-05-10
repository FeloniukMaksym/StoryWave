import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SpeedIcon from '@mui/icons-material/Speed';

const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];

function SkipIcon({ seconds, direction }: { seconds: number; direction: 'back' | 'forward' }) {
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28 }}>
      <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
        {direction === 'back' ? (
          <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
        ) : (
          <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z" />
        )}
      </svg>
      <Typography
        component="span"
        sx={{
          position: 'absolute',
          fontSize: '7px',
          fontWeight: 700,
          lineHeight: 1,
          bottom: 2,
          color: 'inherit',
        }}
      >
        {seconds}
      </Typography>
    </Box>
  );
}

interface PlayerControlsProps {
  isPlaying: boolean;
  isLoading: boolean;
  playbackRate: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSkip: (delta: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onRateChange: (rate: number) => void;
  disabled?: boolean;
}

export function PlayerControls({
  isPlaying,
  isLoading,
  playbackRate,
  hasPrev,
  hasNext,
  onPlay,
  onPause,
  onSkip,
  onPrev,
  onNext,
  onRateChange,
  disabled,
}: PlayerControlsProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      {/* Main controls row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <motion.div whileTap={{ scale: 0.85 }}>
          <IconButton
            onClick={onPrev}
            disabled={disabled || isLoading || !hasPrev}
            size="large"
            aria-label="Previous track"
          >
            <SkipPreviousIcon fontSize="large" />
          </IconButton>
        </motion.div>

        <motion.div whileTap={{ scale: 0.85 }}>
          <IconButton
            onClick={() => onSkip(-15)}
            disabled={disabled || isLoading}
            size="large"
            aria-label="Skip back 15 seconds"
          >
            <SkipIcon seconds={15} direction="back" />
          </IconButton>
        </motion.div>

        {/* Play/pause */}
        <motion.div whileTap={{ scale: 0.88 }} style={{ display: 'inline-flex' }}>
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
            ) : (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={isPlaying ? 'pause' : 'play'}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  style={{ display: 'flex' }}
                >
                  {isPlaying ? <PauseIcon fontSize="large" /> : <PlayArrowIcon fontSize="large" />}
                </motion.div>
              </AnimatePresence>
            )}
          </IconButton>
        </motion.div>

        <motion.div whileTap={{ scale: 0.85 }}>
          <IconButton
            onClick={() => onSkip(15)}
            disabled={disabled || isLoading}
            size="large"
            aria-label="Skip forward 15 seconds"
          >
            <SkipIcon seconds={15} direction="forward" />
          </IconButton>
        </motion.div>

        <motion.div whileTap={{ scale: 0.85 }}>
          <IconButton
            onClick={onNext}
            disabled={disabled || isLoading || !hasNext}
            size="large"
            aria-label="Next track"
          >
            <SkipNextIcon fontSize="large" />
          </IconButton>
        </motion.div>
      </Box>

      {/* Speed selector — compact dropdown */}
      <Box>
        <IconButton
          size="small"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          aria-label="Playback speed"
          sx={{ gap: 0.5, borderRadius: 1, px: 1 }}
        >
          <SpeedIcon fontSize="small" />
          <Typography variant="caption" fontWeight={600}>
            {playbackRate === 1 ? '1×' : `${playbackRate}×`}
          </Typography>
        </IconButton>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          {RATES.map((r) => (
            <MenuItem
              key={r}
              selected={r === playbackRate}
              onClick={() => {
                onRateChange(r);
                setAnchorEl(null);
              }}
              sx={{ minWidth: 80, justifyContent: 'center' }}
            >
              <Typography variant="body2" fontWeight={r === playbackRate ? 700 : 400}>
                {r === 1 ? '1×' : `${r}×`}
              </Typography>
            </MenuItem>
          ))}
        </Menu>
      </Box>
    </Box>
  );
}

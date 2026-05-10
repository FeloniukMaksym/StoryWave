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
import Replay10Icon from '@mui/icons-material/Replay10';
import Forward10Icon from '@mui/icons-material/Forward10';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SpeedIcon from '@mui/icons-material/Speed';

const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];

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
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}>
      {/* Left spacer */}
      <Box />

      {/* Main controls — centered */}
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
            onClick={() => onSkip(-10)}
            disabled={disabled || isLoading}
            size="large"
            aria-label="Skip back 10 seconds"
          >
            <Replay10Icon fontSize="large" />
          </IconButton>
        </motion.div>

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
            onClick={() => onSkip(10)}
            disabled={disabled || isLoading}
            size="large"
            aria-label="Skip forward 10 seconds"
          >
            <Forward10Icon fontSize="large" />
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

      {/* Speed — right edge, same row */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <IconButton
          size="small"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          aria-label="Playback speed"
          sx={{ flexDirection: 'column', gap: 0, px: 1, py: 0.5, borderRadius: 1 }}
        >
          <SpeedIcon fontSize="small" />
          <Typography variant="caption" fontWeight={600} lineHeight={1}>
            {playbackRate === 1 ? '1×' : `${playbackRate}×`}
          </Typography>
        </IconButton>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          {RATES.map((r) => (
            <MenuItem
              key={r}
              selected={r === playbackRate}
              onClick={() => { onRateChange(r); setAnchorEl(null); }}
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

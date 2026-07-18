import { Box, Typography } from '@mui/material';
import { useEvents } from '@/shared/realtime/EventsProvider';
import type { ConnectionStatus } from '@/shared/realtime/events';

const LABEL: Record<ConnectionStatus, string> = {
  connecting: 'Connecting…',
  connected: 'Realtime connected',
  reconnecting: 'Reconnecting…',
};
const COLOR: Record<ConnectionStatus, string> = {
  connecting: '#94a3b8',
  connected: '#16a34a',
  reconnecting: '#d97706',
};

export function RealtimeIndicator() {
  const { status } = useEvents();
  return (
    <Box className="flex items-center gap-2">
      <Box
        sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: COLOR[status], flexShrink: 0 }}
        aria-hidden
      />
      <Typography variant="caption" color="text.secondary" noWrap>
        {LABEL[status]}
      </Typography>
    </Box>
  );
}

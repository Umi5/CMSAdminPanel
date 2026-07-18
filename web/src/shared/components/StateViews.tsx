import { Box, Button, CircularProgress, Paper, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <Box className="flex flex-col items-center justify-center gap-3 py-20">
      <CircularProgress size={26} />
      <Typography color="text.secondary">{label}</Typography>
    </Box>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Paper variant="outlined" className="flex flex-col items-center gap-3 px-8 py-10 text-center">
      <Typography color="error" fontWeight={700}>
        Something went wrong
      </Typography>
      <Typography color="text.secondary">{message}</Typography>
      {onRetry && (
        <Button variant="outlined" onClick={onRetry}>
          Try again
        </Button>
      )}
    </Paper>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <Paper variant="outlined" className="flex flex-col items-center gap-2 px-8 py-14 text-center">
      {icon && <Box sx={{ color: 'text.disabled', mb: 1 }}>{icon}</Box>}
      <Typography variant="h6">{title}</Typography>
      {description && (
        <Typography color="text.secondary" className="max-w-md">
          {description}
        </Typography>
      )}
      {action && <Box className="mt-3">{action}</Box>}
    </Paper>
  );
}

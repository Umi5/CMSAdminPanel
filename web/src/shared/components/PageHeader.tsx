import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Box className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <Box className="min-w-0">
        <Typography variant="h4">{title}</Typography>
        {subtitle && (
          <Typography color="text.secondary" className="mt-1">
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && <Box className="flex items-center gap-2 shrink-0">{actions}</Box>}
    </Box>
  );
}

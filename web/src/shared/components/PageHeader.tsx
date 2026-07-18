import { Box, Typography } from "@mui/material";
import type { ReactNode } from "react";

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
    <Box
      className="flex flex-wrap items-start justify-between gap-4 pb-4 mb-6"
      sx={{ borderBottom: 1, borderColor: "divider" }}
    >
      <Box className="min-w-0">
        <Typography variant="h5" noWrap={false}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" className="mt-1">
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && (
        <Box className="flex flex-wrap items-center gap-2 shrink-0">
          {actions}
        </Box>
      )}
    </Box>
  );
}

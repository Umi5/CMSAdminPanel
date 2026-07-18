import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Typography,
} from "@mui/material";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import type { ReactNode } from "react";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <Box className="flex flex-col items-center justify-center gap-3 py-16">
      <CircularProgress size={22} thickness={4} />
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Paper
      variant="outlined"
      className="flex flex-col items-center gap-3 px-8 py-12 text-center"
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "error.main",
          bgcolor: (t) => `${t.palette.error.main}1f`,
        }}
      >
        <ErrorOutlineRoundedIcon />
      </Box>
      <Typography variant="subtitle1">Something went wrong</Typography>
      <Typography variant="body2" color="text.secondary" className="max-w-md">
        {message}
      </Typography>
      {onRetry && (
        <Button
          variant="outlined"
          size="small"
          onClick={onRetry}
          className="mt-1"
        >
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
    <Paper
      variant="outlined"
      className="flex flex-col items-center gap-2 px-8 py-16 text-center"
    >
      {icon && (
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: 2.5,
            mb: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "text.secondary",
            bgcolor: "action.hover",
          }}
        >
          {icon}
        </Box>
      )}
      <Typography variant="subtitle1">{title}</Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" className="max-w-md">
          {description}
        </Typography>
      )}
      {action && <Box className="mt-3">{action}</Box>}
    </Paper>
  );
}

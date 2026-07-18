import { Chip, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { Severity } from "@cms/shared";

const LABEL: Record<Severity, string> = {
  safe: "Safe",
  warning: "Warning",
  risky: "Risky",
  destructive: "Destructive",
};

export function SeverityChip({ severity }: { severity: Severity }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const base: Record<Severity, string> = {
    safe: theme.palette.success.main,
    warning: theme.palette.warning.main,
    risky: isDark ? "#fb923c" : "#ea580c",
    destructive: theme.palette.error.main,
  };
  const color = base[severity];
  return (
    <Chip
      size="small"
      label={LABEL[severity]}
      sx={{
        bgcolor: alpha(color, isDark ? 0.22 : 0.14),
        color,
        fontWeight: 600,
      }}
    />
  );
}

export const SEVERITY_RANK: Record<Severity, number> = {
  destructive: 0,
  risky: 1,
  warning: 2,
  safe: 3,
};

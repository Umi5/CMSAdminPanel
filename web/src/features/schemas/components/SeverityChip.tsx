import { Chip } from '@mui/material';
import type { Severity } from '@cms/shared';

const STYLES: Record<Severity, { label: string; color: string; bg: string }> = {
  safe: { label: 'Safe', color: '#166534', bg: '#dcfce7' },
  warning: { label: 'Warning', color: '#92400e', bg: '#fef3c7' },
  risky: { label: 'Risky', color: '#9a3412', bg: '#ffedd5' },
  destructive: { label: 'Destructive', color: '#991b1b', bg: '#fee2e2' },
};

export function SeverityChip({ severity }: { severity: Severity }) {
  const style = STYLES[severity];
  return (
    <Chip
      size="small"
      label={style.label}
      sx={{ bgcolor: style.bg, color: style.color, fontWeight: 700 }}
    />
  );
}

export const SEVERITY_RANK: Record<Severity, number> = {
  destructive: 0,
  risky: 1,
  warning: 2,
  safe: 3,
};

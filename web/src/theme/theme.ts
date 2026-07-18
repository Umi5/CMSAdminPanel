import { createTheme } from '@mui/material/styles';

/**
 * The single source of design tokens. MUI owns color, typography, radius and
 * elevation; Tailwind is used only for layout. Minimal-modern look: indigo
 * accent, slate neutrals, airy spacing, restrained borders.
 */
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#4f46e5', dark: '#4338ca', light: '#818cf8' },
    secondary: { main: '#0ea5e9' },
    background: { default: '#f8fafc', paper: '#ffffff' },
    text: { primary: '#0f172a', secondary: '#64748b' },
    divider: '#e5e7eb',
    success: { main: '#16a34a' },
    warning: { main: '#d97706' },
    error: { main: '#dc2626' },
    info: { main: '#2563eb' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    h4: { fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontWeight: 700, letterSpacing: '-0.015em' },
    h6: { fontWeight: 700, letterSpacing: '-0.01em' },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 10 } },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: {
          borderColor: '#e5e7eb',
          transition: 'border-color 120ms ease, box-shadow 120ms ease',
        },
      },
    },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
    MuiListItemButton: { styleOverrides: { root: { borderRadius: 8 } } },
    MuiTooltip: { styleOverrides: { tooltip: { fontSize: '0.75rem' } } },
  },
});

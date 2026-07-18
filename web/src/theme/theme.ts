import { createTheme, type Theme } from "@mui/material/styles";
import type { PaletteMode } from "@mui/material";

// Builds a shadow array for the theme based on the mode. The first shadow is always 'none', and the rest are the same raised shadow.
function buildShadows(mode: PaletteMode): Theme["shadows"] {
  const raised =
    mode === "dark"
      ? "0 2px 8px rgba(0,0,0,0.5)"
      : "0 1px 2px rgba(16,17,26,0.04), 0 2px 8px rgba(16,17,26,0.05)";
  return ["none", ...Array<string>(24).fill(raised)] as Theme["shadows"];
}

const ACCENT = { light: "#5E6AD2", dark: "#7c85e8" };

export function createAppTheme(mode: PaletteMode) {
  const isDark = mode === "dark";

  const palette = isDark
    ? {
        mode,
        primary: {
          main: ACCENT.dark,
          dark: ACCENT.light,
          light: "#9ba3ee",
          contrastText: "#fff",
        },
        secondary: { main: "#38bdf8" },
        background: { default: "#0d0e11", paper: "#16171b" },
        text: { primary: "#f7f8f8", secondary: "#8a8f98", disabled: "#5c606b" },
        divider: "#262830",
        action: {
          hover: "rgba(255,255,255,0.05)",
          selected: "rgba(124,133,232,0.16)",
        },
        success: { main: "#22c55e" },
        warning: { main: "#f59e0b" },
        error: { main: "#f87171" },
        info: { main: "#60a5fa" },
      }
    : {
        mode,
        primary: {
          main: ACCENT.light,
          dark: "#4f59b8",
          light: "#8b93e0",
          contrastText: "#fff",
        },
        secondary: { main: "#0ea5e9" },
        background: { default: "#f7f8fa", paper: "#ffffff" },
        text: { primary: "#1c1e26", secondary: "#6b7280", disabled: "#9ca3af" },
        divider: "#e8e8ec",
        action: {
          hover: "rgba(17,18,26,0.04)",
          selected: "rgba(94,106,210,0.10)",
        },
        success: { main: "#16a34a" },
        warning: { main: "#d97706" },
        error: { main: "#dc2626" },
        info: { main: "#2563eb" },
      };

  return createTheme({
    palette,
    shape: { borderRadius: 8 },
    shadows: buildShadows(mode),
    typography: {
      fontFamily:
        '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      h4: { fontWeight: 600, letterSpacing: "-0.02em" },
      h5: { fontWeight: 600, letterSpacing: "-0.015em" },
      h6: { fontWeight: 600, letterSpacing: "-0.01em" },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600 },
      button: { textTransform: "none", fontWeight: 500 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: (t) => ({
          code: {
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            fontSize: "0.85em",
            background: t.palette.action.hover,
            padding: "0.1em 0.35em",
            borderRadius: 4,
          },
          ":focus-visible": {
            outline: `2px solid ${t.palette.primary.main}`,
            outlineOffset: 2,
            borderRadius: 4,
          },
          "::selection": {
            background: isDark
              ? "rgba(124,133,232,0.35)"
              : "rgba(94,106,210,0.18)",
          },
          "*": {
            scrollbarColor: `${isDark ? "#3a3d47" : "#cbd5e1"} transparent`,
          },
          "*::-webkit-scrollbar": { width: 10, height: 10 },
          "*::-webkit-scrollbar-thumb": {
            background: isDark ? "#3a3d47" : "#cbd5e1",
            borderRadius: 8,
            border: "2px solid transparent",
            backgroundClip: "content-box",
          },
          "*::-webkit-scrollbar-thumb:hover": {
            background: isDark ? "#4a4e5a" : "#94a3b8",
            backgroundClip: "content-box",
          },
        }),
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { borderRadius: 6 } },
      },
      MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
      MuiCard: {
        defaultProps: { variant: "outlined" },
        styleOverrides: {
          root: { transition: "border-color 120ms ease" },
        },
      },
      MuiChip: { styleOverrides: { root: { fontWeight: 500 } } },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            "&.Mui-selected .MuiListItemText-primary": { color: "inherit" },
          },
        },
      },
      MuiTooltip: { styleOverrides: { tooltip: { fontSize: "0.75rem" } } },
    },
  });
}

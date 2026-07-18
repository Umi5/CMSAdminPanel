import { IconButton, Tooltip } from "@mui/material";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import { useColorMode } from "@/theme/ColorMode";

export function ThemeToggle() {
  const { mode, toggle } = useColorMode();
  const isDark = mode === "dark";
  return (
    <Tooltip title={isDark ? "Light mode" : "Dark mode"}>
      <IconButton
        onClick={toggle}
        size="small"
        aria-label="Toggle color mode"
        color="inherit"
      >
        {isDark ? (
          <LightModeRoundedIcon fontSize="small" />
        ) : (
          <DarkModeRoundedIcon fontSize="small" />
        )}
      </IconButton>
    </Tooltip>
  );
}

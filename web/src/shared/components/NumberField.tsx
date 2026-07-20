import { Box, IconButton, InputAdornment, TextField } from "@mui/material";
import type { SxProps, Theme } from "@mui/material";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";

/** Number input with a compact, theme-matching up/down stepper (the native
 *  spinner arrows are removed globally in the theme). Value is a raw string so
 *  callers keep control of parsing. */
export function NumberField({
  value,
  onChange,
  label,
  size,
  required,
  error,
  helperText,
  fullWidth,
  sx,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  size?: "small" | "medium";
  required?: boolean;
  error?: boolean;
  helperText?: string;
  fullWidth?: boolean;
  sx?: SxProps<Theme>;
}) {
  const step = (delta: number) => {
    const n = Number(value);
    onChange(String((Number.isFinite(n) ? n : 0) + delta));
  };

  const stepButton = (dir: 1 | -1) => (
    <IconButton
      size="small"
      tabIndex={-1}
      aria-label={dir === 1 ? "Increment" : "Decrement"}
      onClick={() => step(dir)}
      sx={{
        p: 0,
        width: 20,
        height: 15,
        borderRadius: 0.75,
        color: "text.secondary",
        "&:hover": { color: "text.primary", bgcolor: "action.hover" },
      }}
    >
      {dir === 1 ? (
        <KeyboardArrowUpRoundedIcon sx={{ fontSize: 16 }} />
      ) : (
        <KeyboardArrowDownRoundedIcon sx={{ fontSize: 16 }} />
      )}
    </IconButton>
  );

  return (
    <TextField
      type="number"
      label={label}
      size={size}
      required={required}
      error={error}
      helperText={helperText}
      fullWidth={fullWidth}
      sx={sx}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <Box sx={{ display: "flex", flexDirection: "column", mr: -0.75 }}>
                {stepButton(1)}
                {stepButton(-1)}
              </Box>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}

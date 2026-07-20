import { Box, Switch, TextField, Typography } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import type { Field } from "@cms/shared";
import { ReferenceField } from "./ReferenceField";
import { NumberField } from "@/shared/components/NumberField";

/** Renders the right input for a field's type — this is the dynamic form. */
export function FieldInput({
  field,
  value,
  error,
  onChange,
}: {
  field: Field;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
}) {
  switch (field.type) {
    case "text":
      return (
        <TextField
          label={field.name}
          required={field.required}
          fullWidth
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          error={Boolean(error)}
          helperText={error}
        />
      );
    case "number":
      return (
        <NumberField
          label={field.name}
          required={field.required}
          fullWidth
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(v) => onChange(v === "" ? undefined : Number(v))}
          error={Boolean(error)}
          helperText={error}
        />
      );
    case "boolean":
      // Align the label with the outlined text fields' 14px content inset; the
      // Switch's own padding lines its track up with the right content edge.
      return (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            pl: "14px",
            minHeight: 40,
          }}
        >
          <Typography variant="body2">{field.name}</Typography>
          <Switch
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
          />
        </Box>
      );
    case "date":
      return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label={field.name}
            value={typeof value === "string" && value ? dayjs(value) : null}
            onChange={(d) =>
              onChange(d && d.isValid() ? d.format("YYYY-MM-DD") : undefined)
            }
            slotProps={{
              textField: {
                fullWidth: true,
                required: field.required,
                error: Boolean(error),
                helperText: error,
              },
              field: { clearable: true },
            }}
          />
        </LocalizationProvider>
      );
    case "reference":
      return (
        <ReferenceField
          label={field.name}
          targetSchemaId={field.referenceSchemaId ?? ""}
          value={typeof value === "string" ? value : undefined}
          required={field.required}
          error={error}
          onChange={onChange}
        />
      );
  }
}

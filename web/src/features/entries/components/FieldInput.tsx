import { Box, Switch, TextField, Typography } from "@mui/material";
import type { Field } from "@cms/shared";
import { ReferenceField } from "./ReferenceField";

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
        <TextField
          label={field.name}
          required={field.required}
          type="number"
          fullWidth
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(e) =>
            onChange(e.target.value === "" ? undefined : Number(e.target.value))
          }
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
        <TextField
          label={field.name}
          required={field.required}
          type="date"
          fullWidth
          InputLabelProps={{ shrink: true }}
          value={typeof value === "string" ? value : ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? undefined : e.target.value)
          }
          error={Boolean(error)}
          helperText={error}
        />
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

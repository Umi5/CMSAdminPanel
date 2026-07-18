import { useState, type ReactNode } from 'react';
import { Box, Button, CircularProgress, Paper, Typography } from '@mui/material';
import type { Schema } from '@cms/shared';
import { FieldInput } from './FieldInput';
import { validateEntry } from '../util/validateEntry';

export function EntryForm({
  schema,
  initialValues,
  saving,
  submitLabel,
  onSubmit,
  onCancel,
  extraActions,
}: {
  schema: Schema;
  initialValues: Record<string, unknown>;
  saving: boolean;
  submitLabel: string;
  onSubmit: (values: Record<string, unknown>) => void;
  onCancel: () => void;
  extraActions?: ReactNode;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);
  const [submitted, setSubmitted] = useState(false);
  const errors = validateEntry(schema, values);

  const setValue = (fieldId: string, value: unknown) => setValues((v) => ({ ...v, [fieldId]: value }));

  const handleSubmit = () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    onSubmit(values);
  };

  return (
    <Box>
      <Paper variant="outlined" className="flex flex-col gap-4 p-5">
        {schema.fields.length === 0 ? (
          <Typography color="text.secondary">This content type has no fields yet.</Typography>
        ) : (
          schema.fields.map((field) => (
            <FieldInput
              key={field.id}
              field={field}
              value={values[field.id]}
              error={submitted ? errors[field.id] : undefined}
              onChange={(value) => setValue(field.id, value)}
            />
          ))
        )}
      </Paper>

      <Box className="flex flex-wrap items-center justify-between gap-2 mt-5">
        <Box>{extraActions}</Box>
        <Box className="flex items-center gap-2">
          <Button color="inherit" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {submitLabel}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

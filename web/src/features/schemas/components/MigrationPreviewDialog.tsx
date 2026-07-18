import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import type {
  FieldChange,
  MigrationOverrides,
  MigrationPlan,
} from "@cms/shared";
import { ReferenceSelect } from "@/shared/components/ReferenceSelect";
import { SeverityChip, SEVERITY_RANK } from "./SeverityChip";
import type { DraftField, SchemaDraftPayload } from "../hooks/useSchemaDraft";

const CHANGE_LABEL: Record<FieldChange["changeKind"], string> = {
  field_added: "New field",
  field_removed: "Field removed",
  field_renamed: "Renamed",
  field_retyped: "Type changed",
  required_enabled: "Now required",
  required_disabled: "Optional",
  reference_retargeted: "Reference retargeted",
};

function describe(change: FieldChange): string {
  switch (change.changeKind) {
    case "field_added":
      return change.needsAttention.length > 0
        ? `${change.needsAttention.length} existing entries need a value`
        : "New optional field — nothing to migrate";
    case "field_removed":
      return change.affectedCount > 0
        ? `${change.affectedCount} entries will lose this value`
        : "No entries had this value";
    case "field_renamed":
      return "Metadata only — no data affected";
    case "field_retyped":
      return `${change.cleanCount} of ${change.affectedCount} values convert automatically`;
    case "required_enabled":
      return change.needsAttention.length > 0
        ? `${change.needsAttention.length} entries are missing a value`
        : "Every entry already has a value";
    case "required_disabled":
      return "Loosened — no data affected";
    case "reference_retargeted":
      return change.needsAttention.length > 0
        ? `${change.needsAttention.length} references are no longer valid`
        : "All references still valid in the new target";
  }
}

function formatCurrent(value: unknown): string {
  if (value === null || value === undefined || value === "") return "(empty)";
  return typeof value === "string" ? `"${value}"` : String(value);
}

/** Type-aware input for a value the user must correct, driven by the field's NEW type. */
function FixInput({
  field,
  value,
  onChange,
}: {
  field: DraftField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (field.type === "number") {
    return (
      <TextField
        type="number"
        size="small"
        placeholder="number"
        value={value === undefined || value === null ? "" : String(value)}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : Number(e.target.value))
        }
        sx={{ minWidth: 140 }}
      />
    );
  }
  if (field.type === "boolean") {
    return (
      <TextField
        select
        size="small"
        value={value === true ? "true" : value === false ? "false" : ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : e.target.value === "true")
        }
        sx={{ minWidth: 140 }}
      >
        <MenuItem value="">(clear)</MenuItem>
        <MenuItem value="true">true</MenuItem>
        <MenuItem value="false">false</MenuItem>
      </TextField>
    );
  }
  if (field.type === "date") {
    return (
      <TextField
        type="date"
        size="small"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value || null)}
        InputLabelProps={{ shrink: true }}
        sx={{ minWidth: 160 }}
      />
    );
  }
  if (field.type === "reference") {
    return (
      <ReferenceSelect
        targetSchemaId={field.referenceSchemaId ?? ""}
        value={typeof value === "string" ? value : undefined}
        onChange={onChange}
        placeholder="Pick a valid entry"
      />
    );
  }
  return (
    <TextField
      size="small"
      placeholder="value"
      value={value === undefined || value === null ? "" : String(value)}
      onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
      sx={{ minWidth: 160 }}
    />
  );
}

export function MigrationPreviewDialog({
  open,
  schemaName,
  draft,
  plan,
  saving,
  applyError,
  onCancel,
  onApply,
}: {
  open: boolean;
  schemaName: string;
  draft: SchemaDraftPayload;
  plan: MigrationPlan;
  saving: boolean;
  applyError: string | null;
  onCancel: () => void;
  onApply: (overrides: MigrationOverrides) => void;
}) {
  // values[entryId][fieldId] = corrected value the user typed
  const [values, setValues] = useState<Record<string, Record<string, unknown>>>(
    {},
  );

  const setFix = (entryId: string, fieldId: string, value: unknown) => {
    setValues((prev) => ({
      ...prev,
      [entryId]: { ...prev[entryId], [fieldId]: value },
    }));
  };

  const draftFieldOf = (fieldId: string): DraftField | undefined =>
    draft.fields.find((f) => f.id === fieldId);

  const orderedChanges = [...plan.changes].sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
  );

  const handleApply = () => {
    // Every flagged value becomes an override (typed value, or null to clear).
    const overrides: MigrationOverrides = {};
    for (const change of plan.changes) {
      for (const issue of change.needsAttention) {
        const entered = values[issue.entryId]?.[change.fieldId];
        const bucket = overrides[issue.entryId] ?? {};
        bucket[change.fieldId] = entered === undefined ? null : entered;
        overrides[issue.entryId] = bucket;
      }
    }
    onApply(overrides);
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onCancel}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Review changes to “{schemaName}”</DialogTitle>
      <DialogContent dividers>
        <Alert
          severity={plan.totalNeedsAttention > 0 ? "warning" : "info"}
          className="mb-4"
        >
          {plan.changes.length} change{plan.changes.length === 1 ? "" : "s"}.{" "}
          {plan.totalNeedsAttention > 0
            ? `${plan.totalNeedsAttention} value${plan.totalNeedsAttention === 1 ? "" : "s"} need a fix before applying.`
            : "No values need fixing — safe to apply."}
        </Alert>

        <Box className="flex flex-col gap-3">
          {orderedChanges.map((change) => {
            const field = draftFieldOf(change.fieldId);
            return (
              <Paper
                key={`${change.fieldId}-${change.changeKind}`}
                variant="outlined"
                className="p-4"
              >
                <Box className="flex flex-wrap items-center gap-2">
                  <SeverityChip severity={change.severity} />
                  <Typography fontWeight={700}>{change.fieldName}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {CHANGE_LABEL[change.changeKind]}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  className="mt-1"
                >
                  {describe(change)}
                </Typography>

                {change.needsAttention.length > 0 && field && (
                  <Box className="mt-3 flex flex-col gap-2">
                    {change.needsAttention.map((issue) => (
                      <Box
                        key={issue.entryId}
                        className="flex flex-wrap items-center gap-x-3 gap-y-1"
                      >
                        <Typography variant="body2" sx={{ minWidth: 120 }}>
                          {formatCurrent(issue.currentValue)}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ flex: 1, minWidth: 140 }}
                        >
                          {issue.reason}
                        </Typography>
                        <FixInput
                          field={field}
                          value={values[issue.entryId]?.[change.fieldId]}
                          onChange={(value) =>
                            setFix(issue.entryId, change.fieldId, value)
                          }
                        />
                      </Box>
                    ))}
                  </Box>
                )}
              </Paper>
            );
          })}
        </Box>

        {applyError && (
          <Alert severity="error" className="mt-4">
            {applyError}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleApply}
          disabled={saving}
          startIcon={
            saving ? <CircularProgress size={16} color="inherit" /> : undefined
          }
        >
          Apply changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}

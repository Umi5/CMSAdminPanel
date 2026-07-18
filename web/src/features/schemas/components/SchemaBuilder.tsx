import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { useSchemas } from "@/shared/schema/SchemaProvider";
import { slugify } from "@/shared/util/slug";
import { FieldEditor } from "./FieldEditor";
import {
  useSchemaDraft,
  validateDraft,
  type SchemaDraftPayload,
} from "../hooks/useSchemaDraft";

export function SchemaBuilder({
  mode,
  initial,
  currentSchemaId,
  saving,
  onSubmit,
  onCancel,
}: {
  mode: "create" | "edit";
  initial: SchemaDraftPayload;
  currentSchemaId?: string;
  saving: boolean;
  onSubmit: (draft: SchemaDraftPayload) => void;
  onCancel: () => void;
}) {
  const { schemas } = useSchemas();
  const draft = useSchemaDraft(initial);
  const [apiIdEdited, setApiIdEdited] = useState(mode === "edit");
  const [submitted, setSubmitted] = useState(false);

  const errors = validateDraft(draft.name, draft.apiId, draft.fields);
  const shown = (message?: string) => (submitted ? message : undefined);

  // In edit mode you can reference the type itself; in create mode it doesn't exist yet.
  const referenceOptions = schemas;

  const handleName = (value: string) => {
    draft.setName(value);
    if (mode === "create" && !apiIdEdited) draft.setApiId(slugify(value));
  };

  const handleSubmit = () => {
    setSubmitted(true);
    if (errors.hasErrors) return;
    onSubmit(draft.toPayload());
  };

  const sectionLabel = {
    display: "block",
    mb: 1,
    color: "text.secondary",
    fontWeight: 600,
    fontSize: 11,
    letterSpacing: "0.06em",
  } as const;

  return (
    <Box>
      <Typography variant="caption" sx={sectionLabel}>
        DETAILS
      </Typography>
      <Paper variant="outlined" className="p-5 mb-6">
        <Box className="flex flex-wrap gap-4">
          <TextField
            label="Name"
            value={draft.name}
            onChange={(e) => handleName(e.target.value)}
            error={Boolean(shown(errors.name))}
            helperText={shown(errors.name)}
            sx={{ flex: 1, minWidth: 220 }}
          />
          <TextField
            label="API id"
            value={draft.apiId}
            onChange={(e) => {
              setApiIdEdited(true);
              draft.setApiId(e.target.value);
            }}
            error={Boolean(shown(errors.apiId))}
            helperText={
              shown(errors.apiId) ??
              "Used in the read API URL, e.g. /api/content/wine"
            }
            sx={{ flex: 1, minWidth: 220 }}
          />
        </Box>
        {mode === "edit" && initial.apiId !== draft.apiId && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Changing the API id changes this type’s public read-API URL.
          </Alert>
        )}
      </Paper>

      <Box className="flex items-center justify-between mb-2">
        <Typography variant="caption" sx={sectionLabel}>
          FIELDS · {draft.fields.length}
        </Typography>
        <Button
          size="small"
          startIcon={<AddRoundedIcon />}
          onClick={draft.addField}
        >
          Add field
        </Button>
      </Box>

      <Paper variant="outlined">
        {draft.fields.length === 0 ? (
          <Box className="px-4 py-8 text-center">
            <Typography color="text.secondary">
              No fields yet — add your first field.
            </Typography>
          </Box>
        ) : (
          draft.fields.map((field, index) => (
            <FieldEditor
              key={field.id}
              field={field}
              index={index}
              total={draft.fields.length}
              schemas={referenceOptions}
              currentSchemaId={currentSchemaId}
              error={shown(errors.fields[field.id])}
              onChange={(patch) => draft.updateField(field.id, patch)}
              onRemove={() => draft.removeField(field.id)}
              onMove={draft.moveField}
            />
          ))
        )}
      </Paper>
      {submitted && draft.fields.length === 0 && (
        <Typography variant="body2" color="error" className="mt-2">
          Add at least one field.
        </Typography>
      )}

      <Box className="flex items-center justify-end gap-2 mt-5">
        <Button color="inherit" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving}
          startIcon={
            saving ? <CircularProgress size={16} color="inherit" /> : undefined
          }
        >
          {mode === "create" ? "Create content type" : "Review & save"}
        </Button>
      </Box>
    </Box>
  );
}

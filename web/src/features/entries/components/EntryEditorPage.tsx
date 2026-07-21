import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Box, Button } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import type { Entry, Schema } from "@cms/shared";
import { ApiError } from "@/shared/api/client";
import { useSchemas } from "@/shared/schema/SchemaProvider";
import { useToast } from "@/shared/toast/ToastProvider";
import { useFetch } from "@/shared/hooks/useFetch";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { useSchemaEvents } from "@/shared/hooks/useSchemaEvents";
import { PageHeader } from "@/shared/components/PageHeader";
import { LoadingState, EmptyState } from "@/shared/components/StateViews";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { EntryForm } from "./EntryForm";
import { entriesApi } from "../api/entries.api";

export function EntryEditorPage() {
  const { schemaId, entryId } = useParams();
  const isEdit = Boolean(entryId);
  const navigate = useNavigate();
  const { getSchema, loading: schemasLoading } = useSchemas();
  const { showToast } = useToast();
  const liveSchema = schemaId ? getSchema(schemaId) : undefined;
  const listPath = `/schemas/${schemaId}`;

  const {
    data: entry,
    loading: entryLoading,
    refetch: refetchEntry,
  } = useFetch<Entry>(
    isEdit && schemaId ? `/schemas/${schemaId}/entries/${entryId}` : null,
  );

  // Pin the schema the form opened against. A migration applied elsewhere updates
  // the live schema, but we keep the form frozen on the pinned one and surface a
  // banner — so fields never rearrange under the user mid-edit.
  const [pinnedSchema, setPinnedSchema] = useState<Schema | undefined>(
    () => liveSchema,
  );
  useEffect(() => {
    setPinnedSchema((prev) => prev ?? liveSchema);
  }, [liveSchema]);
  const [schemaChanged, setSchemaChanged] = useState(false);
  /** Set when this page triggers the delete, so we ignore the echoed event. */
  const selfDeleted = useRef(false);

  useSchemaEvents(schemaId ?? null, (event) => {
    if (event.type === "schema.updated") setSchemaChanged(true);
    if (event.type === "schema.deleted") {
      showToast("This content type was deleted", "info");
      navigate("/schemas");
    }
    if (event.type === "entry.deleted" && event.entryId === entryId) {
      // Our own delete already toasts (red) and navigates; the echoed event
      // would otherwise overwrite it with the blue "deleted elsewhere" notice.
      if (selfDeleted.current) return;
      showToast("This entry was deleted", "info");
      navigate(listPath);
    }
  });

  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  useDocumentTitle(isEdit ? "Edit entry" : "New entry");

  if (schemasLoading && !liveSchema) return <LoadingState />;
  if (!liveSchema) {
    return (
      <EmptyState
        title="Content type not found"
        action={
          <Button variant="contained" onClick={() => navigate("/schemas")}>
            Back to content types
          </Button>
        }
      />
    );
  }
  if (!pinnedSchema) return <LoadingState />;
  if (isEdit && entryLoading) return <LoadingState label="Loading entry…" />;
  if (isEdit && !entry) {
    return (
      <EmptyState
        title="Entry not found"
        action={
          <Button variant="contained" onClick={() => navigate(listPath)}>
            Back to entries
          </Button>
        }
      />
    );
  }

  const schema = pinnedSchema;
  const initialValues = isEdit ? (entry?.values ?? {}) : {};

  const reloadWithLatestSchema = () => {
    setPinnedSchema(schemaId ? getSchema(schemaId) : undefined);
    setSchemaChanged(false);
    void refetchEntry();
  };

  const submit = async (values: Record<string, unknown>) => {
    if (!schemaId) return;
    setSaving(true);
    try {
      if (isEdit && entryId) {
        await entriesApi.update(schemaId, entryId, values);
        showToast("Entry saved", "info");
      } else {
        await entriesApi.create(schemaId, values);
        showToast("Entry created", "success");
      }
      navigate(listPath);
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : "Failed to save entry",
        "error",
      );
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!schemaId || !entryId) return;
    setDeleting(true);
    selfDeleted.current = true;
    try {
      await entriesApi.remove(schemaId, entryId);
      showToast("Entry deleted", "error");
      navigate(listPath);
    } catch (err) {
      selfDeleted.current = false;
      showToast(
        err instanceof ApiError ? err.message : "Failed to delete entry",
        "error",
      );
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <Box>
      <Button
        startIcon={<ArrowBackRoundedIcon />}
        onClick={() => navigate(listPath)}
        size="small"
        color="inherit"
        className="mb-2"
      >
        {schema.name} entries
      </Button>
      <PageHeader
        title={
          isEdit ? `Edit ${schema.name} entry` : `New ${schema.name} entry`
        }
      />

      {schemaChanged && (
        <Alert
          severity="warning"
          className="mb-4"
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={<RefreshRoundedIcon />}
              onClick={reloadWithLatestSchema}
            >
              Reload
            </Button>
          }
        >
          This content type changed while you were editing. Reload to continue
          with the latest fields — unsaved changes will be lost.
        </Alert>
      )}

      <EntryForm
        key={`${entry?.id ?? "new"}:${entry?.updatedAt ?? ""}:${schema.version}`}
        schema={schema}
        initialValues={initialValues}
        saving={saving}
        submitLabel={isEdit ? "Save changes" : "Create entry"}
        onSubmit={submit}
        onCancel={() => navigate(listPath)}
        extraActions={
          isEdit ? (
            <Button
              color="error"
              startIcon={<DeleteOutlineRoundedIcon />}
              onClick={() => setConfirmOpen(true)}
              disabled={saving}
            >
              Delete
            </Button>
          ) : undefined
        }
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Delete entry?"
        message="This permanently deletes this entry."
        confirmLabel="Delete"
        confirmColor="error"
        busy={deleting}
        onConfirm={remove}
        onClose={() => setConfirmOpen(false)}
      />
    </Box>
  );
}

import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Button } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import type { MigrationOverrides, MigrationPlan, Schema } from "@cms/shared";
import { api, ApiError } from "@/shared/api/client";
import { useSchemas } from "@/shared/schema/SchemaProvider";
import { useToast } from "@/shared/toast/ToastProvider";
import { PageHeader } from "@/shared/components/PageHeader";
import { LoadingState, EmptyState } from "@/shared/components/StateViews";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { SchemaBuilder } from "./SchemaBuilder";
import { MigrationPreviewDialog } from "./MigrationPreviewDialog";
import {
  draftsEqual,
  newDraftField,
  schemaToDraft,
  type SchemaDraftPayload,
} from "../hooks/useSchemaDraft";

interface PreviewState {
  plan: MigrationPlan;
  draft: SchemaDraftPayload;
}

export function SchemaBuilderPage() {
  const { schemaId } = useParams();
  const mode: "create" | "edit" = schemaId ? "edit" : "create";
  const navigate = useNavigate();
  const { getSchema, loading } = useSchemas();
  const { showToast } = useToast();

  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  useDocumentTitle(
    mode === "create" ? "New content type" : "Edit content type",
  );

  const existing =
    mode === "edit" && schemaId ? getSchema(schemaId) : undefined;
  const backTo =
    mode === "edit" && schemaId ? `/schemas/${schemaId}` : "/schemas";

  if (mode === "edit") {
    if (loading && !existing)
      return <LoadingState label="Loading content type…" />;
    if (!existing) {
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
  }

  const initial: SchemaDraftPayload = existing
    ? schemaToDraft(existing)
    : { name: "", apiId: "", fields: [newDraftField()] };

  const submit = async (draft: SchemaDraftPayload) => {
    if (mode === "create") {
      setSaving(true);
      try {
        const created = await api.post<Schema>("/schemas", draft);
        showToast(`Created “${created.name}”`);
        navigate(`/schemas/${created.id}`);
      } catch (err) {
        showToast(
          err instanceof ApiError
            ? err.message
            : "Failed to create content type",
          "error",
        );
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!schemaId) return;
    setSaving(true);
    try {
      const plan = await api.post<MigrationPlan>(
        `/schemas/${schemaId}/migration-plan`,
        { draft },
      );
      // An empty plan only means "no entry is affected". Renaming the type or
      // changing its apiId touches no data, so it would otherwise be silently
      // dropped here. Compare against what is stored instead.
      const unchanged =
        existing !== undefined && draftsEqual(draft, schemaToDraft(existing));

      if (plan.changes.length === 0 && unchanged) {
        showToast("No changes to apply", "info");
        navigate(backTo);
        return;
      }
      if (plan.changes.every((c) => c.severity === "safe")) {
        await api.post(`/schemas/${schemaId}/migrate`, {
          draft,
          basedOnVersion: plan.basedOnVersion,
          overrides: {},
        });
        showToast("Changes applied", "info");
        navigate(backTo);
        return;
      }
      // Non-trivial change: let the user review (and fix values) before applying.
      setPreview({ plan, draft });
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : "Failed to plan changes",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const applyMigration = async (overrides: MigrationOverrides) => {
    if (!schemaId || !preview) return;
    setSaving(true);
    setApplyError(null);
    try {
      await api.post(`/schemas/${schemaId}/migrate`, {
        draft: preview.draft,
        basedOnVersion: preview.plan.basedOnVersion,
        overrides,
      });
      showToast("Changes applied");
      setPreview(null);
      navigate(backTo);
    } catch (err) {
      // A 409 means the data moved under us (schema changed, or a concurrent edit
      // introduced a value that no longer converts). The server returns a fresh
      // plan; swap it into the dialog so the user sees exactly what still needs
      // attention. Values already typed are preserved (the dialog keeps its state).
      if (err instanceof ApiError && err.status === 409) {
        const conflict = err.details as
          | { reason?: string; plan?: MigrationPlan }
          | undefined;
        if (conflict?.plan) {
          setPreview({ plan: conflict.plan, draft: preview.draft });
          setApplyError(
            conflict.reason === "stale"
              ? "This content type changed since you opened this. The report below is refreshed — review and apply again."
              : "The impact report has been refreshed below. Resolve the flagged values and apply again.",
          );
          return;
        }
      }
      setApplyError(
        err instanceof ApiError ? err.message : "Failed to apply changes",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Button
        startIcon={<ArrowBackRoundedIcon />}
        onClick={() => navigate(backTo)}
        size="small"
        color="inherit"
        className="mb-2"
      >
        Back
      </Button>
      <PageHeader
        title={
          mode === "create"
            ? "New content type"
            : `Edit ${existing?.name ?? ""}`
        }
        subtitle={
          mode === "create"
            ? "Define the fields for your new content type."
            : "Edits are a local draft — nothing is saved until you review and apply."
        }
      />

      <SchemaBuilder
        key={existing?.id ?? "new"}
        mode={mode}
        initial={initial}
        currentSchemaId={existing?.id}
        saving={saving}
        onSubmit={submit}
        onCancel={() => navigate(backTo)}
      />

      {preview && (
        <MigrationPreviewDialog
          open
          schemaName={existing?.name ?? preview.draft.name}
          draft={preview.draft}
          plan={preview.plan}
          saving={saving}
          applyError={applyError}
          onCancel={() => {
            setPreview(null);
            setApplyError(null);
          }}
          onApply={applyMigration}
        />
      )}
    </Box>
  );
}

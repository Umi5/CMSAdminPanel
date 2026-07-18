import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Paper } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import type { EntryCounts } from "@cms/shared";
import { useSchemas } from "@/shared/schema/SchemaProvider";
import { useEvents } from "@/shared/realtime/EventsProvider";
import { useFetch } from "@/shared/hooks/useFetch";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { PageHeader } from "@/shared/components/PageHeader";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/shared/components/StateViews";
import { SchemaCard } from "./SchemaCard";

export function SchemaListPage() {
  const navigate = useNavigate();
  const { schemas, loading, error, reload } = useSchemas();
  const { data: counts, refetch: refetchCounts } = useFetch<EntryCounts>(
    "/stats/entry-counts",
  );
  const { subscribe } = useEvents();
  useDocumentTitle("Content types");

  // Keep the entry counts live as entries and types come and go.
  useEffect(
    () =>
      subscribe((event) => {
        if (
          event.type.startsWith("entry.") ||
          event.type === "schema.created" ||
          event.type === "schema.deleted"
        ) {
          void refetchCounts();
        }
      }),
    [subscribe, refetchCounts],
  );

  const newTypeButton = (
    <Button
      variant="contained"
      startIcon={<AddRoundedIcon />}
      onClick={() => navigate("/schemas/new")}
    >
      New type
    </Button>
  );

  return (
    <Box>
      <PageHeader
        title="Content types"
        subtitle="Define the shapes of your content and manage their entries."
        actions={newTypeButton}
      />

      {loading ? (
        <LoadingState label="Loading content types…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : schemas.length === 0 ? (
        <EmptyState
          icon={<CategoryRoundedIcon sx={{ fontSize: 40 }} />}
          title="No content types yet"
          description="Create your first content type to start modelling content."
          action={newTypeButton}
        />
      ) : (
        <Paper
          variant="outlined"
          sx={{
            overflow: "hidden",
            "& > *:not(:first-of-type)": {
              borderTop: 1,
              borderColor: "divider",
            },
          }}
        >
          {schemas.map((schema) => (
            <SchemaCard
              key={schema.id}
              schema={schema}
              entryCount={counts?.[schema.id]}
              onOpen={() => navigate(`/schemas/${schema.id}`)}
            />
          ))}
        </Paper>
      )}
    </Box>
  );
}

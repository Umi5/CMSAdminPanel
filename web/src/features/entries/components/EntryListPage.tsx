import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import type { Entry } from '@cms/shared';
import { api, ApiError } from '@/shared/api/client';
import { useSchemas } from '@/shared/schema/SchemaProvider';
import { useToast } from '@/shared/toast/ToastProvider';
import { useFetch } from '@/shared/hooks/useFetch';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useSchemaEvents } from '@/shared/hooks/useSchemaEvents';
import { PageHeader } from '@/shared/components/PageHeader';
import { LoadingState, ErrorState, EmptyState } from '@/shared/components/StateViews';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { formatFieldValue } from '@/shared/util/formatValue';
import { useReferenceResolver } from '../hooks/useReferenceResolver';

const MAX_COLUMNS = 6;

export function EntryListPage() {
  const { schemaId } = useParams();
  const navigate = useNavigate();
  const { getSchema, loading: schemasLoading } = useSchemas();
  const { showToast } = useToast();
  const schema = schemaId ? getSchema(schemaId) : undefined;

  const { data: entries, loading, error, refetch } = useFetch<Entry[]>(
    schemaId ? `/schemas/${schemaId}/entries` : null,
  );
  useSchemaEvents(schemaId ?? null, (event) => {
    if (event.type.startsWith('entry.')) void refetch();
  });
  const resolveRef = useReferenceResolver(schema);

  const [deleteTarget, setDeleteTarget] = useState<Entry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteType, setConfirmDeleteType] = useState(false);
  const [deletingType, setDeletingType] = useState(false);
  useDocumentTitle(schema?.name ?? 'Content type');

  if (schemasLoading && !schema) return <LoadingState />;
  if (!schema) {
    return (
      <EmptyState
        title="Content type not found"
        action={
          <Button variant="contained" onClick={() => navigate('/schemas')}>
            Back to content types
          </Button>
        }
      />
    );
  }

  const columns = schema.fields.slice(0, MAX_COLUMNS);
  const rows = entries ?? [];

  const deleteEntry = async () => {
    if (!schemaId || !deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/schemas/${schemaId}/entries/${deleteTarget.id}`);
      showToast('Entry deleted');
      setDeleteTarget(null);
      void refetch();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to delete', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const deleteType = async () => {
    if (!schemaId) return;
    setDeletingType(true);
    try {
      await api.delete(`/schemas/${schemaId}`);
      showToast(`Deleted “${schema.name}”`);
      navigate('/schemas');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to delete', 'error');
      setDeletingType(false);
      setConfirmDeleteType(false);
    }
  };

  return (
    <Box>
      <Button
        startIcon={<ArrowBackRoundedIcon />}
        onClick={() => navigate('/schemas')}
        size="small"
        color="inherit"
        className="mb-2"
      >
        Content types
      </Button>
      <PageHeader
        title={schema.name}
        subtitle={
          <>
            API id <code>{schema.apiId}</code> · {rows.length} {rows.length === 1 ? 'entry' : 'entries'}
          </>
        }
        actions={
          <>
            <Button
              variant="outlined"
              startIcon={<TuneRoundedIcon />}
              onClick={() => navigate(`/schemas/${schema.id}/edit`)}
            >
              Edit fields
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteOutlineRoundedIcon />}
              onClick={() => setConfirmDeleteType(true)}
            >
              Delete type
            </Button>
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={() => navigate(`/schemas/${schema.id}/entries/new`)}
            >
              New entry
            </Button>
          </>
        }
      />

      {loading ? (
        <LoadingState label="Loading entries…" />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Inventory2RoundedIcon sx={{ fontSize: 40 }} />}
          title="No entries yet"
          description={`Create the first ${schema.name} entry.`}
          action={
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={() => navigate(`/schemas/${schema.id}/entries/new`)}
            >
              New entry
            </Button>
          }
        />
      ) : (
        <Paper variant="outlined" className="overflow-x-auto">
          <Table>
            <TableHead>
              <TableRow>
                {columns.map((field) => (
                  <TableCell key={field.id} sx={{ fontWeight: 700 }}>
                    {field.name}
                  </TableCell>
                ))}
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((entry) => (
                <TableRow
                  key={entry.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/schemas/${schema.id}/entries/${entry.id}`)}
                >
                  {columns.map((field) => (
                    <TableCell key={field.id}>
                      {formatFieldValue(field, entry.values[field.id], resolveRef)}
                    </TableCell>
                  ))}
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/schemas/${schema.id}/entries/${entry.id}`)}
                        aria-label="Edit entry"
                      >
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setDeleteTarget(entry)}
                        aria-label="Delete entry"
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete entry?"
        message="This permanently deletes this entry."
        confirmLabel="Delete"
        confirmColor="error"
        busy={deleting}
        onConfirm={deleteEntry}
        onClose={() => setDeleteTarget(null)}
      />
      <ConfirmDialog
        open={confirmDeleteType}
        title={`Delete “${schema.name}”?`}
        message="This permanently deletes the content type and all of its entries. This cannot be undone."
        confirmLabel="Delete"
        confirmColor="error"
        busy={deletingType}
        onConfirm={deleteType}
        onClose={() => setConfirmDeleteType(false)}
      />
    </Box>
  );
}

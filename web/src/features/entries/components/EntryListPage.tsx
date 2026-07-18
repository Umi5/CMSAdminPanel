import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Button,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Popover,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import type { Entry } from "@cms/shared";
import { api, ApiError } from "@/shared/api/client";
import { useSchemas } from "@/shared/schema/SchemaProvider";
import { useToast } from "@/shared/toast/ToastProvider";
import { useFetch } from "@/shared/hooks/useFetch";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { useSchemaEvents } from "@/shared/hooks/useSchemaEvents";
import { PageHeader } from "@/shared/components/PageHeader";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/shared/components/StateViews";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { formatFieldValue } from "@/shared/util/formatValue";
import { useReferenceResolver } from "../hooks/useReferenceResolver";

const MAX_COLUMNS = 6;

export function EntryListPage() {
  const { schemaId } = useParams();
  const navigate = useNavigate();
  const { getSchema, loading: schemasLoading } = useSchemas();
  const { showToast } = useToast();
  const schema = schemaId ? getSchema(schemaId) : undefined;

  const {
    data: entries,
    loading,
    error,
    refetch,
  } = useFetch<Entry[]>(schemaId ? `/schemas/${schemaId}/entries` : null);
  useSchemaEvents(schemaId ?? null, (event) => {
    if (event.type.startsWith("entry.")) void refetch();
  });
  const resolveRef = useReferenceResolver(schema);

  const [deleteTarget, setDeleteTarget] = useState<Entry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteType, setConfirmDeleteType] = useState(false);
  const [deletingType, setDeletingType] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  useDocumentTitle(schema?.name ?? "Content type");

  if (schemasLoading && !schema) return <LoadingState />;
  if (!schema) {
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

  const columns = schema.fields.slice(0, MAX_COLUMNS);
  const rows = entries ?? [];

  // Client-side search + per-field filters (number fields are not filterable).
  const filterableFields = columns.filter((f) => f.type !== "number");
  const activeFilterCount = filterableFields.filter((f) =>
    f.type === "date"
      ? Boolean(filters[`${f.id}__from`] || filters[`${f.id}__to`])
      : Boolean(filters[f.id]),
  ).length;
  const query = search.trim().toLowerCase();

  // Reference filter options: the referenced entries actually present in the rows.
  const referenceOptions: Record<string, { id: string; label: string }[]> = {};
  for (const field of filterableFields) {
    if (field.type !== "reference") continue;
    const targetId = field.referenceSchemaId ?? "";
    const ids = new Set<string>();
    for (const entry of rows) {
      const v = entry.values[field.id];
      if (typeof v === "string" && v) ids.add(v);
    }
    referenceOptions[field.id] = [...ids]
      .map((id) => ({ id, label: resolveRef(targetId, id) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  const filteredRows = rows.filter((entry) => {
    if (query) {
      const haystack = columns
        .map((f) => formatFieldValue(f, entry.values[f.id], resolveRef))
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    for (const field of filterableFields) {
      if (field.type === "date") {
        const raw = entry.values[field.id];
        const v = typeof raw === "string" ? raw : "";
        const from = filters[`${field.id}__from`];
        const to = filters[`${field.id}__to`];
        if (from && (!v || v < from)) return false;
        if (to && (!v || v > to)) return false;
        continue;
      }
      const fv = filters[field.id];
      if (!fv) continue;
      if (field.type === "boolean") {
        const isYes = entry.values[field.id] === true;
        if (fv === "yes" && !isYes) return false;
        if (fv === "no" && isYes) return false;
      } else if (field.type === "reference") {
        if (entry.values[field.id] !== fv) return false;
      } else {
        const cell = formatFieldValue(
          field,
          entry.values[field.id],
          resolveRef,
        ).toLowerCase();
        if (!cell.includes(fv.toLowerCase())) return false;
      }
    }
    return true;
  });

  const setFilter = (id: string, value: string) =>
    setFilters((prev) => {
      const next = { ...prev };
      if (value) next[id] = value;
      else delete next[id];
      return next;
    });

  const deleteEntry = async () => {
    if (!schemaId || !deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/schemas/${schemaId}/entries/${deleteTarget.id}`);
      showToast("Entry deleted", "error");
      setDeleteTarget(null);
      void refetch();
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : "Failed to delete",
        "error",
      );
    } finally {
      setDeleting(false);
    }
  };

  const deleteType = async () => {
    if (!schemaId) return;
    setDeletingType(true);
    try {
      await api.delete(`/schemas/${schemaId}`);
      showToast(`Deleted “${schema.name}”`, "error");
      navigate("/schemas");
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : "Failed to delete",
        "error",
      );
      setDeletingType(false);
      setConfirmDeleteType(false);
    }
  };

  return (
    <Box>
      <Button
        startIcon={<ArrowBackRoundedIcon />}
        onClick={() => navigate("/schemas")}
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
            API id <code>{schema.apiId}</code> · {rows.length}{" "}
            {rows.length === 1 ? "entry" : "entries"}
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
        <>
          <Box className="flex flex-wrap items-center gap-2 mb-3">
            <TextField
              size="small"
              placeholder="Search entries…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon
                      fontSize="small"
                      sx={{ color: "text.disabled" }}
                    />
                  </InputAdornment>
                ),
              }}
              sx={{ width: { xs: "100%", sm: 260 } }}
            />
            <Box className="ml-auto">
              <Button
                variant="outlined"
                startIcon={<FilterListRoundedIcon />}
                onClick={(e) => setFilterAnchor(e.currentTarget)}
                sx={{
                  height: 40,
                  px: 2,
                  color: "text.secondary",
                  borderColor: "divider",
                  "&:hover": {
                    borderColor: "text.disabled",
                    bgcolor: "action.hover",
                  },
                }}
              >
                Filters
                {activeFilterCount > 0 && (
                  <Box
                    component="span"
                    sx={{
                      ml: 1,
                      minWidth: 18,
                      height: 18,
                      px: 0.5,
                      borderRadius: 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {activeFilterCount}
                  </Box>
                )}
              </Button>
            </Box>
          </Box>

          <Popover
            open={Boolean(filterAnchor)}
            anchorEl={filterAnchor}
            onClose={() => setFilterAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            slotProps={{ paper: { sx: { mt: 1, width: 320 } } }}
          >
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <Box className="flex flex-col gap-3 p-3">
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                  }}
                >
                  FILTERS
                </Typography>
                {filterableFields.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No filterable fields.
                  </Typography>
                ) : (
                  filterableFields.map((field) => {
                    if (field.type === "boolean") {
                      return (
                        <TextField
                          key={field.id}
                          select
                          size="small"
                          label={field.name}
                          value={filters[field.id] ?? ""}
                          onChange={(e) => setFilter(field.id, e.target.value)}
                        >
                          <MenuItem value="">All</MenuItem>
                          <MenuItem value="yes">Yes</MenuItem>
                          <MenuItem value="no">No</MenuItem>
                        </TextField>
                      );
                    }
                    if (field.type === "reference") {
                      return (
                        <TextField
                          key={field.id}
                          select
                          size="small"
                          label={field.name}
                          value={filters[field.id] ?? ""}
                          onChange={(e) => setFilter(field.id, e.target.value)}
                        >
                          <MenuItem value="">All</MenuItem>
                          {(referenceOptions[field.id] ?? []).map((opt) => (
                            <MenuItem key={opt.id} value={opt.id}>
                              {opt.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      );
                    }
                    if (field.type === "date") {
                      const fromKey = `${field.id}__from`;
                      const toKey = `${field.id}__to`;
                      return (
                        <Box key={field.id} className="flex flex-col gap-3">
                          <DatePicker
                            label={`${field.name} from`}
                            value={
                              filters[fromKey] ? dayjs(filters[fromKey]) : null
                            }
                            onChange={(d) =>
                              setFilter(
                                fromKey,
                                d && d.isValid() ? d.format("YYYY-MM-DD") : "",
                              )
                            }
                            slotProps={{
                              textField: { size: "small", fullWidth: true },
                              field: { clearable: true },
                            }}
                          />
                          <DatePicker
                            label={`${field.name} to`}
                            value={
                              filters[toKey] ? dayjs(filters[toKey]) : null
                            }
                            onChange={(d) =>
                              setFilter(
                                toKey,
                                d && d.isValid() ? d.format("YYYY-MM-DD") : "",
                              )
                            }
                            slotProps={{
                              textField: { size: "small", fullWidth: true },
                              field: { clearable: true },
                            }}
                          />
                        </Box>
                      );
                    }
                    return (
                      <TextField
                        key={field.id}
                        size="small"
                        label={field.name}
                        placeholder="Contains…"
                        value={filters[field.id] ?? ""}
                        onChange={(e) => setFilter(field.id, e.target.value)}
                      />
                    );
                  })
                )}
                <Divider />
                <Button
                  size="small"
                  color="inherit"
                  onClick={() => setFilters({})}
                >
                  Clear filters
                </Button>
              </Box>
            </LocalizationProvider>
          </Popover>

          <Paper variant="outlined" className="overflow-x-auto">
            <Table
              size="small"
              sx={{
                "& td, & th": { borderColor: "divider" },
                "& tbody tr:last-of-type td": { border: 0 },
              }}
            >
              <TableHead>
                <TableRow>
                  {columns.map((field) => (
                    <TableCell
                      key={field.id}
                      sx={{
                        py: 1.25,
                        color: "text.secondary",
                        fontWeight: 600,
                        fontSize: 11,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      {field.name}
                    </TableCell>
                  ))}
                  <TableCell
                    align="right"
                    sx={{
                      py: 1.25,
                      color: "text.secondary",
                      fontWeight: 600,
                      fontSize: 11,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length + 1}
                      align="center"
                      sx={{ py: 5, color: "text.secondary", border: 0 }}
                    >
                      No entries match your search or filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((entry) => (
                    <TableRow
                      key={entry.id}
                      hover
                      sx={{ cursor: "pointer" }}
                      onClick={() =>
                        navigate(`/schemas/${schema.id}/entries/${entry.id}`)
                      }
                    >
                      {columns.map((field, i) => (
                        <TableCell
                          key={field.id}
                          sx={{
                            py: 1.25,
                            color: i === 0 ? "text.primary" : "text.secondary",
                            fontWeight: i === 0 ? 500 : 400,
                          }}
                        >
                          {field.type === "boolean" ? (
                            entry.values[field.id] === true ? (
                              <CheckRoundedIcon
                                fontSize="small"
                                sx={{ color: "success.main", display: "block" }}
                              />
                            ) : (
                              <Box
                                component="span"
                                sx={{ color: "text.disabled" }}
                              >
                                —
                              </Box>
                            )
                          ) : (
                            formatFieldValue(
                              field,
                              entry.values[field.id],
                              resolveRef,
                            )
                          )}
                        </TableCell>
                      ))}
                      <TableCell
                        align="right"
                        sx={{ py: 0.5 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() =>
                              navigate(
                                `/schemas/${schema.id}/entries/${entry.id}`,
                              )
                            }
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
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>
        </>
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

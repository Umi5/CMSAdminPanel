import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Pagination,
  Paper,
  Popover,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
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
import ViewColumnRoundedIcon from "@mui/icons-material/ViewColumnRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import type { Entry, EntryPage } from "@cms/shared";
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
import { NumberField } from "@/shared/components/NumberField";
import { formatFieldValue } from "@/shared/util/formatValue";
import { useReferenceResolver } from "../hooks/useReferenceResolver";

const MAX_COLUMNS = 6;
const PAGE_SIZE = 10;

export function EntryListPage() {
  const { schemaId } = useParams();
  const navigate = useNavigate();
  const { getSchema, loading: schemasLoading } = useSchemas();
  const { showToast } = useToast();
  const schema = schemaId ? getSchema(schemaId) : undefined;

  const [deleteTarget, setDeleteTarget] = useState<Entry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteType, setConfirmDeleteType] = useState(false);
  const [deletingType, setDeletingType] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  const [columnsAnchor, setColumnsAnchor] = useState<HTMLElement | null>(null);
  // Column choice per schema id; missing = default (first MAX_COLUMNS). Keyed by
  // schema so each content type remembers its own visible columns across nav.
  const [visibleBySchema, setVisibleBySchema] = useState<
    Record<string, Set<string>>
  >({});
  const [sort, setSort] = useState<{ id: string; dir: "asc" | "desc" } | null>(
    null,
  );
  const [page, setPage] = useState(1); // 1-based

  // Server-side list: filters, search, sort and pagination all ride on the URI.
  // A changed path makes useFetch refetch.
  const listPath = useMemo(() => {
    if (!schemaId) return null;
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    const q = search.trim();
    if (q) params.set("search", q);
    if (sort) {
      params.set("sortBy", sort.id);
      params.set("sortDir", sort.dir);
    }
    for (const [key, value] of Object.entries(filters)) {
      params.set(`filter[${key}]`, value);
    }
    return `/schemas/${schemaId}/entries?${params.toString()}`;
  }, [schemaId, page, search, sort, filters]);

  const { data, loading, error, refetch } = useFetch<EntryPage>(listPath);
  useSchemaEvents(schemaId ?? null, (event) => {
    if (event.type.startsWith("entry.")) void refetch();
  });
  const { resolve: resolveRef, optionsFor } = useReferenceResolver(schema);
  useDocumentTitle(schema?.name ?? "Content type");

  // Switching content type: reset filters/sort/search/page (they're field-id
  // specific to one schema). Column choice is kept per schema, so not reset here.
  useEffect(() => {
    setFilters({});
    setSort(null);
    setSearch("");
    setPage(1);
  }, [schemaId]);

  // If a page ends up empty (entries deleted/filtered away), fall back to page 1.
  useEffect(() => {
    if (data && page > 1 && data.items.length === 0 && data.total > 0) {
      setPage(1);
    }
  }, [data, page]);

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

  // Visible columns for this schema (default = first MAX_COLUMNS, capped there).
  const visibleSet =
    visibleBySchema[schema.id] ??
    new Set(schema.fields.slice(0, MAX_COLUMNS).map((f) => f.id));
  const columns = schema.fields.filter((f) => visibleSet.has(f.id));
  const rows = data?.items ?? [];
  const total = data?.total ?? 0;

  const setVisible = (next: Set<string>) =>
    setVisibleBySchema((prev) => ({ ...prev, [schema.id]: next }));

  const toggleColumn = (id: string) => {
    if (visibleSet.has(id)) {
      const next = new Set(visibleSet);
      next.delete(id);
      setVisible(next);
      // Drop any filter/sort tied to a now-hidden column.
      setFilters((prev) => {
        const n = { ...prev };
        for (const key of Object.keys(n)) {
          if (key === id || key.startsWith(`${id}__`)) delete n[key];
        }
        return n;
      });
      setSort((s) => (s?.id === id ? null : s));
      setPage(1);
    } else if (visibleSet.size < MAX_COLUMNS) {
      const next = new Set(visibleSet);
      next.add(id);
      setVisible(next);
    }
  };

  // Text is omitted from filters (search covers it); date/number use ranges.
  const filterableFields = columns.filter((f) => f.type !== "text");
  const activeFilterCount = filterableFields.filter((f) =>
    f.type === "date"
      ? Boolean(filters[`${f.id}__from`] || filters[`${f.id}__to`])
      : f.type === "number"
        ? Boolean(filters[`${f.id}__min`] || filters[`${f.id}__max`])
        : Boolean(filters[f.id]),
  ).length;
  const hasQuery = Boolean(search.trim()) || activeFilterCount > 0;

  // Reference filter options: every entry of the target type (all available).
  const referenceOptions: Record<string, { id: string; label: string }[]> = {};
  for (const field of filterableFields) {
    if (field.type !== "reference") continue;
    referenceOptions[field.id] = optionsFor(field.referenceSchemaId ?? "");
  }

  // Filter/search/sort changes reset to the first page.
  const setFilter = (id: string, value: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (value) next[id] = value;
      else delete next[id];
      return next;
    });
    setPage(1);
  };
  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };
  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };
  const toggleSort = (id: string) => {
    setSort((s) =>
      s?.id !== id
        ? { id, dir: "asc" }
        : s.dir === "asc"
          ? { id, dir: "desc" }
          : null,
    );
    setPage(1);
  };

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
            API id <code>{schema.apiId}</code> · {total}{" "}
            {total === 1 ? "entry" : "entries"}
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

      {loading && !data ? (
        <LoadingState label="Loading entries…" />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : total === 0 && !hasQuery ? (
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
              onChange={(e) => changeSearch(e.target.value)}
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
            <Box className="ml-auto flex items-center gap-2">
              <Button
                variant="outlined"
                startIcon={<ViewColumnRoundedIcon />}
                onClick={(e) => setColumnsAnchor(e.currentTarget)}
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
                Columns
              </Button>
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
            open={Boolean(columnsAnchor)}
            anchorEl={columnsAnchor}
            onClose={() => setColumnsAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}
            slotProps={{ paper: { sx: { mt: 1, width: 260 } } }}
          >
            <Box className="flex flex-col p-3">
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  mb: 1,
                }}
              >
                COLUMNS · {visibleSet.size}/{MAX_COLUMNS}
              </Typography>
              {schema.fields.map((field) => {
                const checked = visibleSet.has(field.id);
                return (
                  <FormControlLabel
                    key={field.id}
                    control={
                      <Checkbox
                        size="small"
                        checked={checked}
                        disabled={!checked && visibleSet.size >= MAX_COLUMNS}
                        onChange={() => toggleColumn(field.id)}
                      />
                    }
                    label={field.name}
                    slotProps={{ typography: { variant: "body2" } }}
                  />
                );
              })}
            </Box>
          </Popover>

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
                    if (field.type === "number") {
                      const minKey = `${field.id}__min`;
                      const maxKey = `${field.id}__max`;
                      return (
                        <Box key={field.id} className="flex flex-wrap gap-2">
                          <NumberField
                            size="small"
                            label={`${field.name} min`}
                            value={filters[minKey] ?? ""}
                            onChange={(v) => setFilter(minKey, v)}
                            sx={{ flex: "1 1 120px" }}
                          />
                          <NumberField
                            size="small"
                            label={`${field.name} max`}
                            value={filters[maxKey] ?? ""}
                            onChange={(v) => setFilter(maxKey, v)}
                            sx={{ flex: "1 1 120px" }}
                          />
                        </Box>
                      );
                    }
                    if (field.type === "date") {
                      const fromKey = `${field.id}__from`;
                      const toKey = `${field.id}__to`;
                      return (
                        <Box key={field.id} className="flex flex-wrap gap-2">
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
                              textField: {
                                size: "small",
                                sx: { flex: "1 1 130px" },
                              },
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
                              textField: {
                                size: "small",
                                sx: { flex: "1 1 130px" },
                              },
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
                <Button size="small" color="inherit" onClick={clearFilters}>
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
                  {columns.map((field) => {
                    const sortable =
                      field.type === "text" || field.type === "date";
                    const active = sort?.id === field.id;
                    return (
                      <TableCell
                        key={field.id}
                        sortDirection={active ? sort.dir : false}
                        sx={{
                          py: 1.25,
                          color: "text.secondary",
                          fontWeight: 600,
                          fontSize: 11,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                      >
                        {sortable ? (
                          <TableSortLabel
                            active={active}
                            direction={active ? sort.dir : "asc"}
                            onClick={() => toggleSort(field.id)}
                          >
                            {field.name}
                          </TableSortLabel>
                        ) : (
                          field.name
                        )}
                      </TableCell>
                    );
                  })}
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
                {rows.length === 0 ? (
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
                  rows.map((entry) => (
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

          {total > PAGE_SIZE && (
            <Box className="flex items-center justify-between gap-2 mt-3">
              <Typography variant="caption" color="text.secondary">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}{" "}
                of {total}
              </Typography>
              <Pagination
                count={Math.ceil(total / PAGE_SIZE)}
                page={page}
                onChange={(_, p) => setPage(p)}
                shape="rounded"
                size="small"
                color="primary"
              />
            </Box>
          )}
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

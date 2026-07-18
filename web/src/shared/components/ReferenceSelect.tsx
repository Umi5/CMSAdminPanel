import { Autocomplete, TextField } from '@mui/material';
import type { Entry } from '@cms/shared';
import { useFetch } from '@/shared/hooks/useFetch';
import { useSchemas } from '@/shared/schema/SchemaProvider';
import { getEntryLabel } from '@/shared/util/entryLabel';

/** Compact searchable picker of an entry from a target schema; yields its id.
 *  Used by the migration fix-up when a reference needs re-pointing. */
export function ReferenceSelect({
  targetSchemaId,
  value,
  onChange,
  placeholder,
}: {
  targetSchemaId: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
}) {
  const { getSchema } = useSchemas();
  const target = getSchema(targetSchemaId);
  const { data: entries, loading } = useFetch<Entry[]>(
    targetSchemaId ? `/schemas/${targetSchemaId}/entries` : null,
  );
  const options = entries ?? [];
  const selected = options.find((e) => e.id === value) ?? null;

  return (
    <Autocomplete
      size="small"
      sx={{ minWidth: 200 }}
      options={options}
      loading={loading}
      value={selected}
      getOptionLabel={(entry) => getEntryLabel(target, entry)}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      onChange={(_, entry) => onChange(entry?.id)}
      renderInput={(params) => (
        <TextField {...params} placeholder={placeholder ?? `Pick ${target?.name ?? 'an entry'}`} />
      )}
    />
  );
}

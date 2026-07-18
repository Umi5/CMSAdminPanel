import { Autocomplete, TextField } from "@mui/material";
import type { Entry } from "@cms/shared";
import { useFetch } from "@/shared/hooks/useFetch";
import { useSchemas } from "@/shared/schema/SchemaProvider";
import { getEntryLabel } from "@/shared/util/entryLabel";

export function ReferenceField({
  label,
  targetSchemaId,
  value,
  required,
  error,
  onChange,
}: {
  label: string;
  targetSchemaId: string;
  value: string | undefined;
  required: boolean;
  error?: string;
  onChange: (value: string | undefined) => void;
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
      fullWidth
      options={options}
      loading={loading}
      value={selected}
      getOptionLabel={(entry) => getEntryLabel(target, entry)}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      onChange={(_, entry) => onChange(entry?.id)}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          error={Boolean(error)}
          helperText={error ?? `References ${target?.name ?? "another type"}`}
        />
      )}
    />
  );
}

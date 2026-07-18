import { useNavigate } from 'react-router-dom';
import { Autocomplete, Box, IconButton, TextField, Tooltip } from '@mui/material';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import type { Entry } from '@cms/shared';
import { useFetch } from '@/shared/hooks/useFetch';
import { useSchemas } from '@/shared/schema/SchemaProvider';
import { getEntryLabel } from '@/shared/util/entryLabel';

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
  const navigate = useNavigate();
  const { getSchema } = useSchemas();
  const target = getSchema(targetSchemaId);
  const { data: entries, loading } = useFetch<Entry[]>(targetSchemaId ? `/schemas/${targetSchemaId}/entries` : null);

  const options = entries ?? [];
  const selected = options.find((e) => e.id === value) ?? null;

  return (
    <Box className="flex items-start gap-2">
      <Autocomplete
        className="flex-1"
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
            helperText={error ?? `References ${target?.name ?? 'another type'}`}
          />
        )}
      />
      <Tooltip title="Open referenced entry">
        <span>
          <IconButton
            sx={{ mt: 1 }}
            disabled={!value}
            onClick={() => value && navigate(`/schemas/${targetSchemaId}/entries/${value}`)}
            aria-label="Open referenced entry"
          >
            <OpenInNewRoundedIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}

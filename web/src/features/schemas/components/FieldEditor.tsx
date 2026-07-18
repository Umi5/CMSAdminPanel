import { Box, FormControlLabel, IconButton, MenuItem, Switch, TextField, Tooltip } from '@mui/material';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import type { FieldType, Schema } from '@cms/shared';
import type { DraftField } from '../hooks/useSchemaDraft';

const FIELD_TYPES: FieldType[] = ['text', 'number', 'boolean', 'date', 'reference'];
const TYPE_LABEL: Record<FieldType, string> = {
  text: 'Text',
  number: 'Number',
  boolean: 'Boolean',
  date: 'Date',
  reference: 'Reference',
};

export function FieldEditor({
  field,
  index,
  total,
  schemas,
  currentSchemaId,
  error,
  onChange,
  onRemove,
  onMove,
}: {
  field: DraftField;
  index: number;
  total: number;
  schemas: Schema[];
  currentSchemaId?: string;
  error?: string;
  onChange: (patch: Partial<DraftField>) => void;
  onRemove: () => void;
  onMove: (index: number, dir: -1 | 1) => void;
}) {
  const handleType = (type: FieldType) => {
    if (type === 'reference') {
      onChange({ type, referenceSchemaId: field.referenceSchemaId ?? schemas[0]?.id });
    } else {
      onChange({ type });
    }
  };

  return (
    <Box
      className="flex flex-wrap items-start gap-3 px-4 py-3"
      sx={index > 0 ? { borderTop: 1, borderColor: 'divider' } : undefined}
    >
      <Box className="flex-1" sx={{ minWidth: 180 }}>
        <TextField
          label="Field name"
          size="small"
          fullWidth
          value={field.name}
          onChange={(e) => onChange({ name: e.target.value })}
          error={Boolean(error)}
          helperText={error}
        />
      </Box>

      <TextField
        select
        label="Type"
        size="small"
        value={field.type}
        onChange={(e) => handleType(e.target.value as FieldType)}
        sx={{ minWidth: 130 }}
      >
        {FIELD_TYPES.map((type) => (
          <MenuItem key={type} value={type}>
            {TYPE_LABEL[type]}
          </MenuItem>
        ))}
      </TextField>

      {field.type === 'reference' && (
        <TextField
          select
          label="References"
          size="small"
          value={field.referenceSchemaId ?? ''}
          onChange={(e) => onChange({ referenceSchemaId: e.target.value })}
          sx={{ minWidth: 170 }}
          error={!field.referenceSchemaId}
        >
          {schemas.length === 0 && (
            <MenuItem value="" disabled>
              No other content types
            </MenuItem>
          )}
          {schemas.map((schema) => (
            <MenuItem key={schema.id} value={schema.id}>
              {schema.name}
              {schema.id === currentSchemaId ? ' (self)' : ''}
            </MenuItem>
          ))}
        </TextField>
      )}

      <FormControlLabel
        control={<Switch checked={field.required} onChange={(e) => onChange({ required: e.target.checked })} />}
        label="Required"
        sx={{ mr: 0 }}
      />

      <Box className="flex items-center">
        <Tooltip title="Move up">
          <span>
            <IconButton size="small" disabled={index === 0} onClick={() => onMove(index, -1)} aria-label="Move field up">
              <ArrowUpwardRoundedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Move down">
          <span>
            <IconButton
              size="small"
              disabled={index === total - 1}
              onClick={() => onMove(index, 1)}
              aria-label="Move field down"
            >
              <ArrowDownwardRoundedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Remove field">
          <IconButton size="small" color="error" onClick={onRemove} aria-label="Remove field">
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}

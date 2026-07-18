import { Box, Card, CardActionArea, CardContent, Chip, Typography } from '@mui/material';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import type { Schema } from '@cms/shared';

function plural(n: number, singular: string, pluralForm: string): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

export function SchemaCard({
  schema,
  entryCount,
  onOpen,
}: {
  schema: Schema;
  entryCount: number | undefined;
  onOpen: () => void;
}) {
  return (
    <Card
      sx={{
        transition: 'border-color 120ms ease, box-shadow 120ms ease',
        '&:hover': { borderColor: 'primary.main', boxShadow: '0 1px 10px rgba(15,23,42,0.06)' },
      }}
    >
      <CardActionArea onClick={onOpen}>
        <CardContent className="flex items-center justify-between gap-4">
          <Box className="min-w-0">
            <Box className="flex items-center gap-2">
              <Typography variant="subtitle1" noWrap>
                {schema.name}
              </Typography>
              <Chip size="small" variant="outlined" label={schema.apiId} />
            </Box>
            <Typography variant="body2" color="text.secondary" className="mt-1">
              {plural(schema.fields.length, 'field', 'fields')} ·{' '}
              {entryCount === undefined ? '—' : plural(entryCount, 'entry', 'entries')}
            </Typography>
          </Box>
          <ChevronRightRoundedIcon sx={{ color: 'text.disabled' }} />
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

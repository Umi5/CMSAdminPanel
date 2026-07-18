import { Box, ListItemButton, Typography } from "@mui/material";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import type { Schema } from "@cms/shared";

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
    <ListItemButton
      onClick={onOpen}
      sx={{ px: 2.5, py: 1.75, borderRadius: 0 }}
    >
      <Box className="min-w-0 flex-1">
        <Box className="flex items-center gap-2 min-w-0">
          <Typography variant="subtitle2" noWrap>
            {schema.name}
          </Typography>
          <Typography
            component="span"
            variant="caption"
            color="text.secondary"
            sx={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            }}
            noWrap
          >
            {schema.apiId}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" className="mt-0.5">
          {plural(schema.fields.length, "field", "fields")} ·{" "}
          {entryCount === undefined
            ? "—"
            : plural(entryCount, "entry", "entries")}
        </Typography>
      </Box>
      <ChevronRightRoundedIcon
        sx={{ color: "text.disabled", ml: 2, flexShrink: 0 }}
      />
    </ListItemButton>
  );
}

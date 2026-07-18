import {
  Box,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import { useEffect } from "react";
import LayersRoundedIcon from "@mui/icons-material/LayersRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import type { EntryCounts } from "@cms/shared";
import { useSchemas } from "@/shared/schema/SchemaProvider";
import { useEvents } from "@/shared/realtime/EventsProvider";
import { useFetch } from "@/shared/hooks/useFetch";
import { RealtimeIndicator } from "./RealtimeIndicator";
import { ThemeToggle } from "./ThemeToggle";

function NavItem({
  to,
  label,
  icon,
  onNavigate,
}: {
  to: string;
  label: string;
  icon: React.ReactNode;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      style={{ textDecoration: "none", color: "inherit" }}
      end
    >
      {({ isActive }) => (
        <ListItemButton
          selected={isActive}
          aria-current={isActive ? "page" : undefined}
          sx={{ py: 0.75, mb: 0.25 }}
        >
          <ListItemIcon sx={{ minWidth: 30, color: "text.secondary" }}>
            {icon}
          </ListItemIcon>
          <ListItemText
            primary={label}
            primaryTypographyProps={{ fontWeight: 500, fontSize: 14 }}
          />
        </ListItemButton>
      )}
    </NavLink>
  );
}

/** Small monospace initial tile, Linear-style per-item marker. */
function TypeMark({ name, active }: { name: string; active: boolean }) {
  return (
    <Box
      sx={{
        width: 22,
        height: 22,
        borderRadius: 1.5,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        bgcolor: active ? "primary.main" : "action.hover",
        color: active ? "primary.contrastText" : "text.secondary",
      }}
    >
      {name.trim().charAt(0).toUpperCase() || "·"}
    </Box>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { schemas } = useSchemas();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: counts, refetch: refetchCounts } = useFetch<EntryCounts>(
    "/stats/entry-counts",
  );
  const { subscribe } = useEvents();

  // Keep the per-type entry counts live as entries and types come and go.
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

  return (
    <Box className="flex flex-col h-full">
      <Box className="flex items-center gap-2.5 px-4 py-4">
        <Box
          sx={{
            width: 26,
            height: 26,
            borderRadius: 1.5,
            bgcolor: "primary.main",
          }}
          className="flex items-center justify-center shrink-0"
        >
          <LayersRoundedIcon sx={{ color: "#fff", fontSize: 16 }} />
        </Box>
        <Typography fontWeight={700} fontSize={15} noWrap>
          Headless CMS
        </Typography>
        <Box className="ml-auto shrink-0">
          <ThemeToggle />
        </Box>
      </Box>
      <Divider />

      <Box className="px-2 py-2">
        <List disablePadding>
          <NavItem
            to="/schemas"
            label="Content types"
            icon={<CategoryRoundedIcon sx={{ fontSize: 18 }} />}
            onNavigate={onNavigate}
          />
        </List>
      </Box>

      <Box className="px-4 pt-3 pb-1.5">
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ letterSpacing: "0.06em", fontWeight: 600, fontSize: 11 }}
        >
          YOUR TYPES
        </Typography>
      </Box>
      <Box className="flex-1 overflow-y-auto px-2 pb-2">
        <List dense disablePadding>
          {schemas.map((schema) => {
            const active = location.pathname.startsWith(
              `/schemas/${schema.id}`,
            );
            return (
              <ListItemButton
                key={schema.id}
                selected={active}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  navigate(`/schemas/${schema.id}`);
                  onNavigate?.();
                }}
                sx={{ py: 0.6, gap: 1.25, mb: 0.25 }}
              >
                <TypeMark name={schema.name} active={active} />
                <ListItemText
                  primary={schema.name}
                  primaryTypographyProps={{
                    fontSize: 14,
                    fontWeight: 500,
                    noWrap: true,
                  }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ ml: 1, fontVariantNumeric: "tabular-nums" }}
                >
                  {counts ? (counts[schema.id] ?? 0) : ""}
                </Typography>
              </ListItemButton>
            );
          })}
        </List>
      </Box>

      <Divider />
      <Box className="px-4 py-3">
        <RealtimeIndicator />
      </Box>
    </Box>
  );
}

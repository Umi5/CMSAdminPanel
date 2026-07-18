import {
  Box,
  Chip,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import LayersRoundedIcon from "@mui/icons-material/LayersRounded";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useSchemas } from "@/shared/schema/SchemaProvider";
import { RealtimeIndicator } from "./RealtimeIndicator";
import { ThemeToggle } from "./ThemeToggle";

function NavItem({
  to,
  label,
  onNavigate,
}: {
  to: string;
  label: string;
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
          sx={{ mb: 0.5 }}
        >
          <ListItemText
            primary={label}
            primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
          />
        </ListItemButton>
      )}
    </NavLink>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { schemas } = useSchemas();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Box className="flex flex-col h-full">
      <Box className="flex items-center gap-2 px-5 py-5">
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: 2,
            bgcolor: "primary.main",
          }}
          className="flex items-center justify-center shrink-0"
        >
          <LayersRoundedIcon sx={{ color: "#fff", fontSize: 18 }} />
        </Box>
        <Typography fontWeight={700} noWrap>
          Headless CMS
        </Typography>
        <Box className="ml-auto shrink-0">
          <ThemeToggle />
        </Box>
      </Box>
      <Divider />

      <Box className="px-3 py-3">
        <List disablePadding>
          <NavItem
            to="/schemas"
            label="Content types"
            onNavigate={onNavigate}
          />
        </List>
      </Box>
      <Divider />

      <Box className="px-5 pt-4 pb-1">
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ letterSpacing: "0.08em", fontWeight: 700 }}
        >
          YOUR TYPES
        </Typography>
      </Box>
      <Box className="flex-1 overflow-y-auto px-3 pb-2">
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
                sx={{ mb: 0.25 }}
              >
                <ListItemText
                  primary={schema.name}
                  primaryTypographyProps={{
                    fontSize: 14,
                    fontWeight: 600,
                    noWrap: true,
                  }}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={schema.fields.length}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Box>

      <Divider />
      <Box className="px-5 py-4">
        <RealtimeIndicator />
      </Box>
    </Box>
  );
}

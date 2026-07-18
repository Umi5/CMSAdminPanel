import { useState, type ReactNode } from "react";
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "./ThemeToggle";

const DRAWER_WIDTH = 264;

export function AppLayout({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <Box className="flex min-h-screen">
      {isMobile ? (
        <>
          <AppBar
            position="fixed"
            color="inherit"
            elevation={0}
            sx={{ borderBottom: 1, borderColor: "divider" }}
          >
            <Toolbar variant="dense">
              <IconButton
                edge="start"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open navigation"
              >
                <MenuRoundedIcon />
              </IconButton>
              <Typography variant="subtitle1" fontWeight={700} className="ml-1">
                Headless CMS
              </Typography>
              <Box className="ml-auto">
                <ThemeToggle />
              </Box>
            </Toolbar>
          </AppBar>
          <Drawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            PaperProps={{ sx: { width: DRAWER_WIDTH } }}
          >
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </Drawer>
        </>
      ) : (
        <Drawer
          variant="permanent"
          sx={{ width: DRAWER_WIDTH, flexShrink: 0 }}
          PaperProps={{
            sx: { width: DRAWER_WIDTH, borderRight: 1, borderColor: "divider" },
          }}
        >
          <Sidebar />
        </Drawer>
      )}

      <Box
        component="main"
        className="flex-1 min-w-0"
        sx={{ pt: isMobile ? 6 : 0 }}
      >
        <Box className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
          {children}
        </Box>
      </Box>
    </Box>
  );
}

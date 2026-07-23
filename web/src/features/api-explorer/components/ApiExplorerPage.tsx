import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import { useSchemas } from "@/shared/schema/SchemaProvider";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { PageHeader } from "@/shared/components/PageHeader";
import { LoadingState } from "@/shared/components/StateViews";
import { JsonView } from "./JsonView";

interface Result {
  status: number;
  ok: boolean;
  body: string;
}

export function ApiExplorerPage() {
  const { schemas, loading } = useSchemas();
  useDocumentTitle("Public API");

  const [path, setPath] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const send = async (target: string) => {
    setSending(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch(target, {
        headers: { Accept: "application/json" },
      });
      const text = await res.text();
      let body = text;
      try {
        body = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        // not JSON, show raw text
      }
      setResult({ status: res.status, ok: res.ok, body });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSending(false);
    }
  };

  const pick = (target: string) => {
    setPath(target);
    void send(target);
  };

  // Load the first content type's collection on mount, so landing on the page
  // (or coming back to it) always shows a real response instead of a placeholder.
  const autoSent = useRef(false);
  useEffect(() => {
    const first = schemas[0];
    if (autoSent.current || !first) return;
    autoSent.current = true;
    pick(`/api/content/${first.apiId}`);
  }, [schemas]);

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked, ignore
    }
  };

  if (loading && schemas.length === 0) return <LoadingState />;

  return (
    <Box>
      <PageHeader
        title="Public API"
        subtitle="The read-only content API that other apps consume. Send a request and inspect the JSON response."
      />

      <Box
        className="grid gap-5"
        sx={{ gridTemplateColumns: { xs: "1fr", md: "260px 1fr" } }}
      >
        {/* Endpoints */}
        <Box>
          <Typography
            variant="caption"
            sx={{
              display: "block",
              mb: 1,
              color: "text.secondary",
              fontWeight: 600,
              letterSpacing: "0.06em",
            }}
          >
            ENDPOINTS
          </Typography>
          <Paper
            variant="outlined"
            sx={{
              overflow: "hidden",
              "& > *:not(:first-of-type)": {
                borderTop: 1,
                borderColor: "divider",
              },
            }}
          >
            {schemas.map((schema) => {
              const target = `/api/content/${schema.apiId}`;
              const active = path === target;
              return (
                <Box
                  key={schema.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => pick(target)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      pick(target);
                    }
                  }}
                  sx={{
                    px: 2,
                    py: 1.25,
                    cursor: "pointer",
                    bgcolor: active ? "action.selected" : "transparent",
                    "&:hover": {
                      bgcolor: active ? "action.selected" : "action.hover",
                    },
                  }}
                >
                  <Box className="flex items-center gap-1.5">
                    <Chip
                      label="GET"
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: 10,
                        fontWeight: 700,
                        fontFamily: "ui-monospace, monospace",
                        color: "success.main",
                        bgcolor: (t) => `${t.palette.success.main}22`,
                      }}
                    />
                    <Typography
                      variant="body2"
                      fontWeight={active ? 600 : 500}
                      noWrap
                    >
                      {schema.name}
                    </Typography>
                  </Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontFamily: "ui-monospace, monospace" }}
                    noWrap
                  >
                    /api/content/{schema.apiId}
                  </Typography>
                </Box>
              );
            })}
          </Paper>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 1.5, lineHeight: 1.5 }}
          >
            Try editing the path:
            <br />
            <code>/&lt;guid&gt;</code> for a single entry.
            <br />
            <code>?page=1&amp;pageSize=2</code> to paginate.
            <br />
            <code>?filter[name]=margaux</code> to filter by field key, or{" "}
            <code>?filter[rating][min]=95</code> for a range.
          </Typography>
        </Box>

        {/* Request + response */}
        <Box className="flex flex-col gap-3 min-w-0">
          <Box className="flex items-center gap-2">
            <Chip
              label="GET"
              size="small"
              sx={{
                fontWeight: 700,
                fontFamily: "ui-monospace, monospace",
                color: "success.main",
                bgcolor: (t) => `${t.palette.success.main}22`,
              }}
            />
            <TextField
              size="small"
              fullWidth
              value={path}
              onChange={(e) => setPath(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void send(path);
              }}
              placeholder="/api/content/wine"
              sx={{
                "& input": {
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 13,
                },
              }}
            />
            <Button
              variant="contained"
              startIcon={
                sending ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <SendRoundedIcon />
                )
              }
              onClick={() => void send(path)}
              disabled={sending || !path}
              sx={{ flexShrink: 0, height: 40 }}
            >
              Send
            </Button>
          </Box>

          <Paper variant="outlined" sx={{ overflow: "hidden", minHeight: 260 }}>
            <Box
              className="flex items-center justify-between"
              sx={{ px: 2, py: 1, borderBottom: 1, borderColor: "divider" }}
            >
              <Box className="flex items-center gap-2">
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                  }}
                >
                  RESPONSE
                </Typography>
                {result && (
                  <Chip
                    label={result.status}
                    size="small"
                    sx={{
                      height: 20,
                      fontWeight: 700,
                      fontFamily: "ui-monospace, monospace",
                      color: result.ok ? "success.main" : "error.main",
                      bgcolor: (t) =>
                        `${result.ok ? t.palette.success.main : t.palette.error.main}22`,
                    }}
                  />
                )}
              </Box>
              {result && (
                <Tooltip title={copied ? "Copied" : "Copy JSON"}>
                  <IconButton
                    size="small"
                    onClick={copy}
                    aria-label="Copy response"
                  >
                    <ContentCopyRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            {sending ? (
              <Box className="flex items-center justify-center" sx={{ py: 8 }}>
                <CircularProgress size={22} />
              </Box>
            ) : error ? (
              <Typography color="error" sx={{ p: 2, fontSize: 14 }}>
                {error}
              </Typography>
            ) : result ? (
              <JsonView text={result.body} />
            ) : (
              <Typography color="text.secondary" sx={{ p: 2, fontSize: 14 }}>
                Pick an endpoint on the left, or type a path and press Send.
              </Typography>
            )}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}

import { Box } from "@mui/material";

// Minimal JSON syntax highlighter: escape, then wrap tokens in spans. No
// dependency, colors come from the theme.
function highlight(json: string): string {
  const esc = json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return esc.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = "num";
      if (/^"/.test(match)) cls = /:$/.test(match) ? "key" : "str";
      else if (/true|false/.test(match)) cls = "bool";
      else if (/null/.test(match)) cls = "null";
      return `<span class="jtok-${cls}">${match}</span>`;
    },
  );
}

export function JsonView({ text }: { text: string }) {
  return (
    <Box
      component="pre"
      sx={{
        m: 0,
        p: 2,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        fontSize: 13,
        lineHeight: 1.6,
        color: "text.primary",
        overflowX: "auto",
        "& .jtok-key": { color: "primary.main" },
        "& .jtok-str": { color: "success.main" },
        "& .jtok-num": { color: "warning.main" },
        "& .jtok-bool": { color: "info.main" },
        "& .jtok-null": { color: "text.disabled" },
      }}
      dangerouslySetInnerHTML={{ __html: highlight(text) }}
    />
  );
}

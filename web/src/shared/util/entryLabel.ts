import type { Schema, Entry } from "@cms/shared";

/** A human label for an entry: its first text field, else a short id. Used by the
 *  reference picker, jump-to links, and reference columns. */
export function getEntryLabel(
  schema: Schema | undefined,
  entry: Entry,
): string {
  const titleField = schema?.fields.find((f) => f.type === "text");
  const value = titleField ? entry.values[titleField.id] : undefined;
  return typeof value === "string" && value.trim()
    ? value
    : `#${entry.id.slice(0, 6)}`;
}

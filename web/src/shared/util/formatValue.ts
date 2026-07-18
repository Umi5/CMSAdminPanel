import type { Field } from "@cms/shared";

/** Format an entry value for read-only display in the entries table. */
export function formatFieldValue(
  field: Field,
  value: unknown,
  resolveRef?: (schemaId: string, entryId: string) => string,
): string {
  if (value === undefined || value === null || value === "") return "—";
  switch (field.type) {
    case "boolean":
      return value ? "Yes" : "No";
    case "reference":
      return typeof value === "string" && field.referenceSchemaId && resolveRef
        ? resolveRef(field.referenceSchemaId, value)
        : String(value);
    case "number":
    case "date":
    case "text":
      return String(value);
  }
}

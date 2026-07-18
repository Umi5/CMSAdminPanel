import type { Schema, Field } from "@cms/shared";

export interface FieldError {
  fieldId: string;
  fieldName: string;
  message: string;
}

/** Resolves whether `entryId` exists and belongs to `referenceSchemaId`. */
export type RefResolver = (
  referenceSchemaId: string,
  entryId: string,
) => boolean;

/** Empty = no value at all. Note `0` and `false` are values, not empty. */
export function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

export function isValidDateString(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return !Number.isNaN(Date.parse(value));
}

function checkType(
  field: Field,
  value: unknown,
  refExists?: RefResolver,
): string | null {
  switch (field.type) {
    case "text":
      return typeof value === "string" ? null : "must be text";
    case "number":
      return typeof value === "number" && Number.isFinite(value)
        ? null
        : "must be a number";
    case "boolean":
      return typeof value === "boolean" ? null : "must be true or false";
    case "date":
      return isValidDateString(value) ? null : "must be a valid date";
    case "reference": {
      if (typeof value !== "string") return "must reference an entry";
      if (
        refExists &&
        field.referenceSchemaId &&
        !refExists(field.referenceSchemaId, value)
      ) {
        return "references an entry that no longer exists";
      }
      return null;
    }
  }
}

/**
 * Schema-driven entry validation (required + type shape). Kept a plain, pure
 * function — no Zod — because the field set is dynamic, and because the migration
 * planner reuses it to decide whether an entry is still valid after a change.
 * Reference existence is only checked when a `refExists` resolver is supplied.
 */
export function validateEntryValues(
  schema: Schema,
  values: Record<string, unknown>,
  refExists?: RefResolver,
): FieldError[] {
  const errors: FieldError[] = [];
  for (const field of schema.fields) {
    const value = values[field.id];
    if (isEmpty(value)) {
      if (field.required) {
        errors.push({
          fieldId: field.id,
          fieldName: field.name,
          message: "is required",
        });
      }
      continue;
    }
    const typeError = checkType(field, value, refExists);
    if (typeError) {
      errors.push({
        fieldId: field.id,
        fieldName: field.name,
        message: typeError,
      });
    }
  }
  return errors;
}

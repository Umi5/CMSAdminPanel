import { useCallback, useState } from "react";
import type { FieldType, Schema } from "@cms/shared";

export interface DraftField {
  id: string;
  name: string;
  type: FieldType;
  required: boolean;
  referenceSchemaId?: string;
  nonNegative?: boolean;
}

/** The payload shape sent to create / migration endpoints. */
export interface SchemaDraftPayload {
  name: string;
  apiId: string;
  fields: DraftField[];
}

export function newDraftField(): DraftField {
  return { id: crypto.randomUUID(), name: "", type: "text", required: false };
}

/** Load an existing schema into an editable draft. */
export function schemaToDraft(schema: Schema): SchemaDraftPayload {
  return {
    name: schema.name,
    apiId: schema.apiId,
    fields: schema.fields.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      required: f.required,
      ...(f.referenceSchemaId
        ? { referenceSchemaId: f.referenceSchemaId }
        : {}),
      ...(f.nonNegative ? { nonNegative: true } : {}),
    })),
  };
}

function cleanField(field: DraftField): DraftField {
  const base: DraftField = {
    id: field.id,
    name: field.name.trim(),
    type: field.type,
    required: field.required,
  };
  if (field.type === "reference" && field.referenceSchemaId)
    base.referenceSchemaId = field.referenceSchemaId;
  if (field.type === "number" && field.nonNegative) base.nonNegative = true;
  return base;
}

// Deterministic shape for comparing a draft against what is stored: fixed key
// order, trimmed names, and optional flags spelled out so "absent" and "false"
// compare equal.
function normalizeDraft(draft: SchemaDraftPayload) {
  return {
    name: draft.name.trim(),
    apiId: draft.apiId.trim(),
    fields: draft.fields.map((f) => ({
      id: f.id,
      name: f.name.trim(),
      type: f.type,
      required: f.required,
      referenceSchemaId: f.referenceSchemaId ?? null,
      nonNegative: f.nonNegative ?? false,
    })),
  };
}

/**
 * Whether two drafts are identical. The migration plan only reports changes that
 * touch stored data, so the builder needs this to tell "nothing changed" apart
 * from "changed, but no entry is affected" (a rename, an apiId, a constraint).
 */
export function draftsEqual(
  a: SchemaDraftPayload,
  b: SchemaDraftPayload,
): boolean {
  return (
    JSON.stringify(normalizeDraft(a)) === JSON.stringify(normalizeDraft(b))
  );
}

export interface DraftErrors {
  name?: string;
  apiId?: string;
  fields: Record<string, string>;
  hasErrors: boolean;
}

export function validateDraft(
  name: string,
  apiId: string,
  fields: DraftField[],
): DraftErrors {
  const errors: DraftErrors = { fields: {}, hasErrors: false };
  if (!name.trim()) errors.name = "Name is required";
  if (!apiId.trim()) errors.apiId = "API id is required";
  else if (!/^[a-z0-9-]+$/.test(apiId))
    errors.apiId = "Only lowercase letters, numbers and hyphens";

  const seen = new Set<string>();
  for (const field of fields) {
    const key = field.name.trim().toLowerCase();
    if (!field.name.trim()) errors.fields[field.id] = "Field name is required";
    else if (seen.has(key)) errors.fields[field.id] = "Duplicate field name";
    else if (field.type === "reference" && !field.referenceSchemaId)
      errors.fields[field.id] = "Pick a target content type";
    if (field.name.trim()) seen.add(key);
  }

  errors.hasErrors =
    Boolean(errors.name) ||
    Boolean(errors.apiId) ||
    Object.keys(errors.fields).length > 0 ||
    fields.length === 0;
  return errors;
}

/** Local draft state for the schema builder — nothing is sent until the user saves. */
export function useSchemaDraft(initial: SchemaDraftPayload) {
  const [name, setName] = useState(initial.name);
  const [apiId, setApiId] = useState(initial.apiId);
  const [fields, setFields] = useState<DraftField[]>(initial.fields);

  const addField = useCallback(
    () => setFields((f) => [...f, newDraftField()]),
    [],
  );

  const updateField = useCallback((id: string, patch: Partial<DraftField>) => {
    setFields((current) =>
      current.map((field) => {
        if (field.id !== id) return field;
        const next: DraftField = { ...field, ...patch };
        if (next.type !== "reference") delete next.referenceSchemaId;
        if (next.type !== "number") delete next.nonNegative;
        return next;
      }),
    );
  }, []);

  const removeField = useCallback((id: string) => {
    setFields((current) => current.filter((f) => f.id !== id));
  }, []);

  const moveField = useCallback((index: number, dir: -1 | 1) => {
    setFields((current) => {
      const target = index + dir;
      if (target < 0 || target >= current.length) return current;
      const next = current.slice();
      const a = next[index];
      const b = next[target];
      if (!a || !b) return current;
      next[index] = b;
      next[target] = a;
      return next;
    });
  }, []);

  const toPayload = useCallback(
    (): SchemaDraftPayload => ({
      name: name.trim(),
      apiId: apiId.trim(),
      fields: fields.map(cleanField),
    }),
    [name, apiId, fields],
  );

  return {
    name,
    setName,
    apiId,
    setApiId,
    fields,
    addField,
    updateField,
    removeField,
    moveField,
    toPayload,
  };
}

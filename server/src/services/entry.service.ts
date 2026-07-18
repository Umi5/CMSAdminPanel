import type { Entry, Schema } from "@cms/shared";
import { store } from "../store";
import { HttpError } from "../http";
import { newId } from "../ids";
import {
  validateEntryValues,
  isEmpty,
  type RefResolver,
} from "../entry-validator";

const refExists: RefResolver = (referenceSchemaId, entryId) => {
  const ref = store.getEntry(entryId);
  return ref !== undefined && ref.schemaId === referenceSchemaId;
};

// Keep only values for fields that exist, dropping empties so the store stays tidy.
function cleanValues(
  schema: Schema,
  values: Record<string, unknown>,
): Record<string, unknown> {
  const known = new Set(schema.fields.map((f) => f.id));
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (known.has(key) && !isEmpty(value)) out[key] = value;
  }
  return out;
}

function schemaOrThrow(schemaId: string): Schema {
  const schema = store.getSchema(schemaId);
  if (!schema) throw new HttpError(404, "Content type not found");
  return schema;
}

function assertValid(schema: Schema, values: Record<string, unknown>): void {
  const errors = validateEntryValues(schema, values, refExists);
  if (errors.length > 0) {
    throw new HttpError(400, "Entry does not match the content type", {
      errors,
    });
  }
}

function entryOrThrow(schemaId: string, entryId: string): Entry {
  const entry = store.getEntry(entryId);
  if (!entry || entry.schemaId !== schemaId)
    throw new HttpError(404, "Entry not found");
  return entry;
}

export const entryService = {
  list(schemaId: string): Entry[] {
    schemaOrThrow(schemaId);
    return store.listEntries(schemaId);
  },

  get(schemaId: string, entryId: string): Entry {
    schemaOrThrow(schemaId);
    return entryOrThrow(schemaId, entryId);
  },

  create(schemaId: string, values: Record<string, unknown>): Entry {
    const schema = schemaOrThrow(schemaId);
    assertValid(schema, values);
    const now = new Date().toISOString();
    const entry: Entry = {
      id: newId("ent"),
      schemaId,
      values: cleanValues(schema, values),
      createdAt: now,
      updatedAt: now,
    };
    store.insertEntry(entry);
    return entry;
  },

  update(
    schemaId: string,
    entryId: string,
    values: Record<string, unknown>,
  ): Entry {
    const schema = schemaOrThrow(schemaId);
    const existing = entryOrThrow(schemaId, entryId);
    assertValid(schema, values);
    const updated: Entry = {
      ...existing,
      values: cleanValues(schema, values),
      updatedAt: new Date().toISOString(),
    };
    store.replaceEntry(updated);
    return updated;
  },

  remove(schemaId: string, entryId: string): void {
    entryOrThrow(schemaId, entryId);
    store.deleteEntry(entryId);
  },
};

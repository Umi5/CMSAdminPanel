import type { Schema, Entry } from "@cms/shared";
import { store } from "../store";

/** Read-API shape: values keyed by current field NAME, nested under `data` so a
 * field can safely be called "id" without clashing with the entry's own id. */
export interface PublicEntry {
  id: string;
  createdAt: string;
  updatedAt: string;
  data: Record<string, unknown>;
}

// Translate an entry's id-keyed values into name-keyed public output. This is the
// one place field ids are turned back into names on the way out.
export function toPublicEntry(schema: Schema, entry: Entry): PublicEntry {
  const data: Record<string, unknown> = {};
  for (const field of schema.fields) {
    const value = entry.values[field.id];
    data[field.name] = value === undefined ? null : value;
  }
  return {
    id: entry.id,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    data,
  };
}

export const contentService = {
  list(schema: Schema): PublicEntry[] {
    return store
      .listEntries(schema.id)
      .map((entry) => toPublicEntry(schema, entry));
  },

  get(schema: Schema, entryId: string): PublicEntry | undefined {
    const entry = store.getEntry(entryId);
    if (!entry || entry.schemaId !== schema.id) return undefined;
    return toPublicEntry(schema, entry);
  },
};

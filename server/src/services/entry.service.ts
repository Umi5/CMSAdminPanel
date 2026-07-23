import type { Entry, EntryPage, Field, Schema } from "@cms/shared";
import { store } from "../store";
import { HttpError } from "../http";
import { newUuid } from "../ids";
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

export interface EntryListQuery {
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  /** 1-based. */
  page: number;
  /** Undefined = no pagination (return everything). */
  pageSize?: number;
  /** Per-field filter values, keyed as the client sends them (see below). */
  filter: Record<string, string>;
}

// Build the searchable text for an entry. Reference/boolean skipped (no labels
// server-side); the search bar mainly targets text, with number/date included.
function haystack(schema: Schema, entry: Entry): string {
  const parts: string[] = [];
  for (const field of schema.fields) {
    const v = entry.values[field.id];
    if (field.type === "text" || field.type === "date") {
      if (typeof v === "string") parts.push(v);
    } else if (field.type === "number") {
      if (typeof v === "number") parts.push(String(v));
    }
  }
  return parts.join(" ").toLowerCase();
}

function passesFilters(
  schema: Schema,
  entry: Entry,
  filter: Record<string, string>,
): boolean {
  for (const field of schema.fields) {
    if (field.type === "date") {
      const from = filter[`${field.id}__from`];
      const to = filter[`${field.id}__to`];
      const raw = entry.values[field.id];
      const v = typeof raw === "string" ? raw : "";
      if (from && (!v || v < from)) return false;
      if (to && (!v || v > to)) return false;
      continue;
    }
    if (field.type === "number") {
      const min = filter[`${field.id}__min`];
      const max = filter[`${field.id}__max`];
      const raw = entry.values[field.id];
      const n = typeof raw === "number" ? raw : NaN;
      if (min && (Number.isNaN(n) || n < Number(min))) return false;
      if (max && (Number.isNaN(n) || n > Number(max))) return false;
      continue;
    }
    const fv = filter[field.id];
    if (!fv) continue;
    if (field.type === "boolean") {
      const isYes = entry.values[field.id] === true;
      if (fv === "yes" && !isYes) return false;
      if (fv === "no" && isYes) return false;
    } else if (field.type === "reference") {
      if (entry.values[field.id] !== fv) return false;
    }
  }
  return true;
}

function sortRows(rows: Entry[], field: Field, dir: "asc" | "desc"): Entry[] {
  const sign = dir === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = a.values[field.id];
    const bv = b.values[field.id];
    const as = typeof av === "string" ? av : "";
    const bs = typeof bv === "string" ? bv : "";
    return (
      as.localeCompare(bs, undefined, { numeric: true, sensitivity: "base" }) *
      sign
    );
  });
}

export const entryService = {
  list(schemaId: string, query: EntryListQuery): EntryPage {
    const schema = schemaOrThrow(schemaId);
    let rows = store.listEntries(schemaId);

    if (query.search) {
      const q = query.search.toLowerCase();
      rows = rows.filter((e) => haystack(schema, e).includes(q));
    }
    rows = rows.filter((e) => passesFilters(schema, e, query.filter));

    if (query.sortBy) {
      const field = schema.fields.find((f) => f.id === query.sortBy);
      if (field && (field.type === "text" || field.type === "date")) {
        rows = sortRows(rows, field, query.sortDir ?? "asc");
      }
    }

    const total = rows.length;
    const { page, pageSize } = query;
    const items = pageSize
      ? rows.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize)
      : rows;
    return { items, total, page, pageSize: pageSize ?? total };
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
      id: newUuid(),
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

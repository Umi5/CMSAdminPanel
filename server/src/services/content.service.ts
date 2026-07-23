import type { Schema, Entry, Field } from "@cms/shared";
import { store } from "../store";
import { HttpError } from "../http";

/** Read-API shape: values keyed by current field NAME, nested under `data` so a
 * field can safely be called "id" without clashing with the entry's own id. */
export interface PublicEntry {
  id: string;
  createdAt: string;
  updatedAt: string;
  data: Record<string, unknown>;
}

// The public API returns a paginated list of entries, with the total count and
// the page number and size echoed back so the consumer can calculate how many
// pages there are.
export interface PublicEntryPage {
  items: PublicEntry[];
  total: number;
  page: number;
  pageSize: number;
}

// `filter[Rating]=98` (exact / contains) or `filter[Rating][min]=90&[max]=99`
export type ContentFilter = string | { min?: string; max?: string };

export interface ContentQuery {
  page: number;
  pageSize?: number;
  filter: Record<string, ContentFilter>;
}

/**
 * Public field key derived from the display name: "Release Date" -> "release_date".
 * snake_case so a consumer can write `data.release_date` and drop the key straight
 * into a query string without escaping, which a name with spaces would need.
 */
export function toFieldKey(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "field"
  );
}

/**
 * Field id -> public key for a whole schema. Deduped, because two different
 * display names ("In Stock" and "In-Stock") can slug down to the same key.
 */
export function publicFieldKeys(schema: Schema): Map<string, string> {
  const keys = new Map<string, string>();
  const taken = new Set<string>();
  for (const field of schema.fields) {
    const base = toFieldKey(field.name);
    let key = base;
    let n = 2;
    while (taken.has(key)) {
      key = `${base}_${n}`;
      n += 1;
    }
    taken.add(key);
    keys.set(field.id, key);
  }
  return keys;
}

// Translate an entry's id-keyed values into key-keyed public output. This is the
// one place field ids are turned into the public field keys on the way out.
export function toPublicEntry(schema: Schema, entry: Entry): PublicEntry {
  const keys = publicFieldKeys(schema);
  const data: Record<string, unknown> = {};
  for (const field of schema.fields) {
    const value = entry.values[field.id];
    data[keys.get(field.id) ?? field.id] = value === undefined ? null : value;
  }
  return {
    id: entry.id,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    data,
  };
}

// Filters arrive by public field key, so resolve them to fields once (and reject
// typos loudly) instead of doing the lookup for every entry.
function resolveFilters(
  schema: Schema,
  filter: Record<string, ContentFilter>,
): Array<{ field: Field; value: ContentFilter }> {
  const keys = publicFieldKeys(schema);
  const byKey = new Map<string, Field>();
  for (const field of schema.fields) {
    const key = keys.get(field.id);
    if (key) byKey.set(key, field);
  }

  return Object.entries(filter).map(([key, value]) => {
    const field = byKey.get(key.trim().toLowerCase());
    if (!field) {
      throw new HttpError(
        400,
        `Unknown field '${key}' for content type '${schema.apiId}'. ` +
          `Available: ${[...byKey.keys()].join(", ")}`,
      );
    }
    return { field, value };
  });
}

function matchesRange(
  field: Field,
  value: unknown,
  range: { min?: string; max?: string },
): boolean {
  if (field.type === "number") {
    const n = typeof value === "number" ? value : NaN;
    if (range.min && (Number.isNaN(n) || n < Number(range.min))) return false;
    if (range.max && (Number.isNaN(n) || n > Number(range.max))) return false;
    return true;
  }
  // Dates are ISO strings, so a plain string compare is a correct range check.
  const v = typeof value === "string" ? value : "";
  if (range.min && (!v || v < range.min)) return false;
  if (range.max && (!v || v > range.max)) return false;
  return true;
}

function matchesScalar(field: Field, value: unknown, wanted: string): boolean {
  switch (field.type) {
    case "boolean": {
      const want = wanted.toLowerCase() === "true";
      return (value === true) === want;
    }
    case "number":
      return typeof value === "number" && value === Number(wanted);
    case "date":
    case "reference":
      return value === wanted;
    case "text":
      return (typeof value === "string" ? value : "")
        .toLowerCase()
        .includes(wanted.toLowerCase());
  }
}

/** Pure: filter, then paginate, then translate. Exported so it can be tested
 *  without touching the store. */
export function queryEntries(
  schema: Schema,
  entries: Entry[],
  query: ContentQuery,
): PublicEntryPage {
  const filters = resolveFilters(schema, query.filter);

  const matched = entries.filter((entry) =>
    filters.every(({ field, value }) => {
      const raw = entry.values[field.id];
      return typeof value === "string"
        ? matchesScalar(field, raw, value)
        : matchesRange(field, raw, value);
    }),
  );

  const total = matched.length;
  const { page, pageSize } = query;
  const items = pageSize
    ? matched.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize)
    : matched;

  return {
    items: items.map((entry) => toPublicEntry(schema, entry)),
    total,
    page,
    pageSize: pageSize ?? total,
  };
}

export const contentService = {
  list(schema: Schema, query: ContentQuery): PublicEntryPage {
    return queryEntries(schema, store.listEntries(schema.id), query);
  },

  get(schema: Schema, entryId: string): PublicEntry | undefined {
    const entry = store.getEntry(entryId);
    if (!entry || entry.schemaId !== schema.id) return undefined;
    return toPublicEntry(schema, entry);
  },
};

import { randomUUID } from "node:crypto";

/** Prefixed opaque id, e.g. `sch_9f1c…`. The prefix is a debugging aid only.
 *  Used for internal ids (schemas, fields) that never appear in the public API. */
export function newId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

// Readable ids for schemas and fields make the seed easy to follow. They're
// internal only: neither ever appears in the public read API.
export const SCHEMA_PREFIX = "sch";
export const FIELD_PREFIX = "fld";
export function newUuid(): string {
  return randomUUID();
}

/** Turn a display name into a URL-safe slug for the read API (`My Wines` -> `my-wines`). */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Return `base`, or `base-2`, `base-3`… until it no longer collides with `taken`. */
export function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
  const slug = base || "type";
  if (!taken.has(slug)) return slug;
  let n = 2;
  while (taken.has(`${slug}-${n}`)) n += 1;
  return `${slug}-${n}`;
}

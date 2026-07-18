import { randomUUID } from 'node:crypto';

/** Prefixed opaque id, e.g. `sch_9f1c…`. The prefix is a debugging aid only. */
export function newId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

/** Turn a display name into a URL-safe slug for the read API (`My Wines` -> `my-wines`). */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Return `base`, or `base-2`, `base-3`… until it no longer collides with `taken`. */
export function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
  const slug = base || 'type';
  if (!taken.has(slug)) return slug;
  let n = 2;
  while (taken.has(`${slug}-${n}`)) n += 1;
  return `${slug}-${n}`;
}

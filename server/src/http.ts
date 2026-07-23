import type { Request } from "express";

/** An error carrying an HTTP status; the error middleware turns it into a response. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/**
 * Read a route parameter that the route guarantees exists. With
 * `noUncheckedIndexedAccess`, `req.params[name]` is `string | undefined`, so this
 * narrows it in one place instead of at every call site.
 */
export function requireParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== "string") {
    throw new HttpError(400, `Missing route parameter '${name}'`);
  }
  return value;
}

/** Parse a query-string integer, falling back when it is missing or malformed. */
export function toInt(value: unknown, fallback: number): number {
  const n = typeof value === "string" ? parseInt(value, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

/** Read a non-empty string query param, or undefined. */
export function toStr(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

import type { Request } from 'express';

/** An error carrying an HTTP status; the error middleware turns it into a response. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/**
 * Read a route parameter that the route guarantees exists. With
 * `noUncheckedIndexedAccess`, `req.params[name]` is `string | undefined`, so this
 * narrows it in one place instead of at every call site.
 */
export function requireParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string') {
    throw new HttpError(400, `Missing route parameter '${name}'`);
  }
  return value;
}

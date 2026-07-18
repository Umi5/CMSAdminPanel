import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { HttpError } from './http';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: { message: `No route for ${req.method} ${req.path}` } });
}

// Express identifies error middleware by its four-argument signature.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: { message: 'Invalid request body', details: err.flatten() } });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { message: err.message, details: err.details } });
    return;
  }
  console.error('[unhandled]', err);
  res.status(500).json({ error: { message: 'Internal server error' } });
}

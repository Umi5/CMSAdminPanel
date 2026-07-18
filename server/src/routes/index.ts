import type { Express, Request, Response } from 'express';
import { eventsRouter } from './events.routes';
import { schemaRouter } from './schema.routes';
import { contentRouter } from './content.routes';
import { statsController } from '../controllers/stats.controller';

export function registerRoutes(app: Express): void {
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });
  app.get('/api/stats/entry-counts', statsController.entryCounts);
  app.use('/api/events', eventsRouter);
  app.use('/api/schemas', schemaRouter);
  app.use('/api/content', contentRouter);
}

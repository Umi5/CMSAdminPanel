import type { Request, Response } from 'express';
import type { EntryCounts } from '@cms/shared';
import { store } from '../store';

export const statsController = {
  entryCounts(_req: Request, res: Response): void {
    const counts: EntryCounts = {};
    for (const schema of store.listSchemas()) {
      counts[schema.id] = store.listEntries(schema.id).length;
    }
    res.json(counts);
  },
};

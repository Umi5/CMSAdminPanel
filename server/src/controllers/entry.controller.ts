import type { Request, Response } from 'express';
import { entryService } from '../services/entry.service';
import { entryBodySchema } from '../validation/entry.validation';
import { requireParam } from '../http';
import { eventBus } from '../events';

export const entryController = {
  list(req: Request, res: Response): void {
    res.json(entryService.list(requireParam(req, 'schemaId')));
  },

  get(req: Request, res: Response): void {
    res.json(entryService.get(requireParam(req, 'schemaId'), requireParam(req, 'entryId')));
  },

  create(req: Request, res: Response): void {
    const schemaId = requireParam(req, 'schemaId');
    const { values } = entryBodySchema.parse(req.body);
    const entry = entryService.create(schemaId, values);
    eventBus.broadcast({ type: 'entry.created', entry });
    res.status(201).json(entry);
  },

  update(req: Request, res: Response): void {
    const schemaId = requireParam(req, 'schemaId');
    const entryId = requireParam(req, 'entryId');
    const { values } = entryBodySchema.parse(req.body);
    const entry = entryService.update(schemaId, entryId, values);
    eventBus.broadcast({ type: 'entry.updated', entry });
    res.json(entry);
  },

  remove(req: Request, res: Response): void {
    const schemaId = requireParam(req, 'schemaId');
    const entryId = requireParam(req, 'entryId');
    entryService.remove(schemaId, entryId);
    eventBus.broadcast({ type: 'entry.deleted', schemaId, entryId });
    res.status(204).end();
  },
};

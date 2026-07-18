import type { Request, Response } from 'express';
import { schemaService } from '../services/schema.service';
import { contentService } from '../services/content.service';
import { HttpError, requireParam } from '../http';

export const contentController = {
  list(req: Request, res: Response): void {
    const schema = schemaService.getByApiId(requireParam(req, 'type'));
    res.json(contentService.list(schema));
  },

  get(req: Request, res: Response): void {
    const schema = schemaService.getByApiId(requireParam(req, 'type'));
    const item = contentService.get(schema, requireParam(req, 'id'));
    if (!item) throw new HttpError(404, 'Entry not found');
    res.json(item);
  },
};

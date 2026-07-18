import type { Request, Response } from 'express';
import { migrationService } from '../services/migration/migration.service';
import {
  migrationPlanBodySchema,
  migrationApplyBodySchema,
} from '../validation/migration.validation';
import { requireParam } from '../http';
import { eventBus } from '../events';

export const migrationController = {
  // Dry run — returns the impact report without changing anything.
  plan(req: Request, res: Response): void {
    const schemaId = requireParam(req, 'schemaId');
    const { draft } = migrationPlanBodySchema.parse(req.body);
    res.json(migrationService.plan(schemaId, draft));
  },

  // Apply schema + entry migration atomically, then announce the new schema.
  apply(req: Request, res: Response): void {
    const schemaId = requireParam(req, 'schemaId');
    const { draft, basedOnVersion, overrides } = migrationApplyBodySchema.parse(req.body);
    const result = migrationService.apply(schemaId, draft, basedOnVersion, overrides);
    eventBus.broadcast({ type: 'schema.updated', schema: result.schema });
    res.json(result);
  },
};

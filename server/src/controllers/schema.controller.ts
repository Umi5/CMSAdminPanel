import type { Request, Response } from "express";
import { schemaService } from "../services/schema.service";
import { createSchemaSchema } from "../validation/schema.validation";
import { requireParam } from "../http";
import { eventBus } from "../events";

export const schemaController = {
  list(_req: Request, res: Response): void {
    res.json(schemaService.list());
  },

  get(req: Request, res: Response): void {
    res.json(schemaService.get(requireParam(req, "schemaId")));
  },

  create(req: Request, res: Response): void {
    const input = createSchemaSchema.parse(req.body);
    const schema = schemaService.create(input);
    eventBus.broadcast({ type: "schema.created", schema });
    res.status(201).json(schema);
  },

  remove(req: Request, res: Response): void {
    const schemaId = requireParam(req, "schemaId");
    schemaService.remove(schemaId);
    eventBus.broadcast({ type: "schema.deleted", schemaId });
    res.status(204).end();
  },
};

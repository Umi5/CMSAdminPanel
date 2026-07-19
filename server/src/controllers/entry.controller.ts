import type { Request, Response } from "express";
import { entryService } from "../services/entry.service";
import { entryBodySchema } from "../validation/entry.validation";
import { requireParam } from "../http";
import { eventBus } from "../events";

function toInt(value: unknown, fallback: number): number {
  const n = typeof value === "string" ? parseInt(value, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function toStr(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

export const entryController = {
  list(req: Request, res: Response): void {
    const q = req.query;
    // Express parses `filter[fieldId]=x` into a nested object.
    const filter: Record<string, string> = {};
    if (q.filter && typeof q.filter === "object" && !Array.isArray(q.filter)) {
      for (const [key, value] of Object.entries(q.filter)) {
        if (typeof value === "string") filter[key] = value;
      }
    }
    const pageSizeRaw = q.pageSize;
    res.json(
      entryService.list(requireParam(req, "schemaId"), {
        search: toStr(q.search),
        sortBy: toStr(q.sortBy),
        sortDir:
          q.sortDir === "desc"
            ? "desc"
            : q.sortDir === "asc"
              ? "asc"
              : undefined,
        page: Math.max(1, toInt(q.page, 1)),
        pageSize:
          pageSizeRaw === undefined
            ? undefined
            : Math.min(200, Math.max(1, toInt(pageSizeRaw, 10))),
        filter,
      }),
    );
  },

  get(req: Request, res: Response): void {
    res.json(
      entryService.get(
        requireParam(req, "schemaId"),
        requireParam(req, "entryId"),
      ),
    );
  },

  create(req: Request, res: Response): void {
    const schemaId = requireParam(req, "schemaId");
    const { values } = entryBodySchema.parse(req.body);
    const entry = entryService.create(schemaId, values);
    eventBus.broadcast({ type: "entry.created", entry });
    res.status(201).json(entry);
  },

  update(req: Request, res: Response): void {
    const schemaId = requireParam(req, "schemaId");
    const entryId = requireParam(req, "entryId");
    const { values } = entryBodySchema.parse(req.body);
    const entry = entryService.update(schemaId, entryId, values);
    eventBus.broadcast({ type: "entry.updated", entry });
    res.json(entry);
  },

  remove(req: Request, res: Response): void {
    const schemaId = requireParam(req, "schemaId");
    const entryId = requireParam(req, "entryId");
    entryService.remove(schemaId, entryId);
    eventBus.broadcast({ type: "entry.deleted", schemaId, entryId });
    res.status(204).end();
  },
};

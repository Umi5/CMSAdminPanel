import type { Request, Response } from "express";
import { schemaService } from "../services/schema.service";
import {
  contentService,
  type ContentFilter,
} from "../services/content.service";
import { HttpError, requireParam, toInt } from "../http";

const MAX_PAGE_SIZE = 100;

// Parse the query-string filter object into a typed record of ContentFilter values.
function parseFilters(raw: unknown): Record<string, ContentFilter> {
  const filter: Record<string, ContentFilter> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return filter;

  for (const [name, value] of Object.entries(raw)) {
    if (typeof value === "string") {
      filter[name] = value;
      continue;
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const range = value as Record<string, unknown>;
      const min = typeof range.min === "string" ? range.min : undefined;
      const max = typeof range.max === "string" ? range.max : undefined;
      if (min !== undefined || max !== undefined) filter[name] = { min, max };
    }
  }
  return filter;
}

export const contentController = {
  list(req: Request, res: Response): void {
    const schema = schemaService.getByApiId(requireParam(req, "type"));
    const { page, pageSize, filter } = req.query;

    res.json(
      contentService.list(schema, {
        page: Math.max(1, toInt(page, 1)),
        // Clamp pageSize to [1, MAX_PAGE_SIZE] if present, otherwise undefined = no pagination.
        pageSize:
          pageSize === undefined
            ? undefined
            : Math.min(MAX_PAGE_SIZE, Math.max(1, toInt(pageSize, 25))),
        filter: parseFilters(filter),
      }),
    );
  },

  get(req: Request, res: Response): void {
    const schema = schemaService.getByApiId(requireParam(req, "type"));
    const item = contentService.get(schema, requireParam(req, "id"));
    if (!item) throw new HttpError(404, "Entry not found");
    res.json(item);
  },
};

import { z } from 'zod';

// Only the envelope shape is validated here; the schema-driven validator checks
// the actual values against the content type's fields.
export const entryBodySchema = z.object({
  values: z.record(z.string(), z.unknown()),
});

export type EntryBody = z.infer<typeof entryBodySchema>;

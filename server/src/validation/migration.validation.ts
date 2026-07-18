import { z } from "zod";

const fieldTypeSchema = z.enum([
  "text",
  "number",
  "boolean",
  "date",
  "reference",
]);

// A draft field always carries an id: existing fields keep theirs, new fields get
// a client-generated one so overrides can reference them before the schema is saved.
const draftFieldSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    type: fieldTypeSchema,
    required: z.boolean(),
    referenceSchemaId: z.string().min(1).optional(),
  })
  .refine((f) => f.type !== "reference" || Boolean(f.referenceSchemaId), {
    message: "Reference fields require a referenceSchemaId",
    path: ["referenceSchemaId"],
  });

const draftSchemaSchema = z.object({
  name: z.string().min(1),
  apiId: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  fields: z
    .array(draftFieldSchema)
    .min(1, "A content type needs at least one field"),
});

export const migrationPlanBodySchema = z.object({ draft: draftSchemaSchema });

export const migrationApplyBodySchema = z.object({
  draft: draftSchemaSchema,
  basedOnVersion: z.number().int().nonnegative(),
  overrides: z
    .record(z.string(), z.record(z.string(), z.unknown()))
    .default({}),
});

export type DraftSchemaInput = z.infer<typeof draftSchemaSchema>;

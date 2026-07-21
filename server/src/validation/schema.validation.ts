import { z } from "zod";

const fieldTypeSchema = z.enum([
  "text",
  "number",
  "boolean",
  "date",
  "reference",
]);

/**
 * One field in a create/draft request. `id` is optional — the client supplies it
 * for existing fields (and for new draft fields, so overrides can reference them);
 * the server generates one when it's absent.
 */
export const fieldInputSchema = z
  .object({
    id: z.string().min(1).optional(),
    name: z.string().min(1),
    type: fieldTypeSchema,
    required: z.boolean().optional().default(false),
    referenceSchemaId: z.string().min(1).optional(),
    nonNegative: z.boolean().optional(),
  })
  .refine((f) => f.type !== "reference" || Boolean(f.referenceSchemaId), {
    message: "Reference fields require a referenceSchemaId",
    path: ["referenceSchemaId"],
  });

export const createSchemaSchema = z.object({
  name: z.string().min(1),
  apiId: z
    .string()
    .min(1)
    .regex(
      /^[a-z0-9-]+$/,
      "apiId may contain only lowercase letters, numbers and hyphens",
    )
    .optional(),
  fields: z
    .array(fieldInputSchema)
    .min(1, "A content type needs at least one field"),
});

export type FieldInput = z.infer<typeof fieldInputSchema>;
export type CreateSchemaInput = z.infer<typeof createSchemaSchema>;

import type { Schema } from '@cms/shared';

/** Client-side mirror of the server's schema-driven validation, keyed by field id.
 *  The server is still the source of truth; this just gives instant feedback. */
export function validateEntry(schema: Schema, values: Record<string, unknown>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of schema.fields) {
    const value = values[field.id];
    const empty = value === undefined || value === null || value === '';
    if (empty) {
      if (field.required) errors[field.id] = 'This field is required';
      continue;
    }
    switch (field.type) {
      case 'number':
        if (typeof value !== 'number' || !Number.isFinite(value)) errors[field.id] = 'Must be a number';
        break;
      case 'boolean':
        if (typeof value !== 'boolean') errors[field.id] = 'Must be true or false';
        break;
      case 'date':
        if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) errors[field.id] = 'Must be a valid date';
        break;
      case 'reference':
        if (typeof value !== 'string') errors[field.id] = 'Pick an entry';
        break;
      case 'text':
        if (typeof value !== 'string') errors[field.id] = 'Must be text';
        break;
    }
  }
  return errors;
}

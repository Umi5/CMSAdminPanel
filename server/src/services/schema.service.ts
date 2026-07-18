import type { Schema, Field } from '@cms/shared';
import { store } from '../store';
import { HttpError } from '../http';
import { newId, slugify, uniqueSlug } from '../ids';
import type { CreateSchemaInput, FieldInput } from '../validation/schema.validation';

function buildField(input: FieldInput): Field {
  const field: Field = {
    id: input.id ?? newId('fld'),
    name: input.name,
    type: input.type,
    required: input.required,
  };
  if (input.type === 'reference' && input.referenceSchemaId) {
    field.referenceSchemaId = input.referenceSchemaId;
  }
  return field;
}

function assertUniqueFieldNames(fields: readonly FieldInput[]): void {
  const seen = new Set<string>();
  for (const field of fields) {
    const key = field.name.trim().toLowerCase();
    if (seen.has(key)) {
      throw new HttpError(400, `Duplicate field name '${field.name}'`);
    }
    seen.add(key);
  }
}

function assertReferenceTargetsExist(fields: readonly FieldInput[]): void {
  for (const field of fields) {
    if (field.type !== 'reference') continue;
    if (!field.referenceSchemaId || !store.getSchema(field.referenceSchemaId)) {
      throw new HttpError(400, `Reference field '${field.name}' points to a content type that does not exist`);
    }
  }
}

export const schemaService = {
  list(): Schema[] {
    return store.listSchemas();
  },

  get(id: string): Schema {
    const schema = store.getSchema(id);
    if (!schema) throw new HttpError(404, 'Content type not found');
    return schema;
  },

  getByApiId(apiId: string): Schema {
    const schema = store.getSchemaByApiId(apiId);
    if (!schema) throw new HttpError(404, `No content type '${apiId}'`);
    return schema;
  },

  create(input: CreateSchemaInput): Schema {
    assertUniqueFieldNames(input.fields);
    assertReferenceTargetsExist(input.fields);

    const taken = new Set(store.listSchemas().map((s) => s.apiId));
    const apiId = uniqueSlug(slugify(input.apiId ?? input.name), taken);
    const now = new Date().toISOString();

    const schema: Schema = {
      id: newId('sch'),
      name: input.name,
      apiId,
      fields: input.fields.map(buildField),
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    store.insertSchema(schema);
    return schema;
  },

  remove(id: string): void {
    if (!store.getSchema(id)) throw new HttpError(404, 'Content type not found');
    store.deleteSchemaCascade(id);
  },
};

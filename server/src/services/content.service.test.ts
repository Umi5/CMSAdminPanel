import { describe, it, expect } from 'vitest';
import type { Schema, Entry } from '@cms/shared';
import { toPublicEntry } from './content.service';

const schema: Schema = {
  id: 's',
  name: 'S',
  apiId: 's',
  version: 1,
  createdAt: 't',
  updatedAt: 't',
  fields: [
    { id: 'f1', name: 'Title', type: 'text', required: true },
    { id: 'f2', name: 'Producer', type: 'reference', required: false, referenceSchemaId: 'p' },
  ],
};

const entry: Entry = {
  id: 'e1',
  schemaId: 's',
  values: { f1: 'Hello', f2: 'p1' },
  createdAt: 't',
  updatedAt: 't',
};

describe('toPublicEntry', () => {
  it('keys output by current field name and nests it under data', () => {
    expect(toPublicEntry(schema, entry)).toEqual({
      id: 'e1',
      createdAt: 't',
      updatedAt: 't',
      data: { Title: 'Hello', Producer: 'p1' },
    });
  });

  it('emits null for fields the entry has no value for', () => {
    const partial: Entry = { ...entry, values: { f1: 'Hi' } };
    expect(toPublicEntry(schema, partial).data).toEqual({ Title: 'Hi', Producer: null });
  });

  it('reflects the current name after a rename (values are keyed by id)', () => {
    const renamed: Schema = {
      ...schema,
      fields: [{ id: 'f1', name: 'Headline', type: 'text', required: true }],
    };
    expect(toPublicEntry(renamed, entry).data).toEqual({ Headline: 'Hello' });
  });
});

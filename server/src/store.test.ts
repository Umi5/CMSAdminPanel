import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Schema, Entry } from '@cms/shared';
import { Store } from './store';

function tmpStoreFile(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cms-store-'));
  return path.join(dir, 'store.json');
}

const schema: Schema = {
  id: 's1',
  name: 'S',
  apiId: 's',
  version: 1,
  createdAt: 't',
  updatedAt: 't',
  fields: [{ id: 'f1', name: 'N', type: 'text', required: true }],
};
const entry: Entry = { id: 'e1', schemaId: 's1', values: { f1: 'x' }, createdAt: 't', updatedAt: 't' };

describe('Store persistence', () => {
  it('round-trips schemas and entries through the JSON file', () => {
    const file = tmpStoreFile();
    const writer = new Store(file);
    writer.insertSchema(schema);
    writer.insertEntry(entry);

    const reader = new Store(file);
    reader.load();
    expect(reader.getSchema('s1')).toEqual(schema);
    expect(reader.listEntries('s1')).toEqual([entry]);
  });

  it('cascade-deletes a schema together with its entries', () => {
    const file = tmpStoreFile();
    const store = new Store(file);
    store.insertSchema(schema);
    store.insertEntry(entry);
    store.deleteSchemaCascade('s1');

    const reader = new Store(file);
    reader.load();
    expect(reader.getSchema('s1')).toBeUndefined();
    expect(reader.listEntries('s1')).toEqual([]);
  });

  it('rolls back in-memory state when a transaction throws', () => {
    const file = tmpStoreFile();
    const store = new Store(file);
    store.insertSchema(schema);
    expect(() =>
      store.transaction(() => {
        store.insertEntry(entry);
        throw new Error('boom');
      }),
    ).toThrow('boom');
    expect(store.getEntry('e1')).toBeUndefined();
  });
});

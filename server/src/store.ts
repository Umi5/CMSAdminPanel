import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Schema, Entry } from '@cms/shared';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_FILE =
  process.env.DATA_FILE ?? path.resolve(moduleDir, '../data/store.json');

interface Persisted {
  schemas: Schema[];
  entries: Entry[];
}

/**
 * In-memory content store mirrored to a JSON file. All mutations are synchronous
 * so a request handler can make several of them without the event loop
 * interleaving another request — which is what makes migration "apply" atomic.
 * Persistence is an atomic temp-file + rename so a crash mid-write can't corrupt
 * the store on disk.
 */
export class Store {
  private schemas = new Map<string, Schema>();
  private entries = new Map<string, Entry>();
  private txDepth = 0;

  constructor(private readonly filePath: string = DEFAULT_DATA_FILE) {}

  load(): void {
    if (!fs.existsSync(this.filePath)) return;
    const raw = fs.readFileSync(this.filePath, 'utf8');
    const data = JSON.parse(raw) as Persisted;
    this.schemas = new Map(data.schemas.map((s) => [s.id, s]));
    this.entries = new Map(data.entries.map((e) => [e.id, e]));
  }

  isEmpty(): boolean {
    return this.schemas.size === 0 && this.entries.size === 0;
  }

  // --- schema queries ---
  listSchemas(): Schema[] {
    return [...this.schemas.values()];
  }
  getSchema(id: string): Schema | undefined {
    return this.schemas.get(id);
  }
  getSchemaByApiId(apiId: string): Schema | undefined {
    for (const schema of this.schemas.values()) {
      if (schema.apiId === apiId) return schema;
    }
    return undefined;
  }

  // --- entry queries ---
  listEntries(schemaId: string): Entry[] {
    return [...this.entries.values()].filter((e) => e.schemaId === schemaId);
  }
  getEntry(id: string): Entry | undefined {
    return this.entries.get(id);
  }

  // --- mutations ---
  insertSchema(schema: Schema): void {
    this.schemas.set(schema.id, schema);
    this.commit();
  }
  replaceSchema(schema: Schema): void {
    this.schemas.set(schema.id, schema);
    this.commit();
  }
  deleteSchemaCascade(id: string): void {
    this.transaction(() => {
      this.schemas.delete(id);
      for (const [entryId, entry] of this.entries) {
        if (entry.schemaId === id) this.entries.delete(entryId);
      }
    });
  }

  insertEntry(entry: Entry): void {
    this.entries.set(entry.id, entry);
    this.commit();
  }
  replaceEntry(entry: Entry): void {
    this.entries.set(entry.id, entry);
    this.commit();
  }
  deleteEntry(id: string): void {
    this.entries.delete(id);
    this.commit();
  }

  /**
   * Run several mutations and persist once at the end. If `fn` throws, the
   * in-memory state is rolled back to its pre-transaction snapshot so a failed
   * migration can't leave the process in a half-applied state.
   */
  transaction<T>(fn: () => T): T {
    const schemaSnapshot = new Map(this.schemas);
    const entrySnapshot = new Map(this.entries);
    this.txDepth += 1;
    try {
      const result = fn();
      this.txDepth -= 1;
      if (this.txDepth === 0) this.persist();
      return result;
    } catch (err) {
      this.schemas = schemaSnapshot;
      this.entries = entrySnapshot;
      this.txDepth = 0;
      throw err;
    }
  }

  private commit(): void {
    if (this.txDepth === 0) this.persist();
  }

  private persist(): void {
    const data: Persisted = {
      schemas: [...this.schemas.values()],
      entries: [...this.entries.values()],
    };
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, this.filePath); // atomic on the same filesystem
  }
}

export const store = new Store();

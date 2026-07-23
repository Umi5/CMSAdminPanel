/**
 * Cross-app contract types. Both `server` and `web` import from here so the
 * shapes that matter most — schemas, entries, and the migration report — can
 * never drift between the two.
 */

// --- Content model ---

export type FieldType = "text" | "number" | "boolean" | "date" | "reference";

export interface Field {
  id: string;
  name: string;
  type: FieldType;
  required: boolean;
  /** Only set when `type === 'reference'`: the schema id this field points to. */
  referenceSchemaId?: string;
  nonNegative?: boolean;
}

export interface Schema {
  id: string;
  name: string;
  apiId: string;
  fields: Field[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * An entry's values are keyed by `Field.id` (never by name), which is what makes
 * renaming a field pure metadata — no data touched, no migration needed.
 */
export interface Entry {
  id: string;
  schemaId: string;
  values: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface EntryPage {
  items: Entry[];
  total: number;
  page: number;
  pageSize: number;
}

// --- Migration contract ---

export type ChangeKind =
  | "field_added"
  | "field_removed"
  | "field_renamed"
  | "field_retyped"
  | "required_enabled"
  | "required_disabled"
  | "constraint_enabled"
  | "constraint_disabled"
  | "reference_retargeted";

// --- Migration plan and application ---
export type Severity = "safe" | "warning" | "risky" | "destructive";

export interface ValueIssue {
  entryId: string;
  currentValue: unknown;
  reason: string;
}

export interface FieldChange {
  fieldId: string;
  fieldName: string;
  changeKind: ChangeKind;
  severity: Severity;
  /** Number of existing entries this change touches. */
  affectedCount: number;
  /** Of the affected entries, how many convert cleanly with no user input. */
  cleanCount: number;
  /** Affected entries whose current value can't convert and need a manual fix. */
  needsAttention: ValueIssue[];
}

export interface MigrationPlan {
  schemaId: string;
  /** Schema version the draft was diffed against (optimistic-concurrency token). */
  basedOnVersion: number;
  changes: FieldChange[];
  totalNeedsAttention: number;
}

/** Client-supplied fixes: `overrides[entryId][fieldId]` = corrected value. */
export type MigrationOverrides = Record<string, Record<string, unknown>>;

export interface MigrationApplyRequest {
  draft: Schema;
  basedOnVersion: number;
  overrides: MigrationOverrides;
}

/** Entry count per schema id, for overview screens. */
export type EntryCounts = Record<string, number>;

// --- Real-time events (server -> client over SSE) ---

export type ServerEvent =
  | { type: "schema.created"; schema: Schema }
  | { type: "schema.updated"; schema: Schema }
  | { type: "schema.deleted"; schemaId: string }
  | { type: "entry.created"; entry: Entry }
  | { type: "entry.updated"; entry: Entry }
  | { type: "entry.deleted"; schemaId: string; entryId: string };

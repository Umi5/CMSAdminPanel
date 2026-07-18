import type {
  Schema,
  Field,
  Entry,
  MigrationPlan,
  MigrationOverrides,
} from "@cms/shared";
import { store } from "../../store";
import { HttpError } from "../../http";
import { validateEntryValues, type RefResolver } from "../../entry-validator";
import {
  planMigration,
  computeMigratedValues,
  type RefExistsInTarget,
} from "./planner";
import type { DraftSchemaInput } from "../../validation/migration.validation";

const refExistsInTarget: RefExistsInTarget = (referenceSchemaId, entryId) => {
  const entry = store.getEntry(entryId);
  return entry !== undefined && entry.schemaId === referenceSchemaId;
};
// Same predicate, used when re-validating entries against the draft.
const refResolver: RefResolver = refExistsInTarget;

// Turn the client's draft into a full Schema, taking identity/version/timestamps
// from the server's copy so the client can't spoof them.
function buildDraftSchema(current: Schema, input: DraftSchemaInput): Schema {
  return {
    id: current.id,
    name: input.name,
    apiId: input.apiId ?? current.apiId,
    version: current.version,
    createdAt: current.createdAt,
    updatedAt: current.updatedAt,
    fields: input.fields.map((f): Field => {
      const field: Field = {
        id: f.id,
        name: f.name,
        type: f.type,
        required: f.required,
      };
      if (f.type === "reference" && f.referenceSchemaId)
        field.referenceSchemaId = f.referenceSchemaId;
      return field;
    }),
  };
}

function validateDraftStructure(draft: Schema, current: Schema): void {
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const field of draft.fields) {
    if (ids.has(field.id))
      throw new HttpError(400, `Duplicate field id '${field.id}'`);
    ids.add(field.id);

    const nameKey = field.name.trim().toLowerCase();
    if (names.has(nameKey))
      throw new HttpError(400, `Duplicate field name '${field.name}'`);
    names.add(nameKey);

    if (field.type === "reference") {
      const target = field.referenceSchemaId;
      // Self-reference is allowed (target === current.id).
      if (!target || (target !== current.id && !store.getSchema(target))) {
        throw new HttpError(
          400,
          `Reference field '${field.name}' points to a content type that does not exist`,
        );
      }
    }
  }
  if (draft.apiId !== current.apiId) {
    const taken = store
      .listSchemas()
      .filter((s) => s.id !== current.id)
      .map((s) => s.apiId);
    if (taken.includes(draft.apiId))
      throw new HttpError(400, `apiId '${draft.apiId}' is already in use`);
  }
}

function currentOrThrow(schemaId: string): Schema {
  const current = store.getSchema(schemaId);
  if (!current) throw new HttpError(404, "Content type not found");
  return current;
}

export const migrationService = {
  /** Dry run: never touches stored data. */
  plan(schemaId: string, input: DraftSchemaInput): MigrationPlan {
    const current = currentOrThrow(schemaId);
    const draft = buildDraftSchema(current, input);
    validateDraftStructure(draft, current);
    return planMigration(
      current,
      draft,
      store.listEntries(schemaId),
      refExistsInTarget,
    );
  },

  apply(
    schemaId: string,
    input: DraftSchemaInput,
    basedOnVersion: number,
    overrides: MigrationOverrides,
  ): { schema: Schema; migratedCount: number } {
    const current = currentOrThrow(schemaId);
    const draft = buildDraftSchema(current, input);
    validateDraftStructure(draft, current);

    const entries = store.listEntries(schemaId);
    const freshPlan = planMigration(current, draft, entries, refExistsInTarget);

    // The schema moved under us since the draft was planned.
    if (current.version !== basedOnVersion) {
      throw new HttpError(
        409,
        "This content type changed since you started editing",
        {
          reason: "stale",
          plan: freshPlan,
        },
      );
    }

    // Every flagged value must be addressed by an override (even an empty one, to
    // mean "clear it") before we'll apply. This also catches values that became
    // unconvertible because another client edited data after the preview.
    const unresolved: Array<{ entryId: string; fieldId: string }> = [];
    for (const change of freshPlan.changes) {
      for (const issue of change.needsAttention) {
        const entryOverrides = overrides[issue.entryId];
        const addressed =
          entryOverrides !== undefined &&
          Object.prototype.hasOwnProperty.call(entryOverrides, change.fieldId);
        if (!addressed)
          unresolved.push({ entryId: issue.entryId, fieldId: change.fieldId });
      }
    }
    if (unresolved.length > 0) {
      throw new HttpError(
        409,
        "Some values still need attention before this can be applied",
        {
          reason: "unresolved",
          plan: freshPlan,
        },
      );
    }

    // Build the migrated entries and re-validate them against the draft. This is
    // what catches an override that is itself invalid (e.g. "abc" for a number).
    const now = new Date().toISOString();
    const migrated: Entry[] = entries.map((entry) => ({
      ...entry,
      values: computeMigratedValues(
        current,
        draft,
        entry,
        overrides[entry.id],
        refExistsInTarget,
      ),
      updatedAt: now,
    }));

    const invalid = migrated
      .map((entry) => ({
        entryId: entry.id,
        errors: validateEntryValues(draft, entry.values, refResolver),
      }))
      .filter((result) => result.errors.length > 0);
    if (invalid.length > 0) {
      throw new HttpError(400, "Some corrected values are still invalid", {
        reason: "invalid",
        invalid,
      });
    }

    const newSchema: Schema = {
      ...draft,
      version: current.version + 1,
      updatedAt: now,
    };
    store.transaction(() => {
      store.replaceSchema(newSchema);
      for (const entry of migrated) store.replaceEntry(entry);
    });
    return { schema: newSchema, migratedCount: migrated.length };
  },
};

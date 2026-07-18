import type {
  Schema,
  Field,
  Entry,
  FieldChange,
  ChangeKind,
  MigrationPlan,
  ValueIssue,
  Severity,
} from "@cms/shared";
import { isEmpty } from "../../entry-validator";
import { convert, retypeBaseSeverity, maxSeverity } from "./converters";

/** Whether `entryId` exists inside `referenceSchemaId` — used to judge reference validity. */
export type RefExistsInTarget = (
  referenceSchemaId: string,
  entryId: string,
) => boolean;

function base(
  field: Field,
  changeKind: ChangeKind,
  severity: Severity,
): FieldChange {
  return {
    fieldId: field.id,
    fieldName: field.name,
    changeKind,
    severity,
    affectedCount: 0,
    cleanCount: 0,
    needsAttention: [],
  };
}

function renamedChange(draftField: Field): FieldChange {
  return base(draftField, "field_renamed", "safe");
}

function requiredDisabledChange(draftField: Field): FieldChange {
  return base(draftField, "required_disabled", "safe");
}

function requiredEnabledChange(
  draftField: Field,
  entries: Entry[],
): FieldChange {
  const needsAttention: ValueIssue[] = [];
  for (const entry of entries) {
    if (isEmpty(entry.values[draftField.id])) {
      needsAttention.push({
        entryId: entry.id,
        currentValue: null,
        reason: "is now required but empty",
      });
    }
  }
  return {
    ...base(
      draftField,
      "required_enabled",
      needsAttention.length > 0 ? "warning" : "safe",
    ),
    affectedCount: needsAttention.length,
    needsAttention,
  };
}

function addedChange(draftField: Field, entries: Entry[]): FieldChange {
  if (!draftField.required) return base(draftField, "field_added", "safe");
  const needsAttention: ValueIssue[] = entries.map((entry) => ({
    entryId: entry.id,
    currentValue: null,
    reason: "new required field needs a value",
  }));
  return {
    ...base(
      draftField,
      "field_added",
      needsAttention.length > 0 ? "warning" : "safe",
    ),
    affectedCount: needsAttention.length,
    needsAttention,
  };
}

function retypedChange(
  currentField: Field,
  draftField: Field,
  entries: Entry[],
): FieldChange {
  const needsAttention: ValueIssue[] = [];
  let cleanCount = 0;
  for (const entry of entries) {
    const value = entry.values[currentField.id];
    if (isEmpty(value)) continue;
    const result = convert(value, currentField.type, draftField.type);
    if (result.status === "clean") {
      cleanCount += 1;
    } else {
      needsAttention.push({
        entryId: entry.id,
        currentValue: value,
        reason: result.reason,
      });
    }
  }
  const severity = maxSeverity(
    retypeBaseSeverity(currentField.type, draftField.type),
    needsAttention.length > 0 ? "risky" : "safe",
  );
  return {
    ...base(draftField, "field_retyped", severity),
    affectedCount: cleanCount + needsAttention.length,
    cleanCount,
    needsAttention,
  };
}

function retargetedChange(
  draftField: Field,
  entries: Entry[],
  refExists: RefExistsInTarget,
): FieldChange {
  const target = draftField.referenceSchemaId;
  const needsAttention: ValueIssue[] = [];
  let cleanCount = 0;
  for (const entry of entries) {
    const value = entry.values[draftField.id];
    if (isEmpty(value)) continue;
    if (target && typeof value === "string" && refExists(target, value)) {
      cleanCount += 1;
    } else {
      needsAttention.push({
        entryId: entry.id,
        currentValue: value,
        reason: "no longer points to a valid entry in the new target",
      });
    }
  }
  return {
    ...base(
      draftField,
      "reference_retargeted",
      needsAttention.length > 0 ? "destructive" : "warning",
    ),
    affectedCount: cleanCount + needsAttention.length,
    cleanCount,
    needsAttention,
  };
}

function removedChange(currentField: Field, entries: Entry[]): FieldChange {
  const withData = entries.filter(
    (entry) => !isEmpty(entry.values[currentField.id]),
  );
  return {
    ...base(
      currentField,
      "field_removed",
      withData.length > 0 ? "destructive" : "safe",
    ),
    affectedCount: withData.length,
  };
}

/**
 * Diff a draft schema against the stored one and every existing entry, producing
 * the impact report. Pure: reference validity is injected via `refExistsInTarget`
 * so it stays trivially testable.
 */
export function planMigration(
  current: Schema,
  draft: Schema,
  entries: Entry[],
  refExistsInTarget: RefExistsInTarget,
): MigrationPlan {
  const currentById = new Map(current.fields.map((f) => [f.id, f] as const));
  const draftIds = new Set(draft.fields.map((f) => f.id));
  const changes: FieldChange[] = [];

  for (const draftField of draft.fields) {
    const currentField = currentById.get(draftField.id);
    if (!currentField) {
      changes.push(addedChange(draftField, entries));
      continue;
    }
    if (currentField.name !== draftField.name) {
      changes.push(renamedChange(draftField));
    }
    if (!currentField.required && draftField.required) {
      changes.push(requiredEnabledChange(draftField, entries));
    } else if (currentField.required && !draftField.required) {
      changes.push(requiredDisabledChange(draftField));
    }
    if (currentField.type !== draftField.type) {
      changes.push(retypedChange(currentField, draftField, entries));
    } else if (
      draftField.type === "reference" &&
      currentField.referenceSchemaId !== draftField.referenceSchemaId
    ) {
      changes.push(retargetedChange(draftField, entries, refExistsInTarget));
    }
  }

  for (const currentField of current.fields) {
    if (!draftIds.has(currentField.id)) {
      changes.push(removedChange(currentField, entries));
    }
  }

  const totalNeedsAttention = changes.reduce(
    (sum, c) => sum + c.needsAttention.length,
    0,
  );
  return {
    schemaId: current.id,
    basedOnVersion: current.version,
    changes,
    totalNeedsAttention,
  };
}

/**
 * Compute an entry's post-migration values. Override wins; otherwise a cleanly
 * convertible value is converted and kept, a still-valid reference is kept, an
 * unchanged field is carried over, and everything else drops out (removed fields,
 * unconvertible values with no override). The caller re-validates the result.
 */
export function computeMigratedValues(
  current: Schema,
  draft: Schema,
  entry: Entry,
  entryOverrides: Record<string, unknown> | undefined,
  refExistsInTarget: RefExistsInTarget,
): Record<string, unknown> {
  const currentById = new Map(current.fields.map((f) => [f.id, f] as const));
  const overrides = entryOverrides ?? {};
  const out: Record<string, unknown> = {};

  for (const field of draft.fields) {
    if (Object.prototype.hasOwnProperty.call(overrides, field.id)) {
      const override = overrides[field.id];
      if (!isEmpty(override)) out[field.id] = override;
      continue;
    }
    const value = entry.values[field.id];
    if (isEmpty(value)) continue;
    const currentField = currentById.get(field.id);
    if (!currentField) continue; // newly added field, no prior value

    if (currentField.type !== field.type) {
      const result = convert(value, currentField.type, field.type);
      if (result.status === "clean" && !isEmpty(result.value))
        out[field.id] = result.value;
      continue;
    }
    if (
      field.type === "reference" &&
      currentField.referenceSchemaId !== field.referenceSchemaId
    ) {
      if (
        field.referenceSchemaId &&
        typeof value === "string" &&
        refExistsInTarget(field.referenceSchemaId, value)
      ) {
        out[field.id] = value;
      }
      continue;
    }
    out[field.id] = value; // unchanged type (rename / required toggle don't touch data)
  }
  return out;
}

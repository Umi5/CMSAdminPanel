import { describe, it, expect } from "vitest";
import type { Schema, Entry, FieldChange } from "@cms/shared";
import {
  planMigration,
  computeMigratedValues,
  type RefExistsInTarget,
} from "./planner";

// A wine-like schema mirroring the seed's hard case: a text "Year" holding messy values.
const current: Schema = {
  id: "sch_wine",
  name: "Wine",
  apiId: "wine",
  version: 3,
  createdAt: "t",
  updatedAt: "t",
  fields: [
    { id: "name", name: "Name", type: "text", required: true },
    { id: "year", name: "Year", type: "text", required: false },
    {
      id: "producer",
      name: "Producer",
      type: "reference",
      required: false,
      referenceSchemaId: "sch_producer",
    },
  ],
};

const entries: Entry[] = [
  {
    id: "e1",
    schemaId: "sch_wine",
    values: { name: "A", year: "2015", producer: "p1" },
    createdAt: "t",
    updatedAt: "t",
  },
  {
    id: "e2",
    schemaId: "sch_wine",
    values: { name: "B", year: "vintage", producer: "p2" },
    createdAt: "t",
    updatedAt: "t",
  },
  {
    id: "e3",
    schemaId: "sch_wine",
    values: { name: "C", year: "n/a" },
    createdAt: "t",
    updatedAt: "t",
  },
  {
    id: "e4",
    schemaId: "sch_wine",
    values: { name: "D" },
    createdAt: "t",
    updatedAt: "t",
  },
];

// Nothing exists in any "new target" unless a test says so.
const noRefs: RefExistsInTarget = () => false;

function draftWith(fields: Schema["fields"]): Schema {
  return { ...current, fields };
}
function change(
  plan: { changes: FieldChange[] },
  fieldId: string,
  kind: string,
): FieldChange | undefined {
  return plan.changes.find(
    (c) => c.fieldId === fieldId && c.changeKind === kind,
  );
}

describe("planMigration: non-negative constraint", () => {
  // A number field with a mix of negative and non-negative stored values.
  const stock: Schema = {
    ...current,
    fields: [
      { id: "name", name: "Name", type: "text", required: true },
      { id: "stock", name: "Stock", type: "number", required: false },
    ],
  };
  const stockEntries: Entry[] = [
    { ...entries[0]!, id: "s1", values: { name: "A", stock: 5 } },
    { ...entries[0]!, id: "s2", values: { name: "B", stock: -3 } },
    { ...entries[0]!, id: "s3", values: { name: "C" } },
  ];
  const withConstraint = (nonNegative: boolean): Schema => ({
    ...stock,
    fields: stock.fields.map((f) =>
      f.id === "stock" ? { ...f, nonNegative } : f,
    ),
  });

  it("flags the negative values when the constraint is enabled", () => {
    const plan = planMigration(
      stock,
      withConstraint(true),
      stockEntries,
      noRefs,
    );
    const c = change(plan, "stock", "constraint_enabled");
    expect(c?.severity).toBe("warning");
    expect(c?.needsAttention).toHaveLength(1);
    expect(c?.needsAttention[0]?.entryId).toBe("s2");
    expect(c?.needsAttention[0]?.currentValue).toBe(-3);
  });

  it("is safe when no stored value is negative", () => {
    const plan = planMigration(
      stock,
      withConstraint(true),
      [stockEntries[0]!, stockEntries[2]!],
      noRefs,
    );
    expect(change(plan, "stock", "constraint_enabled")?.severity).toBe("safe");
  });

  it("is safe when the constraint is removed", () => {
    const plan = planMigration(
      withConstraint(true),
      withConstraint(false),
      stockEntries,
      noRefs,
    );
    expect(change(plan, "stock", "constraint_disabled")?.severity).toBe("safe");
  });

  it("reports no change when the constraint is untouched", () => {
    const plan = planMigration(
      withConstraint(true),
      withConstraint(true),
      stockEntries,
      noRefs,
    );
    expect(plan.changes).toHaveLength(0);
  });
});

describe("planMigration", () => {
  it("treats a rename as safe with nothing to migrate", () => {
    const draft = draftWith(
      current.fields.map((f) =>
        f.id === "year" ? { ...f, name: "Vintage Year" } : f,
      ),
    );
    const plan = planMigration(current, draft, entries, noRefs);
    const renamed = change(plan, "year", "field_renamed");
    expect(renamed?.severity).toBe("safe");
    expect(renamed?.needsAttention).toHaveLength(0);
    expect(plan.totalNeedsAttention).toBe(0);
    expect(plan.basedOnVersion).toBe(3);
  });

  it("flags only the unconvertible values on the hard text->number retype", () => {
    const draft = draftWith(
      current.fields.map((f) =>
        f.id === "year" ? { ...f, type: "number" } : f,
      ),
    );
    const plan = planMigration(current, draft, entries, noRefs);
    const retype = change(plan, "year", "field_retyped");
    expect(retype?.severity).toBe("risky");
    expect(retype?.cleanCount).toBe(1); // "2015"
    expect(retype?.needsAttention.map((i) => i.entryId).sort()).toEqual([
      "e2",
      "e3",
    ]); // vintage, n/a
    // e4 has no year value, so it isn't affected at all.
    expect(retype?.affectedCount).toBe(3);
    expect(plan.totalNeedsAttention).toBe(2);
  });

  it("adding an optional field is safe; a required one needs a value in every entry", () => {
    const optional = planMigration(
      current,
      draftWith([
        ...current.fields,
        { id: "notes", name: "Notes", type: "text", required: false },
      ]),
      entries,
      noRefs,
    );
    expect(change(optional, "notes", "field_added")?.severity).toBe("safe");
    expect(optional.totalNeedsAttention).toBe(0);

    const required = planMigration(
      current,
      draftWith([
        ...current.fields,
        { id: "region", name: "Region", type: "text", required: true },
      ]),
      entries,
      noRefs,
    );
    const added = change(required, "region", "field_added");
    expect(added?.severity).toBe("warning");
    expect(added?.needsAttention).toHaveLength(entries.length);
  });

  it("removing a field with data is destructive but needs no fix", () => {
    const draft = draftWith(current.fields.filter((f) => f.id !== "year"));
    const plan = planMigration(current, draft, entries, noRefs);
    const removed = change(plan, "year", "field_removed");
    expect(removed?.severity).toBe("destructive");
    expect(removed?.affectedCount).toBe(3); // e1,e2,e3 have year values
    expect(removed?.needsAttention).toHaveLength(0);
  });

  it("making a field required flags the entries that are empty", () => {
    const draft = draftWith(
      current.fields.map((f) =>
        f.id === "year" ? { ...f, required: true } : f,
      ),
    );
    const plan = planMigration(current, draft, entries, noRefs);
    const req = change(plan, "year", "required_enabled");
    expect(req?.severity).toBe("warning");
    expect(req?.needsAttention.map((i) => i.entryId)).toEqual(["e4"]); // only e4 lacks a year
  });

  it("retargeting a reference flags values not present in the new target", () => {
    const draft = draftWith(
      current.fields.map((f) =>
        f.id === "producer" ? { ...f, referenceSchemaId: "sch_region" } : f,
      ),
    );
    // p1 exists in the new target, p2 does not.
    const refExists: RefExistsInTarget = (schemaId, entryId) =>
      schemaId === "sch_region" && entryId === "p1";
    const plan = planMigration(current, draft, entries, refExists);
    const retarget = change(plan, "producer", "reference_retargeted");
    expect(retarget?.severity).toBe("destructive");
    expect(retarget?.cleanCount).toBe(1);
    expect(retarget?.needsAttention.map((i) => i.entryId)).toEqual(["e2"]);
  });
});

describe("computeMigratedValues", () => {
  const toNumberDraft = draftWith(
    current.fields.map((f) => (f.id === "year" ? { ...f, type: "number" } : f)),
  );

  it("converts clean values and applies overrides for the rest", () => {
    const e2 = entries[1]!; // year: "vintage"
    const values = computeMigratedValues(
      current,
      toNumberDraft,
      e2,
      { year: 1990 },
      noRefs,
    );
    expect(values.year).toBe(1990); // override wins
    expect(values.name).toBe("B"); // untouched field kept
  });

  it("keeps a cleanly-converted value with no override", () => {
    const e1 = entries[0]!; // year: "2015"
    const values = computeMigratedValues(
      current,
      toNumberDraft,
      e1,
      undefined,
      noRefs,
    );
    expect(values.year).toBe(2015);
  });

  it("drops the value of a removed field", () => {
    const removedDraft = draftWith(
      current.fields.filter((f) => f.id !== "year"),
    );
    const values = computeMigratedValues(
      current,
      removedDraft,
      entries[0]!,
      undefined,
      noRefs,
    );
    expect(values.year).toBeUndefined();
    expect(values.name).toBe("A");
  });
});

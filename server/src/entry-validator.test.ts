import { describe, it, expect } from "vitest";
import type { Schema } from "@cms/shared";
import { validateEntryValues } from "./entry-validator";

const schema: Schema = {
  id: "s",
  name: "S",
  apiId: "s",
  version: 1,
  createdAt: "",
  updatedAt: "",
  fields: [
    { id: "name", name: "Name", type: "text", required: true },
    { id: "age", name: "Age", type: "number", required: false },
    { id: "active", name: "Active", type: "boolean", required: false },
    { id: "dob", name: "DOB", type: "date", required: false },
    {
      id: "ref",
      name: "Ref",
      type: "reference",
      required: false,
      referenceSchemaId: "other",
    },
  ],
};

describe("validateEntryValues", () => {
  it("accepts a well-formed entry", () => {
    expect(
      validateEntryValues(schema, {
        name: "A",
        age: 3,
        active: true,
        dob: "2020-01-01",
      }),
    ).toEqual([]);
  });

  it("flags a missing required field", () => {
    const errors = validateEntryValues(schema, {});
    expect(errors).toHaveLength(1);
    expect(errors[0]?.fieldId).toBe("name");
  });

  it("allows empty optional fields but flags wrong types", () => {
    const errors = validateEntryValues(schema, {
      name: "A",
      age: "not a number",
    });
    expect(errors.map((e) => e.fieldId)).toEqual(["age"]);
  });

  it("treats 0 and false as present, not empty", () => {
    expect(
      validateEntryValues(schema, { name: "A", age: 0, active: false }),
    ).toEqual([]);
  });

  it("rejects invalid date strings", () => {
    const errors = validateEntryValues(schema, {
      name: "A",
      dob: "not-a-date",
    });
    expect(errors.map((e) => e.fieldId)).toEqual(["dob"]);
  });

  it("checks reference existence only when a resolver is supplied", () => {
    const refExists = (sid: string, eid: string): boolean =>
      sid === "other" && eid === "exists";
    expect(
      validateEntryValues(schema, { name: "A", ref: "exists" }, refExists),
    ).toEqual([]);
    const errors = validateEntryValues(
      schema,
      { name: "A", ref: "ghost" },
      refExists,
    );
    expect(errors.map((e) => e.fieldId)).toEqual(["ref"]);
    // Without a resolver, any string id passes shape validation.
    expect(validateEntryValues(schema, { name: "A", ref: "ghost" })).toEqual(
      [],
    );
  });

  describe("nonNegative number fields", () => {
    const nonNegSchema: Schema = {
      ...schema,
      fields: [
        { id: "name", name: "Name", type: "text", required: true },
        {
          id: "stock",
          name: "Stock",
          type: "number",
          required: false,
          nonNegative: true,
        },
      ],
    };

    it("rejects a negative value", () => {
      const errors = validateEntryValues(nonNegSchema, {
        name: "A",
        stock: -1,
      });
      expect(errors).toEqual([
        {
          fieldId: "stock",
          fieldName: "Stock",
          message: "must be 0 or greater",
        },
      ]);
    });

    it("accepts 0 and positives", () => {
      expect(
        validateEntryValues(nonNegSchema, { name: "A", stock: 0 }),
      ).toEqual([]);
      expect(
        validateEntryValues(nonNegSchema, { name: "A", stock: 12 }),
      ).toEqual([]);
    });

    it("still allows negatives when the flag is off", () => {
      expect(validateEntryValues(schema, { name: "A", age: -5 })).toEqual([]);
    });
  });
});

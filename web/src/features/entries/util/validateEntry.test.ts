import { describe, expect, it } from "vitest";
import type { Field, Schema } from "@cms/shared";
import { validateEntry } from "./validateEntry";

function schemaWith(...fields: Field[]): Schema {
  return {
    id: "sch_1",
    name: "Wine",
    apiId: "wine",
    fields,
    version: 1,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };
}

const numberField = (extra: Partial<Field> = {}): Field => ({
  id: "f_num",
  name: "Stock",
  type: "number",
  required: false,
  ...extra,
});

describe("validateEntry", () => {
  it("flags a missing required field", () => {
    const schema = schemaWith({
      id: "f_name",
      name: "Name",
      type: "text",
      required: true,
    });
    expect(validateEntry(schema, {})).toEqual({
      f_name: "This field is required",
    });
  });

  it("allows an empty optional field", () => {
    expect(validateEntry(schemaWith(numberField()), {})).toEqual({});
  });

  it("rejects a non-number in a number field", () => {
    const errors = validateEntry(schemaWith(numberField()), {
      f_num: "abc",
    });
    expect(errors.f_num).toBe("Must be a number");
  });

  it("allows negatives when nonNegative is off", () => {
    expect(validateEntry(schemaWith(numberField()), { f_num: -5 })).toEqual({});
  });

  it("rejects negatives when nonNegative is on", () => {
    const schema = schemaWith(numberField({ nonNegative: true }));
    expect(validateEntry(schema, { f_num: -1 }).f_num).toBe(
      "Must be 0 or greater",
    );
  });

  it("accepts 0 when nonNegative is on", () => {
    const schema = schemaWith(numberField({ nonNegative: true }));
    expect(validateEntry(schema, { f_num: 0 })).toEqual({});
  });
});

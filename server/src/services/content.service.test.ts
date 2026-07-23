import { describe, it, expect } from "vitest";
import type { Schema, Entry } from "@cms/shared";
import { toPublicEntry, queryEntries, toFieldKey } from "./content.service";

const schema: Schema = {
  id: "s",
  name: "S",
  apiId: "s",
  version: 1,
  createdAt: "t",
  updatedAt: "t",
  fields: [
    { id: "f1", name: "Title", type: "text", required: true },
    {
      id: "f2",
      name: "Producer",
      type: "reference",
      required: false,
      referenceSchemaId: "p",
    },
  ],
};

const entry: Entry = {
  id: "e1",
  schemaId: "s",
  values: { f1: "Hello", f2: "p1" },
  createdAt: "t",
  updatedAt: "t",
};

describe("toPublicEntry", () => {
  it("keys output by current field name and nests it under data", () => {
    expect(toPublicEntry(schema, entry)).toEqual({
      id: "e1",
      createdAt: "t",
      updatedAt: "t",
      data: { title: "Hello", producer: "p1" },
    });
  });

  it("emits null for fields the entry has no value for", () => {
    const partial: Entry = { ...entry, values: { f1: "Hi" } };
    expect(toPublicEntry(schema, partial).data).toEqual({
      title: "Hi",
      producer: null,
    });
  });

  it("reflects the current name after a rename (values are keyed by id)", () => {
    const renamed: Schema = {
      ...schema,
      fields: [{ id: "f1", name: "Headline", type: "text", required: true }],
    };
    expect(toPublicEntry(renamed, entry).data).toEqual({ headline: "Hello" });
  });
});

describe("toFieldKey", () => {
  it("slugs display names into snake_case", () => {
    expect(toFieldKey("Release Date")).toBe("release_date");
    expect(toFieldKey("In Stock")).toBe("in_stock");
    expect(toFieldKey("Year")).toBe("year");
    expect(toFieldKey("  Price (EUR)  ")).toBe("price_eur");
  });

  it("falls back when a name has nothing sluggable", () => {
    expect(toFieldKey("***")).toBe("field");
  });
});

describe("publicFieldKeys", () => {
  it("dedupes names that collapse onto the same key", () => {
    const clashing: Schema = {
      ...schema,
      fields: [
        { id: "a", name: "In Stock", type: "boolean", required: false },
        { id: "b", name: "In-Stock", type: "boolean", required: false },
      ],
    };
    const entryWith: Entry = { ...entry, values: { a: true, b: false } };
    expect(Object.keys(toPublicEntry(clashing, entryWith).data)).toEqual([
      "in_stock",
      "in_stock_2",
    ]);
  });
});

describe("queryEntries", () => {
  const wines: Schema = {
    id: "w",
    name: "Wine",
    apiId: "wine",
    version: 1,
    createdAt: "t",
    updatedAt: "t",
    fields: [
      { id: "n", name: "Name", type: "text", required: true },
      { id: "r", name: "Rating", type: "number", required: false },
      { id: "s", name: "In Stock", type: "boolean", required: false },
      { id: "d", name: "Release Date", type: "date", required: false },
    ],
  };

  const make = (id: string, values: Record<string, unknown>): Entry => ({
    id,
    schemaId: "w",
    values,
    createdAt: "t",
    updatedAt: "t",
  });

  const entries: Entry[] = [
    make("1", { n: "Margaux 2015", r: 98, s: true, d: "2018-03-01" }),
    make("2", { n: "Grange", r: 96, s: false, d: "2019-06-15" }),
    make("3", { n: "Opus One", r: 93, s: true, d: "2020-01-20" }),
    make("4", { n: "Mystery Red", r: 88, s: false }),
  ];

  const run = (query: Parameters<typeof queryEntries>[2]) =>
    queryEntries(wines, entries, query);

  it("returns everything when no pageSize is given", () => {
    const page = run({ page: 1, filter: {} });
    expect(page.total).toBe(4);
    expect(page.items).toHaveLength(4);
    expect(page.pageSize).toBe(4);
  });

  it("paginates with a consumer-chosen page size", () => {
    const first = run({ page: 1, pageSize: 2, filter: {} });
    expect(first.items.map((i) => i.id)).toEqual(["1", "2"]);
    expect(first.total).toBe(4);

    const second = run({ page: 2, pageSize: 2, filter: {} });
    expect(second.items.map((i) => i.id)).toEqual(["3", "4"]);
    expect(second.total).toBe(4);
  });

  it("filters text fields by case-insensitive contains", () => {
    const page = run({ page: 1, filter: { name: "margaux" } });
    expect(page.items.map((i) => i.id)).toEqual(["1"]);
  });

  it("filters numbers by exact value and by range", () => {
    expect(run({ page: 1, filter: { rating: "96" } }).total).toBe(1);

    const ranged = run({ page: 1, filter: { rating: { min: "94" } } });
    expect(ranged.items.map((i) => i.id)).toEqual(["1", "2"]);
  });

  it("filters booleans", () => {
    expect(
      run({ page: 1, filter: { in_stock: "true" } }).items.map((i) => i.id),
    ).toEqual(["1", "3"]);
  });

  it("filters dates by range, excluding entries with no date", () => {
    const page = run({
      page: 1,
      filter: { release_date: { min: "2019-01-01" } },
    });
    expect(page.items.map((i) => i.id)).toEqual(["2", "3"]);
  });

  it("combines filters and reports the pre-pagination total", () => {
    const page = run({
      page: 1,
      pageSize: 1,
      filter: { in_stock: "true", rating: { min: "90" } },
    });
    expect(page.total).toBe(2);
    expect(page.items).toHaveLength(1);
  });

  it("is case-insensitive on the field key", () => {
    expect(run({ page: 1, filter: { NAME: "grange" } }).total).toBe(1);
  });

  it("exposes snake_case keys derived from the display names", () => {
    const page = run({ page: 1, pageSize: 1, filter: {} });
    expect(Object.keys(page.items[0]!.data)).toEqual([
      "name",
      "rating",
      "in_stock",
      "release_date",
    ]);
  });

  it("rejects an unknown field name", () => {
    expect(() => run({ page: 1, filter: { nope: "x" } })).toThrow(
      /Unknown field 'nope'/,
    );
  });
});

import type { Schema, Entry } from "@cms/shared";
import type { Store } from "./store";
import { newUuid } from "./ids";

// A fixed timestamp keeps seeded data reproducible across restarts.
const TS = "2024-01-01T00:00:00.000Z";

// Readable ids for schemas and fields make the seed easy to follow. They're
// internal only: neither ever appears in the public read API.
const PRODUCER = "sch_producer";
const WINE = "sch_wine";

// Entries get real GUIDs, exactly like ones created through the app, because an
// entry id is part of the public URL: /api/content/:type/:guid
const PROD_MARGAUX = newUuid();
const PROD_PENFOLDS = newUuid();
const PROD_OPUS = newUuid();

const producerSchema: Schema = {
  id: PRODUCER,
  name: "Producer",
  apiId: "producer",
  version: 1,
  createdAt: TS,
  updatedAt: TS,
  fields: [
    { id: "fld_prod_name", name: "Name", type: "text", required: true },
    { id: "fld_prod_country", name: "Country", type: "text", required: false },
    {
      id: "fld_prod_founded",
      name: "Founded",
      type: "number",
      required: false,
    },
  ],
};

const wineSchema: Schema = {
  id: WINE,
  name: "Wine",
  apiId: "wine",
  version: 1,
  createdAt: TS,
  updatedAt: TS,
  fields: [
    { id: "fld_wine_name", name: "Name", type: "text", required: true },
    // Intentionally TEXT, holding messy values — this is the hard-migration case:
    // retyping it to number must cope with "vintage", "n/a", and empty.
    { id: "fld_wine_year", name: "Year", type: "text", required: false },
    { id: "fld_wine_rating", name: "Rating", type: "number", required: false },
    {
      id: "fld_wine_stock",
      name: "In Stock",
      type: "boolean",
      required: false,
    },
    {
      id: "fld_wine_release",
      name: "Release Date",
      type: "date",
      required: false,
    },
    {
      id: "fld_wine_producer",
      name: "Producer",
      type: "reference",
      required: false,
      referenceSchemaId: PRODUCER,
    },
  ],
};

const producerEntries: Entry[] = [
  {
    id: PROD_MARGAUX,
    schemaId: PRODUCER,
    values: {
      fld_prod_name: "Château Margaux",
      fld_prod_country: "France",
      fld_prod_founded: 1815,
    },
    createdAt: TS,
    updatedAt: TS,
  },
  {
    id: PROD_PENFOLDS,
    schemaId: PRODUCER,
    values: {
      fld_prod_name: "Penfolds",
      fld_prod_country: "Australia",
      fld_prod_founded: 1844,
    },
    createdAt: TS,
    updatedAt: TS,
  },
  {
    id: PROD_OPUS,
    schemaId: PRODUCER,
    values: {
      fld_prod_name: "Opus One",
      fld_prod_country: "United States",
      fld_prod_founded: 1979,
    },
    createdAt: TS,
    updatedAt: TS,
  },
];

const wineEntries: Entry[] = [
  {
    id: newUuid(),
    schemaId: WINE,
    values: {
      fld_wine_name: "Château Margaux 2015",
      fld_wine_year: "2015",
      fld_wine_rating: 98,
      fld_wine_stock: true,
      fld_wine_release: "2018-03-01",
      fld_wine_producer: PROD_MARGAUX,
    },
    createdAt: TS,
    updatedAt: TS,
  },
  {
    id: newUuid(),
    schemaId: WINE,
    values: {
      fld_wine_name: "Penfolds Grange",
      fld_wine_year: "vintage", // <- can't become a number without a fix
      fld_wine_rating: 96,
      fld_wine_stock: false,
      fld_wine_release: "2019-06-15",
      fld_wine_producer: PROD_PENFOLDS,
    },
    createdAt: TS,
    updatedAt: TS,
  },
  {
    id: newUuid(),
    schemaId: WINE,
    values: {
      fld_wine_name: "Opus One NV",
      fld_wine_year: "n/a", // <- can't become a number without a fix
      fld_wine_rating: 93,
      fld_wine_stock: true,
      fld_wine_release: "2020-01-20",
      fld_wine_producer: PROD_OPUS,
    },
    createdAt: TS,
    updatedAt: TS,
  },
  {
    id: newUuid(),
    schemaId: WINE,
    values: {
      fld_wine_name: "Mystery Red",
      fld_wine_year: "", // empty — no fix needed, just drops out
      fld_wine_rating: 88,
      fld_wine_stock: false,
      fld_wine_producer: PROD_MARGAUX,
    },
    createdAt: TS,
    updatedAt: TS,
  },
  {
    id: newUuid(),
    schemaId: WINE,
    values: {
      fld_wine_name: "Château Margaux 2016",
      fld_wine_year: "2016",
      fld_wine_rating: 97,
      fld_wine_stock: true,
      fld_wine_release: "2019-04-01",
      fld_wine_producer: PROD_MARGAUX,
    },
    createdAt: TS,
    updatedAt: TS,
  },
];

/** Populate a brand-new store with example content so the app is useful on first launch. */
export function seedIfEmpty(store: Store): void {
  if (!store.isEmpty()) return;
  store.transaction(() => {
    store.insertSchema(producerSchema);
    store.insertSchema(wineSchema);
    for (const entry of producerEntries) store.insertEntry(entry);
    for (const entry of wineEntries) store.insertEntry(entry);
  });
}

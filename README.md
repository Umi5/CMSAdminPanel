# Headless CMS — Admin Panel

A small headless-CMS admin panel: people define their own **content types** (schemas of
typed fields) and manage **entries** through forms that are generated from the schema — not
hand-written per type. The focus is a polished front end backed by a deliberately thin API.

The hard problem it takes seriously is **schema evolution**: when a field is renamed, retyped,
deleted, made required, or a reference is retargeted, existing entries may no longer fit. The
app communicates the risk, shows which entries are affected, previews the change, and lets you
fix the data that can't be converted automatically — all before anything is written.

The reproducible showcase (seeded on first launch): a wine's `Year` is **text** holding
`"vintage"`, `"n/a"`, `""`, `"2015"`, `"2016"`. Retype it to **number** and the app walks you
through it.

---

## Quick start

```bash
npm install
npm run dev
```

- **App:** http://localhost:5174
- **API:** http://localhost:4100

> Ports are configurable. The API reads `PORT` (default `4100`); the web dev server prefers
> `5174` and falls through if it's taken. `npm run dev` boots both together via `concurrently`.

Other scripts (root):

| Script | What it does |
| --- | --- |
| `npm run dev` | Backend (`tsx watch`) + frontend (`vite`) together |
| `npm run typecheck` | Strict `tsc --noEmit` across all three workspaces |
| `npm run test` | Vitest unit tests (backend logic) |
| `npm run build` | Production build of the web app |

Data persists to `server/data/store.json` (git-ignored). Delete it to re-seed from scratch.

---

## Project structure

npm workspaces monorepo — one backend, one frontend, and a shared contract package:

```
shared/    @cms/shared — types both apps import (Schema, Field, Entry,
           MigrationPlan/FieldChange/ValueIssue, ServerEvent, apply payload…)
server/    Express + TypeScript API (routes → controllers → services → store)
web/       React + Vite + MUI + Tailwind admin UI (organized by feature)
```

```
server/src/
  index.ts              app bootstrap: load store, seed, mount routes, error handling
  store.ts              in-memory maps mirrored to JSON (atomic writes, transactions)
  entry-validator.ts    pure schema-driven validation (reused by the planner)
  events.ts             SSE event bus
  seed.ts               example Producer + Wine content (incl. the text-"year" trap)
  routes/ controllers/ validation/   thin HTTP layer (Zod validates request shape)
  services/
    schema · entry · content         CRUD + read-API translation
    migration/
      converters.ts     the conversion table (every from→to pair) — TEST-FIRST
      planner.ts        diff draft vs data → impact report + migrated values — TEST-FIRST
      migration.service.ts   dry-run + atomic apply with the concurrency guard

web/src/
  theme/                MUI theme = design tokens (single source of truth)
  shared/               api client, SSE + schema providers, hooks, layout, primitives
  features/
    schemas/            list, builder (local draft), field editor, migration preview dialog
    entries/            entries table, dynamic form, per-type inputs, reference picker
```

---

## Architecture & key decisions

**Entry values are keyed by field _id_, never field _name_.** This is the cornerstone.
Renaming a field is pure metadata — no data touched, no migration, no risk. The read API
translates ids back to current names on the way out.

**Schema editing is a local draft; nothing hits the server until you apply.** On save the
client POSTs the draft to a **dry-run** endpoint that diffs it against stored data, walks every
entry, and returns an impact report: per change a `severity` (`safe` / `warning` / `risky` /
`destructive`), affected/clean counts, and the exact values that can't convert and why. You fix
those in the preview dialog, then schema + entry migration is applied in **one atomic step**.
All conversion logic lives on the server.

**Apply is optimistic and safe under concurrency.** The draft carries the schema `version` it
was based on. On apply the server **re-runs the plan itself** and rejects with `409` + a fresh
report if the schema moved underneath, or if a concurrent edit introduced a value that no longer
converts. The dialog swaps in the fresh report and keeps the fixes you already typed.

**Real-time is Server-Sent Events.** Mutations go over normal REST; the server broadcasts what
changed on a single `/api/events` stream. Clients keep the schema list and open lists/editors in
sync. If a migration lands on a content type you have an entry open for, the editor stays frozen
on the schema it opened with and shows a **reload banner** rather than rearranging under you.

**Storage is in-memory, mirrored to a JSON file.** Writes are atomic (temp file + `rename`) and
mutations are synchronous, which is what makes "apply schema + entries together" atomic for free.

**Validation.** Zod validates request _shape_ only; entry validation is schema-driven so it's a
plain, pure function — reused by the migration planner to decide whether a migrated entry is
still valid.

**Frontend state.** A single Context for the (genuinely global) schema list, a tiny `useFetch`
for per-feature data, and one `useSchemaEvents` seam for real-time invalidation. No Redux, no
data-fetching library.

**UI stack.** MUI owns all components and design tokens (color, type, elevation); Tailwind's
preflight is disabled and it's used only as a layout-utility layer — one source of truth for the
look. Minimal-modern direction: indigo accent, slate neutrals, airy spacing.

---

## Read API

A read-only API proving the admin manages real content another app could consume. Output is
keyed by **current field name**, nested under `data`:

```
GET /api/content/:type            list entries of a content type (by apiId slug)
GET /api/content/:type/:id        one entry
```

```bash
curl -s localhost:4100/api/content/wine | jq '.[0].data'
# { "Name": "Château Margaux 2015", "Year": "2015", "Rating": 98, "In Stock": true, ... }
```

Full API surface: `GET/POST/DELETE /api/schemas[/:id]`,
`POST /api/schemas/:id/migration-plan` (dry run), `POST /api/schemas/:id/migrate` (apply),
`GET/POST/PUT/DELETE /api/schemas/:id/entries[/:entryId]`, `GET /api/content/:type[/:id]`,
`GET /api/stats/entry-counts`, and `GET /api/events` (SSE).

---

## Testing

The pure logic — the conversion table and the migration planner especially — is written
test-first with Vitest (`npm run test`): the full conversion matrix (including the
`"vintage"`/`"n/a"` → number case), planner scenarios for every change kind, override
application, the store round-trip/rollback, entry validation, and read-API translation.

The interactive flows (create a type, the dynamic entry editor + reference picker, and the whole
migration preview → fix → apply, plus the 409-refresh and open-entry banner) were exercised
end-to-end in a headless browser during development.

---

## Assumptions & limitations

- Renaming a field is free internally, but because the read API keys by current name, a rename
  **is** a breaking change for API consumers. This is intentional and explicit.
- No authentication — the read API and admin are an unauthenticated demo surface.
- Single-node, in-memory + JSON store. Not built for horizontal scaling or large datasets.
- Deleting a content type cascades its entries but leaves references to it from other types
  dangling (surfaced as invalid on next edit rather than cleaned up).

## Possible future improvements

- Field-level constraints (min/max, regex, enums) and default values.
- Reference `?populate` in the read API, and pagination/filtering.
- Undo for destructive migrations; a migration history/audit log.
- Auth + per-role permissions; multi-tenant workspaces.
- Route-level code splitting to trim the initial JS bundle.
- Optional dark mode (the theme is centralized, so it's a contained addition).
```

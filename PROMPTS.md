# Project prompts

A record of the prompts used to build and refine this project, grouped by chat.

---

## Chat 1 — Build Headless CMS admin panel with schema evolution

My prompts from this chat, in order, rewritten a little cleaner (typos and
phrasing fixed, intent kept). My prompts only — no answers or code.

1. **Build a headless-CMS admin panel with schema evolution — and let's pair on it.**
   Let's build a new project together in stages, not fire-and-forget: I'll review,
   test, and steer as we go, and you should push back on my choices if you disagree.
   Before writing any code, brainstorm the approach with me — talk through the
   trade-offs and options — then write up a plan for my approval. Only start
   implementing once I've signed off.

   *What I'm building:* the admin panel for a small headless CMS (the kind of tool
   that sits behind something like Contentful or Strapi). People define their own
   content types ("schemas") — a named set of typed fields — and manage entries
   through them. The front end is the main focus; keep the backend thin. Core
   features:
   - *Schema builder* — create and edit content types, with field types text,
     number, boolean, date, and reference (a field pointing to an entry of another
     schema).
   - *Dynamic entry editor* — create/view/edit/delete entries for any schema, with
     the form generated from the schema definition (not hand-written per type) and
     updating when the schema changes; browse a schema's entries and jump to
     referenced ones.
   - *Real-time updates* — other open clients see changes without a refresh, and a
     schema change that hits an entry someone has open is handled gracefully.
   - *Schema evolution (the part I care about most)* — when a field is renamed,
     deleted, retyped, made required, or a reference is retargeted, existing entries
     may not fit: communicate the risk, show which entries are affected, preview the
     change before applying, and let people fix data that no longer fits. The nasty
     case is a text "year" field holding values like "vintage" and "n/a" being
     switched to number.
   - *Read API* — a simple read-only API over the content (e.g. `GET
     /api/content/[type]` and `/[type]/:id`), proving another app could consume it.

   *Stack:* React + TypeScript + Vite + Tailwind (layout) + MUI (components); Node +
   Express + TypeScript. Only add a library if it genuinely earns its place — no
   Redux; prefer clean, obvious code over clever abstractions.

   *Decisions I've already made (challenge them if you disagree):*
   - Monorepo with npm workspaces; `npm run dev` boots backend and frontend together.
   - Store entry values keyed by field **id**, never by name, so renaming a field is
     pure metadata; the read API translates ids back to names on the way out.
   - Schema editing is a local draft — nothing hits the server until I apply. On
     save, POST the draft to a "migration plan" endpoint that dry-runs a diff against
     stored data, walks every entry, and returns an impact report (per change:
     severity, affected-entry count, which values convert cleanly and which can't and
     why). Show it in a preview dialog, let me fix the values that can't convert, then
     apply schema + entry migration in one atomic operation. Keep all conversion logic
     on the server.
   - Real-time via Server-Sent Events (mutations over REST, the server broadcasts what
     changed; no WebSocket library).
   - Storage in-memory, mirrored to a JSON file; seed example schemas including the
     text-"year"-with-"vintage" case so the hard migration is reproducible on first
     launch.
   - Frontend state: a small Context for the schema list and a tiny `useFetch` hook
     for entries — no data-fetching library.
   - Structure: backend as routes/controllers/services (thin controllers); frontend
     organized by feature (api/components/hooks) plus a shared folder.
   - Zod for request-shape validation; schema-driven entry validation as a plain
     function.

   *UI/design:* I care how this looks — properly design and polish the interface
   (clean, minimal, modern, consistent, responsive, accessible) and iterate with me
   rather than dropping default components on a page.

   *Implementation & quality:* implement it feature by feature; write the pure logic
   (the conversion table and migration planner especially) test-first; fix root
   causes, not symptoms; everything in English; strict TypeScript, no `any`,
   functional components, small focused files, and comments only for the non-obvious
   decisions and traps; actually run and test what you build and tell me honestly if
   something fails. Write a clear README at the end (setup, structure, architecture
   decisions, assumptions, future improvements). I'll handle the walkthrough myself.

2. I've killed whatever was running on port 4000 — you can continue.

3. Continue with M2 (the migration engine — the conversion table and planner, written
   test-first).

4. Continue to M4 (the schema builder UI). I'm only partially happy with the design so
   far, but I'll judge it once everything's done.

5. Continue with M5 (the dynamic entry editor).

6. M5 stopped, but everything seems fine when I run it — continue with M6 (the
   migration UX polish).

7. Start M7 (design polish and accessibility), and also do M8 (the README and final
   verification sweep).

8. In this PROMPTS.md file, replace the placeholder in the "Chat 1" section with a
   cleaned-up, numbered list of just my prompts from this conversation, in the order I
   asked them — fix typos and phrasing but keep the intent, and don't include your
   answers or any code. Leave the rest of the file (the heading and the Chat 2
   section) exactly as it is.

---

## Chat 2 — Public npm install and UI tests

Only these two prompts were made in this chat, rewritten a little cleaner than
they were originally asked.

### 1. Make the project installable by anyone (remove the private registry)

A teammate cannot run `npm install`: it fails with an "you must be on eposnow"
style error. The cause is that the project resolves dependencies through a
private company registry (an AWS CodeArtifact proxy) that needs an internal
token. Make the repo installable by anyone with plain public npm:

- Add a project-level `.npmrc` that pins the registry to
  `https://registry.npmjs.org/`, so it does not depend on each machine's global
  npm config.
- Rewrite `package-lock.json` so every `resolved` URL points at public npm
  instead of the private CodeArtifact host (the integrity hashes stay valid,
  since the private registry only mirrors the same tarballs).
- Verify a clean install resolves with no auth error.

### 2. Add UI tests for the web app

Set up a test runner for the front end (Vitest + Testing Library + jsdom) and
add component tests for the key pieces:

- `NumberField`: shows its value, reports typed input, steps up/down by one,
  treats empty as 0, and refuses to step below its minimum.
- `FieldInput`: renders the right input per field type, parses number input,
  clears to `undefined` when emptied, toggles booleans, and respects the
  "0 or positive" constraint.
- `validateEntry`: required fields, type checks, and the non-negative rule.
- The shared state views (loading, empty, error) including the retry action.

Wire a `test` script and make `npm run test` at the repo root run both the
server and the web tests.

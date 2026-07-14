# Performance Review App — Project Context

This project was planned in a prior session. Read this file before doing anything.
Full business requirements and technical design are documented in README.md.

---

## What This App Does

Internal tool for a Team Lead to log monthly performance ratings for 8 senior employees.
At appraisal time, the system averages monthly data into a yearly grade and presents it to the CTO who approves or rejects the appraisal.

---

## Current Status

Backend built and smoke-tested, running **JSON-first** (no database yet).
All 7 README API routes work end-to-end. UI pages not started.
Database is deliberately deferred — see "Data Strategy" below.

---

## Roles

- TEAM_LEAD — enters monthly ratings
- CTO — reviews yearly summaries, approves/rejects appraisals
- EMPLOYEE — future role, will view their own ratings

---

## Tech Stack

- Next.js 16 (App Router) + TypeScript  ← actual installed version (docs said 14)
- React 19
- Tailwind CSS v4 + shadcn/ui
- Prisma ORM v7 (installed, NOT yet wired — JSON layer used instead for now)
- PostgreSQL (Neon, via Vercel) — deferred
- NextAuth.js v5 beta (installed, NOT yet wired)
- Deployed on Vercel (app + database) — deferred

---

## Grading

3 grades: Exceeds Expectations (3), Meets Expectations (2), Below Expectations (1)
4 dimensions, 3 questions each = 12 questions per employee per month
All dimensions equal weight. Missing months excluded from average.

Thresholds:
- 2.5–3.0 → Exceeds Expectations
- 1.5–2.49 → Meets Expectations
- 1.0–1.49 → Below Expectations

---

## Data Strategy (JSON-first, DB later)

The database is deferred. The backend runs on JSON files under `data/` behind a
repository layer, so the DB can be swapped in later without touching API routes,
grading, or pages.

- `data/*.json` — seed data (users, dimensions, questions, monthlyEntries, answers, appraisals)
- `src/lib/data/store.ts` — the ONLY module that touches the filesystem
- `src/lib/data/repository.ts` — **the swap seam**. Domain operations live here.
  When the DB is ready, reimplement this file's internals with Prisma; nothing
  else changes.

---

## Progress Log

### Session 2026-07-14 — Backend built (JSON-first)

**Types & data**
- `src/types/index.ts` — domain types mirroring the Prisma schema, numeric
  scoring (`GRADE_SCORE`), and computed shapes (`YearlySummary`, etc.)
- `data/` — 6 JSON files seeded from `prisma/seed.ts`
  (CTO + Team Lead + 1 employee, 4 dimensions, 12 questions, 1 monthly entry,
  1 appraisal). Passwords are plaintext for now — hash when auth is wired.

**Data-access layer**
- `src/lib/data/store.ts` — generic JSON read/write, per-collection write
  serialization, `generateId()`
- `src/lib/data/repository.ts` — all domain ops + typed errors
  (`NotFoundError` → 404, `ConflictError` → 409, `ValidationError` → 400)

**Grading engine**
- `src/lib/grading.ts` — pure, no I/O. question avg → dimension avg → yearly
  score → threshold grade → recommendation. Missing months excluded; empty
  dimensions skipped. Final score uses RAW (unrounded) dimension averages.
- `src/lib/summary.ts` — wires the repository into the pure grading core

**API routes** (`src/app/api/`) — all verified with curl against dev server:
| Method | Route | Status |
|---|---|---|
| GET/POST | `/api/users` | ✅ |
| POST | `/api/entries` | ✅ |
| GET | `/api/entries/[developerId]` | ✅ |
| POST | `/api/appraisals/generate` | ✅ |
| GET | `/api/appraisals` | ✅ |
| GET/PUT | `/api/appraisals/[id]` | ✅ |
| GET | `/api/questions` (helper for entry form) | ✅ |
- `src/lib/api.ts` — shared `ok`/`fail`/`handle`/`parseJson` helpers

**Verified behavior**: valid writes (201), duplicate month (409), duplicate
email (409), incomplete answers (400), bad role (400), invalid decision (400),
missing appraisal (404), multi-month averaging (Jan 2.58 + all-MEETS Feb → 2.29).

---

## Running the app

```bash
npm run dev      # → http://localhost:3000
```

(Resolved 2026-07-14: a clean `rm -rf node_modules package-lock.json && npm install`
fixed the previously-broken `.bin` shims, which had been plain file copies instead
of symlinks. `npm run dev` and `npx tsc` now work normally.)

---

## Known Issues / Gotchas

- **2 pre-existing type errors** in `prisma/seed.ts` and `src/lib/prisma.ts` —
  only because the Prisma client isn't generated (no DB). Harmless in JSON mode.

---

## Next Steps

1. **UI pages** against the working APIs:
   - `/login` (stub auth first, wire NextAuth later)
   - `/dashboard` (Team Lead — employee list + entry status)
   - `/entry/[employeeId]` (12-question monthly form)
   - `/developer/[id]` (employee history)
   - `/appraisals` + `/appraisals/[id]` (CTO review + approve/reject)
2. Wire NextAuth v5 with the 3 roles (hash passwords in `data/users.json`)
3. Later: provision Postgres, reimplement `repository.ts` with Prisma, migrate + seed

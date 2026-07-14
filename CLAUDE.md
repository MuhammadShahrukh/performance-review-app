# Performance Review App — Project Context

Read this before doing anything. Full business/technical spec is in README.md.

---

## What This App Does

Internal tool where a **Team Lead** logs **monthly** performance ratings for the
developers on their team. At appraisal time the system **averages** the monthly
data into a **yearly grade**, which the **CTO** reviews and approves/rejects.

---

## Current Status (2026-07-14)

**Deploying to Vercel + Neon Postgres.** The app has been fully migrated from the
JSON-first prototype to **Prisma + PostgreSQL**. All code is pushed to `main`;
Vercel builds via a `vercel-build` script that provisions the schema and seed
automatically. **Last step pending: confirm the Vercel deploy is green and
smoke-test the live URL** (couldn't verify from the CLI — no Vercel CLI / not
linked locally).

- **GitHub:** `git@github.com:MuhammadShahrukh/performance-review-app.git` (moved
  here from the old InsuranceMarket-ae org; that remote was removed). Default
  branch `main`. Pushes over SSH.
- **DB:** Neon Postgres, provisioned via the Vercel integration.
- **Local dev:** requires `DATABASE_URL` — run `vercel link && vercel env pull .env`,
  then `npm run dev`. Without it the app can't start (no more JSON fallback).

---

## Roles, User Types & Teams (the data model that matters)

A user has **two independent axes** plus a team:

- **`role`** (job/position): `CTO` · `TEAM_LEAD` · `DEVELOPER`
  - `EMPLOYEE` was renamed to `DEVELOPER`. `role` drives the review workflow.
- **`type`** (access tier): `MEMBER` · `ADMIN`
  - Admin = manage users + questionnaire. Independent of role. The CTO is ADMIN.
- **`team`**: `API` · `CRM` · `HRM` · `UI` · `null` (CTO is org-wide → null)

**Visibility:** Team Lead sees only their own team's developers; CTO sees all.
**Permissions:** rate ← `role=TEAM_LEAD` (own team) · approve ← `role=CTO` ·
manage users/questionnaire ← `type=ADMIN`.

---

## Grading (unchanged throughout)

Grades: Exceeds (3), Meets (2), Below (1). 4 dimensions × 3 questions = 12/month.
Final = average of the 4 dimension averages (equal weight); each dimension =
average of its questions across submitted months. **Missing months excluded.**
Final score uses RAW (unrounded) dimension averages, then maps to a grade:
- 2.5–3.0 → Exceeds · 1.5–2.49 → Meets · 1.0–1.49 → Below

Recommendation: Exceeds → Strongly Recommend · Meets → Recommend · Below → Do Not
Recommend.

---

## Tech Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind v4 + shadcn/ui — **dark theme**, Plus Jakarta Sans + JetBrains Mono
- **Prisma 7 + PostgreSQL (Neon)** — the live data layer
- Auth: **cookie-session stub** with **bcryptjs-hashed** passwords (not NextAuth)
- Deploy: Vercel

---

## Architecture — the swap seam

`src/lib/data/repository.ts` is the ONLY module that talks to the database
(via Prisma). Everything else (API routes, grading, pages) depends only on its
functions. This is how we swapped JSON → Prisma changing just this one file.

- `src/lib/prisma.ts` — PrismaClient singleton using the **`@prisma/adapter-pg`**
  driver adapter (Prisma 7 requires an adapter), pooled `DATABASE_URL`.
- `src/lib/grading.ts` — pure grading engine (no I/O); uses ALL dimensions/
  questions (incl. archived) so historical appraisals keep their meaning.
- `src/lib/summary.ts` — repository-backed wrapper around the grading core.
- `src/lib/access.ts` — team visibility helpers (`visibleEmployees`,
  `canAccessEmployee`).
- `src/lib/auth.ts` — cookie session, `requireUser` / `requireRole` /
  `requireAdmin` guards, `verifyCredentials` (bcrypt.compare).
- `src/lib/labels.ts` — all display-label maps.

### Prisma 7 specifics (important — differs from older Prisma)
- **No `url` in `schema.prisma`** — the connection URL lives in **`prisma.config.ts`**.
- CLI (`db push`/`migrate`/`seed`) uses the **direct/unpooled** URL
  (`DATABASE_URL_UNPOOLED` → fallback `DATABASE_URL`); the runtime client uses the
  pooled `DATABASE_URL`. Pooled PgBouncer endpoints can reject DDL.
- The runtime `PrismaClient` MUST be constructed with `new PrismaPg({ connectionString })`.
- Seed command is configured in `prisma.config.ts` (`migrations.seed`), not
  `package.json`.

---

## Data model (Prisma tables)

`User(id,name,email,password,type,role,team)` ·
`Dimension(id,name,active)` · `Question(id,text,dimensionId,active)` ·
`MonthlyEntry(id,developerId,month,year,createdAt)` unique `[developerId,month,year]` ·
`MonthlyEntryAnswer(id,monthlyEntryId,questionId,grade)` ·
`Appraisal(id,developerId,year,finalGrade,decision,ctoNote,createdAt)` unique `[developerId,year]`.

- `active` on Dimension/Question enables **archiving** (soft delete). Archived
  items drop out of new entry forms but stay in past ratings.
- Note: the FK field is `developerId` (points at a `User` with role DEVELOPER) —
  legacy name, means "the person being rated".

---

## Features built (chronological)

1. **JSON-first backend** — repository/store, grading engine, all 7 README APIs.
2. **Role-based UI** — login, dashboard, entry form (12 questions), developer
   history, CTO appraisals list + detail (approve/reject), `/me`.
3. **Teams** — `team` field, TL-scoped visibility, team badges, cross-team access
   guards.
4. **Schema refactor** — split `role`/`type`; `EMPLOYEE`→`DEVELOPER`; added
   `MEMBER`/`ADMIN`.
5. **Admin user CRUD** — `/admin/users`; create + **cascade-delete** (removes a
   user's entries/answers/appraisals); self-delete blocked; admin-gated APIs (403).
6. **Guide + inline hints** — role-aware `/guide` manual; grade-scale hint on the
   entry form, thresholds/recommendation hint on the appraisal detail.
7. **Dark UI restyle** — indigo/violet accent, gradient shell, new fonts.
8. **Questionnaire CRUD** — `/admin/questions`; add/rename/archive dimensions,
   add/edit/archive questions. **Archive = soft-delete for rated items;
   hard-delete only when never rated; an active dimension must keep ≥1 active
   question.**
9. **Prisma/Postgres migration** — retired the JSON store; bcrypt password
   hashing; seed reduced to **CTO + Team Lead + dimensions/questions only**;
   `vercel-build` auto-provisions on deploy.

### Pages
- Team Lead: `/dashboard`, `/entry/[employeeId]`, `/developer/[id]`
- CTO: `/appraisals`, `/appraisals/[id]`
- Admin: `/admin/users`, `/admin/questions`
- Developer: `/me` · Shared: `/login`, `/guide`

### API routes (`src/app/api/`)
- Auth: `auth/login`, `auth/logout`
- Core: `users`, `questions`, `entries`(+`[developerId]`),
  `appraisals`(+`generate`, `[id]`)
- Admin (session-gated, 403 otherwise): `admin/users`(+`[id]`),
  `admin/dimensions`(+`[id]`), `admin/questions`(+`[id]`)

---

## Seed (production starting data)

`prisma/seed.ts` is **idempotent** (upserts; safe to re-run every deploy) and
seeds ONLY:
- **CTO** — Hussain Fakhruddin, `hussain@myalfred.com`, ADMIN, no team
- **Team Lead** — Shahrukh Khan, `shahrukh@myalfred.com`, MEMBER, team API
- 4 dimensions + 12 questions

All seeded passwords: `password123` (bcrypt-hashed). No developers/entries/
appraisals — the CTO adds developers via `/admin/users`.

> Admin lives on the CTO account. If Shahrukh (Team Lead) should also administer,
> set his `type` to `ADMIN`.

---

## Build / deploy

- Local: `npm run dev` (needs `.env` with `DATABASE_URL`).
- Vercel runs **`vercel-build`**: `prisma generate && prisma db push && prisma db seed && next build`
  — creates tables + seeds automatically. (`db push`, not migrations, for now.)
- Env vars required in Vercel: `DATABASE_URL` (pooled) and ideally
  `DATABASE_URL_UNPOOLED` (direct, for `db push`). Neon integration sets both.

---

## Tooling / gotchas

- **Postman:** `performance-review-app.postman_collection.json` — Auth, Admin
  (users + questionnaire), Reference, Users, Entries, Appraisals.
- Typecheck: `node node_modules/typescript/lib/tsc.js --noEmit -p tsconfig.json`
  (must run `prisma generate` first so `@prisma/client` types exist).
- Earlier `.bin` shim breakage was fixed by a clean `npm install`.

---

## Next steps / backlog

1. **Confirm the Vercel deploy is green**; smoke-test login + a rate→appraise flow
   on the live URL. If build fails, check the `db push` / `db seed` log lines.
2. Consider moving from `db push` to real **Prisma migrations** once the schema
   settles.
3. Optional: replace the auth stub with **NextAuth v5** (Credentials provider).
4. Backlog: mid-year check-ins, configurable dimension weights, PDF export,
   CTO email notifications, audit log.

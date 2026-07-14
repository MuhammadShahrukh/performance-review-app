# Performance Review Application

A web-based internal tool for managing monthly performance ratings and yearly
employee appraisals.

> **Current status:** running **JSON-first** for local development — all data
> lives in `data/*.json` behind a swappable repository layer, so no database is
> required to run the app. Prisma + PostgreSQL are wired in the schema and will
> replace the JSON store later without changing the API, grading, or UI. See
> [Data Strategy](#data-strategy).

---

## Table of Contents

1. [Overview](#overview)
2. [Roles, User Types & Teams](#roles-user-types--teams)
3. [Business Requirements](#business-requirements)
4. [Grading System](#grading-system)
5. [Review Dimensions & Questions](#review-dimensions--questions)
6. [Process Flow](#process-flow)
7. [Business Rules](#business-rules)
8. [Technical Stack](#technical-stack)
9. [Data Strategy](#data-strategy)
10. [Data Model](#data-model)
11. [API Routes](#api-routes)
12. [Pages & Features](#pages--features)
13. [Running Locally](#running-locally)

---

## Overview

The Team Lead manages a team of senior employees. Each year, employees request appraisals from the CTO. The CTO asks the Team Lead for performance data and decides whether to approve or reject each appraisal.

This app automates that process:
- Team Lead logs monthly performance ratings for each employee
- System averages monthly data into a yearly grade per employee
- CTO reviews the yearly summary and makes an appraisal decision

---

## Roles, User Types & Teams

A user is described by **two independent axes** plus a team:

### Role — the job/position (`role`)

| Role | Description |
|---|---|
| **CTO** | Reviews yearly summaries and approves or rejects appraisals. Org-wide (no team). |
| **Team Lead** (`TEAM_LEAD`) | Enters monthly performance ratings for the developers on **their own team**. |
| **Developer** (`DEVELOPER`) | The person being rated. Can log in to view their own reviews. |

> `role` drives the **review workflow** (Team Leads rate, the CTO approves). It is
> extensible — e.g. `QA` or `DESIGNER` positions can be added later.

### User type — the access tier (`type`)

| Type | Description |
|---|---|
| **Member** (`MEMBER`) | Regular access, scoped to their role. |
| **Admin** (`ADMIN`) | Can administer the app — manage users and the questionnaire. Independent of role. |

> `type` is separate from `role`: admin is a super-power layered on top, not a job.
> In the seed, the CTO is an `ADMIN`; everyone else is a `MEMBER`.

### Teams (`team`)

Developers and Team Leads belong to one team; the CTO has none (`null`).

| Team | | | |
|---|---|---|---|
| `API` | `CRM` | `HRM` | `UI` |

**Visibility:** a Team Lead sees only their own team's developers; the CTO sees
everyone across all teams.

---

## Business Requirements

- Appraisals happen **once per year**
- Team Lead enters performance data **every month** for each employee
- At appraisal time, the system computes the **average grade** across all available months
- CTO views the grade breakdown and makes a final decision
- Appraisal eligibility (e.g., minimum 1 year of service) is handled **outside the app** (HR/contracts)

---

## Grading System

Each question and dimension is graded on a 3-point descriptive scale:

| Grade | Score |
|---|---|
| Exceeds Expectations | 3 |
| Meets Expectations | 2 |
| Below Expectations | 1 |

### Yearly Grade Thresholds

| Average Score | Final Grade |
|---|---|
| 2.5 – 3.0 | Exceeds Expectations |
| 1.5 – 2.49 | Meets Expectations |
| 1.0 – 1.49 | Below Expectations |

### How the Final Grade is Calculated

```
Step 1: For each question, average scores across available months
Step 2: For each dimension, average its question scores → dimension grade
Step 3: Average all 4 dimension scores → Final Yearly Grade
Step 4: Map final score to descriptive grade using thresholds above
```

> Missing months are excluded from the average — no penalty applied.
> All 4 dimensions carry equal weight.

---

## Review Dimensions & Questions

Team Lead answers 12 questions per employee per month (3 per dimension).
Each question is answered with: Exceeds / Meets / Below Expectations.

### Dimension 1 — Delivery & Reliability
1. Delivered assigned tasks on time this month?
2. Handled production issues / incidents responsibly?
3. Required minimal follow-up or escalation?

### Dimension 2 — Code Quality
1. Produced clean, maintainable code?
2. Participated in code reviews effectively?
3. Reduced or managed tech debt responsibly?

### Dimension 3 — Collaboration
1. Communicated effectively with the team?
2. Helped unblock teammates when needed?
3. Contributed to documentation or knowledge sharing?

### Dimension 4 — Initiative & Ownership
1. Proactively identified and raised problems?
2. Went beyond assigned scope when needed?
3. Proposed improvements to process, tooling, or architecture?

---

## Process Flow

```
Every Month
  └── Team Lead opens the app
  └── Selects each employee
  └── Answers 12 questions per employee
  └── Submits monthly entry

Appraisal Season (Yearly)
  └── Team Lead generates yearly summary for each employee
  └── System averages all available monthly data
  └── CTO logs in and sees each employee's:
        - Final yearly grade
        - Per-dimension breakdown
        - System recommendation
  └── CTO approves or rejects with optional note
  └── Decision is recorded
```

---

## Business Rules

| Rule | Decision |
|---|---|
| Grades | Exceeds / Meets / Below Expectations |
| Dimensions | 4 (equal weight) |
| Questions per dimension | 3 |
| Entry frequency | Monthly, by Team Lead only |
| Missing months | Averaged over available months only |
| Minimum months required | None (eligibility handled externally) |
| Appraisal frequency | Yearly |
| CTO can override | Yes, with a note |

### CTO Recommendation Logic

| Final Yearly Grade | System Recommendation |
|---|---|
| Exceeds Expectations | Strongly Recommend Appraisal |
| Meets Expectations | Recommend Appraisal |
| Below Expectations | Do Not Recommend |

---

## Technical Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui (dark theme) |
| Backend | Next.js Route Handlers (API routes) + server components |
| Data (current) | **JSON files** under `data/`, behind a repository layer |
| Data (planned) | Prisma ORM + PostgreSQL (Neon, via Vercel) |
| Authentication | Cookie-session **stub** today; NextAuth v5 planned |
| Hosting | Vercel (deferred) |

> The app currently runs with **no database** — see [Data Strategy](#data-strategy).
> Auth is a lightweight httpOnly-cookie stub with role/type guards; it's designed
> to be swapped for NextAuth without touching the page-level guards.

---

## Data Strategy

The app is **JSON-first** so it runs with zero setup. All data lives in flat
JSON files, read and written only through a repository layer:

```
data/
  users.json          dimensions.json   questions.json
  monthlyEntries.json answers.json       appraisals.json

src/lib/data/
  store.ts        the ONLY module that touches the filesystem
  repository.ts   the swap seam — all domain operations live here
```

Everything above the repository (API routes, the grading engine, pages) depends
only on `repository.ts`, never on the files directly. **Migrating to Postgres
means reimplementing `repository.ts` with Prisma — nothing else changes.** The
Prisma schema (`prisma/schema.prisma`) and seed (`prisma/seed.ts`) are kept in
parity with the JSON shape for that day.

---

## Data Model

### User
Stores all users across roles.

| Field | Type | Description |
|---|---|---|
| id | String | Unique identifier |
| name | String | Full name |
| email | String | Unique email, used for login |
| type | Enum | `MEMBER` or `ADMIN` (access tier) |
| role | Enum | `CTO`, `TEAM_LEAD`, or `DEVELOPER` (job/position) |
| team | Enum? | `API`, `CRM`, `HRM`, `UI`, or `null` (CTO is org-wide) |
| monthlyEntries | Relation | All monthly entries where this user is the developer being rated |
| appraisals | Relation | All appraisal records for this user |

> `monthlyEntries` and `appraisals` are Prisma relations — not stored columns.
> `password` is stored (plaintext in the JSON stub; hash when real auth lands).

---

### Dimension
Represents one of the review categories (4 by default; admins can add more).

| Field | Type | Description |
|---|---|---|
| id | String | Unique identifier |
| name | String | e.g., "Delivery & Reliability" |
| active | Boolean | Archived dimensions (`false`) are hidden from new entries but kept for history |
| questions | Relation | All questions that belong to this dimension |

---

### Question
A single question inside a dimension. Admins can add, edit, or archive questions.

| Field | Type | Description |
|---|---|---|
| id | String | Unique identifier |
| text | String | The question text shown to the Team Lead |
| dimensionId | String | Foreign key → Dimension |
| active | Boolean | Archived questions (`false`) drop out of new entries but stay in past ratings |
| dimension | Relation | The parent dimension |
| answers | Relation | All answers given to this question across monthly entries |

> **Archiving vs. deleting:** items that already have recorded ratings can only be
> **archived** (soft-deleted) so historical appraisals keep their meaning; hard
> delete is allowed only for never-rated items. An active dimension must always
> keep at least one active question.

---

### MonthlyEntry
One entry per employee per month. Acts as a container for that month's answers.

| Field | Type | Description |
|---|---|---|
| id | String | Unique identifier |
| developerId | String | Foreign key → User (the employee being rated) |
| developer | Relation | The employee |
| month | Int | 1–12 |
| year | Int | e.g., 2025 |
| answers | Relation | All 12 answers for this entry |
| createdAt | DateTime | When entry was submitted |

> Unique constraint on `[developerId, month, year]` — one entry per employee per month only.

---

### MonthlyEntryAnswer
One row per question per monthly entry. Stores the actual grade given.

| Field | Type | Description |
|---|---|---|
| id | String | Unique identifier |
| monthlyEntryId | String | Foreign key → MonthlyEntry |
| monthlyEntry | Relation | The parent monthly entry |
| questionId | String | Foreign key → Question |
| question | Relation | The question being answered |
| grade | Enum | EXCEEDS, MEETS, or BELOW |

---

### Appraisal
Generated once per employee per year. Stores the computed yearly grade and CTO decision.

| Field | Type | Description |
|---|---|---|
| id | String | Unique identifier |
| developerId | String | Foreign key → User (the employee) |
| developer | Relation | The employee |
| year | Int | e.g., 2025 |
| finalGrade | Enum | EXCEEDS, MEETS, or BELOW |
| decision | Enum | PENDING, APPROVED, or REJECTED |
| ctoNote | String? | Optional note from CTO |
| createdAt | DateTime | When appraisal was generated |

> Unique constraint on `[developerId, year]` — one appraisal per employee per year only.

---

## API Routes

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/login` | Validate credentials, set the session cookie |
| POST | `/api/auth/logout` | Clear the session cookie |

### Core
| Method | Route | Description |
|---|---|---|
| GET | `/api/users` | List all developers |
| POST | `/api/users` | Create a user |
| GET | `/api/questions` | Active dimensions + questions (for the entry form) |
| POST | `/api/entries` | Submit a monthly entry (12 answers) for a developer |
| GET | `/api/entries/[developerId]` | All monthly entries (with answers) for a developer |
| POST | `/api/appraisals/generate` | Compute & persist the yearly grade |
| GET | `/api/appraisals` | Every developer with their computed yearly grade |
| GET | `/api/appraisals/[id]` | One appraisal with its dimension breakdown |
| PUT | `/api/appraisals/[id]` | Approve or reject an appraisal with a note |

### Admin (require an `ADMIN` session — 403 otherwise)
| Method | Route | Description |
|---|---|---|
| GET / POST | `/api/admin/users` | List all users / create a user |
| DELETE | `/api/admin/users/[id]` | Delete a user and **cascade** their review data |
| GET / POST | `/api/admin/dimensions` | List all dimensions / create one |
| PATCH / DELETE | `/api/admin/dimensions/[id]` | Rename or archive/restore / hard-delete (if never rated) |
| POST | `/api/admin/questions` | Add a question to a dimension |
| PATCH / DELETE | `/api/admin/questions/[id]` | Edit text or archive/restore / hard-delete (if never rated) |

> Page-level access is enforced by role/type guards in server components. The core
> mutation routes are currently open for local testing; the `admin` routes are
> session-gated.

---

## Pages & Features

### Team Lead
| Page | Description |
|---|---|
| `/dashboard` | The Team Lead's own team, with each developer's current-month status |
| `/entry/[employeeId]` | Monthly entry form — 12 questions, a grade per question |
| `/developer/[id]` | Developer history — yearly summary + month-by-month grades |

### CTO
| Page | Description |
|---|---|
| `/appraisals` | Every developer (all teams), yearly grade + system recommendation |
| `/appraisals/[id]` | Per-dimension breakdown; approve/reject with a note |

### Admin (`type = ADMIN`)
| Page | Description |
|---|---|
| `/admin/users` | Add users; delete users (cascades their review data) |
| `/admin/questions` | Manage dimensions & questions — add, rename/edit, archive, delete |

### Developer
| Page | Description |
|---|---|
| `/me` | Read-only view of the developer's own yearly summary |

### Shared
| Page | Description |
|---|---|
| `/login` | Sign-in (cookie-session stub) |
| `/guide` | Role-aware manual: how rating works + per-role instructions |

---

## Running Locally

No database needed — the app reads/writes `data/*.json`.

```bash
npm install
npm run dev          # → http://localhost:3000
```

Sign in with a seeded account (all passwords: `password123`):

| Account | Email | Role / Type |
|---|---|---|
| Hussain Fakhruddin | `hussain@myalfred.com` | CTO · Admin |
| Shahrukh Khan | `shahrukh@myalfred.com` | Team Lead (API) |
| *(developers)* | `qamar@` / `usman@` / `bilal@` / `sana@ myalfred.com` | Developer |

An importable **Postman collection** (`performance-review-app.postman_collection.json`)
covers every endpoint.

---

## Future Improvements

- Wire the database: reimplement `repository.ts` with Prisma, run migrations + seed
- Replace the auth stub with NextAuth v5 and hash passwords
- Mid-year check-in cycle
- Configurable dimension weights
- Export appraisal report as PDF
- Email notifications to the CTO when appraisal season is ready
- Audit log of changes to monthly entries

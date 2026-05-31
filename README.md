# Performance Review Application

A web-based internal tool for managing yearly employee appraisals.
Built with Next.js, PostgreSQL, and hosted on Vercel + Supabase.

---

## Table of Contents

1. [Overview](#overview)
2. [Roles](#roles)
3. [Business Requirements](#business-requirements)
4. [Grading System](#grading-system)
5. [Review Dimensions & Questions](#review-dimensions--questions)
6. [Process Flow](#process-flow)
7. [Business Rules](#business-rules)
8. [Technical Stack](#technical-stack)
9. [Database Schema](#database-schema)
10. [API Routes](#api-routes)
11. [Pages & Features](#pages--features)

---

## Overview

The Team Lead manages a team of senior employees. Each year, employees request appraisals from the CTO. The CTO asks the Team Lead for performance data and decides whether to approve or reject each appraisal.

This app automates that process:
- Team Lead logs monthly performance ratings for each employee
- System averages monthly data into a yearly grade per employee
- CTO reviews the yearly summary and makes an appraisal decision

---

## Roles

| Role | Description |
|---|---|
| **Team Lead** | Enters monthly performance ratings for all employees |
| **CTO** | Reviews yearly summaries and approves or rejects appraisals |
| **Employee** | (Future) Can log in to view their own ratings and appraisal result |

> Role is named `EMPLOYEE` (not `DEVELOPER`) to support future team members such as QA, designers, etc.

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
| Frontend | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Backend | Next.js API Routes |
| ORM | Prisma |
| Database | PostgreSQL (Vercel Postgres) |
| Authentication | NextAuth.js (role-based) |
| Hosting | Vercel (app + database) |

---

## Database Schema

### User
Stores all users across roles.

| Field | Type | Description |
|---|---|---|
| id | String | Unique identifier |
| name | String | Full name |
| email | String | Unique email, used for login |
| role | Enum | TEAM_LEAD, CTO, or EMPLOYEE |
| monthlyEntries | Relation | All monthly entries where this user is the employee being rated |
| appraisals | Relation | All appraisal records for this user |

> `monthlyEntries` and `appraisals` are Prisma relations — not database columns.
> They allow querying a user's related records directly (e.g., `user.appraisals`).

---

### Dimension
Represents one of the 4 review categories.

| Field | Type | Description |
|---|---|---|
| id | String | Unique identifier |
| name | String | e.g., "Delivery & Reliability" |
| questions | Relation | All questions that belong to this dimension |

---

### Question
A single question inside a dimension. Seeded once, never changes during normal usage.

| Field | Type | Description |
|---|---|---|
| id | String | Unique identifier |
| text | String | The question text shown to Team Lead |
| dimensionId | String | Foreign key → Dimension |
| dimension | Relation | The parent dimension |
| answers | Relation | All answers given to this question across monthly entries |

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

| Method | Route | Who | Description |
|---|---|---|---|
| GET | `/api/users` | Team Lead | List all employees |
| POST | `/api/users` | Team Lead | Create a new user |
| POST | `/api/entries` | Team Lead | Submit monthly entry for an employee |
| GET | `/api/entries/[developerId]` | Team Lead | View all monthly entries for an employee |
| POST | `/api/appraisals/generate` | Team Lead | Compute yearly grade from monthly data |
| GET | `/api/appraisals` | CTO | List all employees with yearly grades |
| PUT | `/api/appraisals/[id]` | CTO | Approve or reject an appraisal with note |

---

## Pages & Features

### Team Lead Pages

| Page | Description |
|---|---|
| `/dashboard` | Lists all 8 employees with current month entry status |
| `/entry/[employeeId]` | Monthly entry form — 12 questions, select grade per question |
| `/developer/[id]` | Employee history — monthly grades and dimension breakdown |

### CTO Pages

| Page | Description |
|---|---|
| `/appraisals` | All employees, their yearly grade and system recommendation |
| `/appraisals/[id]` | Detailed breakdown per dimension, approve/reject with note |

### Shared Pages

| Page | Description |
|---|---|
| `/login` | NextAuth sign-in page |

---

## Future Improvements

- Employee login to view their own ratings and appraisal result
- Mid-year check-in cycle
- Dimension weight configuration
- Export appraisal report as PDF
- Email notifications to CTO when appraisal season is ready
- Audit log of changes to monthly entries

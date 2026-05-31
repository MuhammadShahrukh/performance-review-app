# Performance Review App — Project Context

This project was planned in a prior session. Read this file before doing anything.
Full business requirements and technical design are documented in README.md.

---

## What This App Does

Internal tool for a Team Lead to log monthly performance ratings for 8 senior employees.
At appraisal time, the system averages monthly data into a yearly grade and presents it to the CTO who approves or rejects the appraisal.

---

## Current Status

Planning phase complete. Ready to scaffold the Next.js project.

---

## Roles

- TEAM_LEAD — enters monthly ratings
- CTO — reviews yearly summaries, approves/rejects appraisals
- EMPLOYEE — future role, will view their own ratings

---

## Tech Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Prisma ORM
- PostgreSQL (Vercel Postgres)
- NextAuth.js (role-based auth)
- Deployed on Vercel (app + database)

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

## Next Step

Scaffold the Next.js project and set up:
1. Prisma schema (see README.md → Database Schema section)
2. NextAuth with 3 roles
3. Seed file for Dimensions and Questions
4. Folder structure for App Router pages

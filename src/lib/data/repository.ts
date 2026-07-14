// Domain data-access layer — Prisma implementation.
//
// This is the swap seam: everything above it (API routes, grading, pages)
// depends only on these functions, never on Prisma directly. The previous
// JSON-file implementation had the same signatures; moving to Postgres only
// changed this file.

import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import type {
  User,
  Dimension,
  Question,
  MonthlyEntry,
  MonthlyEntryAnswer,
  Appraisal,
  Grade,
  Decision,
  Team,
} from "@/types";

const BCRYPT_ROUNDS = 10;

// ─── Row → domain mappers (Prisma returns Date; domain uses ISO strings) ─────

function toEntry(e: {
  id: string;
  developerId: string;
  month: number;
  year: number;
  createdAt: Date;
}): MonthlyEntry {
  return {
    id: e.id,
    developerId: e.developerId,
    month: e.month,
    year: e.year,
    createdAt: e.createdAt.toISOString(),
  };
}

function toAppraisal(a: {
  id: string;
  developerId: string;
  year: number;
  finalGrade: Grade;
  decision: Decision;
  ctoNote: string | null;
  createdAt: Date;
}): Appraisal {
  return {
    id: a.id,
    developerId: a.developerId,
    year: a.year,
    finalGrade: a.finalGrade,
    decision: a.decision,
    ctoNote: a.ctoNote,
    createdAt: a.createdAt.toISOString(),
  };
}

// ─── Users ────────────────────────────────────────────────────────────────

export async function getUsers(): Promise<User[]> {
  return prisma.user.findMany({ orderBy: { name: "asc" } });
}

export async function getDevelopers(team?: Team): Promise<User[]> {
  return prisma.user.findMany({
    where: { role: "DEVELOPER", ...(team ? { team } : {}) },
    orderBy: { name: "asc" },
  });
}

export async function getUserById(id: string): Promise<User | undefined> {
  return (await prisma.user.findUnique({ where: { id } })) ?? undefined;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  return (
    (await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    })) ?? undefined
  );
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  type: User["type"];
  role: User["role"];
  team: Team | null;
}): Promise<User> {
  const existing = await getUserByEmail(input.email);
  if (existing) {
    throw new ConflictError(`A user with email ${input.email} already exists`);
  }
  // Developers and team leads must belong to a team; the CTO must not.
  if (input.role === "CTO" && input.team !== null) {
    throw new ValidationError("The CTO is org-wide and cannot have a team");
  }
  if (input.role !== "CTO" && input.team === null) {
    throw new ValidationError(`A ${input.role} must belong to a team`);
  }
  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      password: bcrypt.hashSync(input.password, BCRYPT_ROUNDS),
      type: input.type,
      role: input.role,
      team: input.team,
    },
  });
}

/**
 * Delete a user and cascade all of their review data:
 * their monthly entries, those entries' answers, and their appraisals.
 */
export async function deleteUser(id: string): Promise<{
  entriesRemoved: number;
  answersRemoved: number;
  appraisalsRemoved: number;
}> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError(`User ${id} not found`);

  const entries = await prisma.monthlyEntry.findMany({
    where: { developerId: id },
    select: { id: true },
  });
  const entryIds = entries.map((e) => e.id);

  const answersRemoved = await prisma.monthlyEntryAnswer.count({
    where: { monthlyEntryId: { in: entryIds } },
  });
  const appraisalsRemoved = await prisma.appraisal.count({
    where: { developerId: id },
  });

  await prisma.$transaction([
    prisma.monthlyEntryAnswer.deleteMany({
      where: { monthlyEntryId: { in: entryIds } },
    }),
    prisma.monthlyEntry.deleteMany({ where: { developerId: id } }),
    prisma.appraisal.deleteMany({ where: { developerId: id } }),
    prisma.user.delete({ where: { id } }),
  ]);

  return { entriesRemoved: entryIds.length, answersRemoved, appraisalsRemoved };
}

// ─── Dimensions & Questions ──────────────────────────────────────────────────
//
// getDimensions/getQuestions return EVERYTHING (active + archived) — the grading
// engine needs archived items so historical ratings keep their meaning. The
// active-only getters feed the entry form and "current questionnaire" surfaces.

export async function getDimensions(): Promise<Dimension[]> {
  return prisma.dimension.findMany({ orderBy: { name: "asc" } });
}

export async function getQuestions(): Promise<Question[]> {
  return prisma.question.findMany();
}

export async function getActiveDimensions(): Promise<Dimension[]> {
  return prisma.dimension.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
}

export async function getActiveQuestions(): Promise<Question[]> {
  return prisma.question.findMany({ where: { active: true } });
}

// ─── Dimension admin ─────────────────────────────────────────────────────────

export async function createDimension(name: string): Promise<Dimension> {
  const trimmed = name.trim();
  if (!trimmed) throw new ValidationError("Dimension name is required");
  return prisma.dimension.create({ data: { name: trimmed, active: true } });
}

export async function updateDimension(
  id: string,
  patch: { name?: string; active?: boolean },
): Promise<Dimension> {
  const dim = await prisma.dimension.findUnique({ where: { id } });
  if (!dim) throw new NotFoundError(`Dimension ${id} not found`);
  const data: { name?: string; active?: boolean } = {};
  if (patch.name !== undefined) {
    const trimmed = patch.name.trim();
    if (!trimmed) throw new ValidationError("Dimension name cannot be empty");
    data.name = trimmed;
  }
  if (patch.active !== undefined) data.active = patch.active;
  return prisma.dimension.update({ where: { id }, data });
}

/** Hard-delete a dimension — only if none of its questions have any answers. */
export async function deleteDimension(id: string): Promise<void> {
  const dim = await prisma.dimension.findUnique({ where: { id } });
  if (!dim) throw new NotFoundError(`Dimension ${id} not found`);

  const used = await prisma.monthlyEntryAnswer.count({
    where: { question: { dimensionId: id } },
  });
  if (used > 0) {
    throw new ConflictError(
      "This dimension has recorded ratings — archive it instead of deleting.",
    );
  }

  await prisma.$transaction([
    prisma.question.deleteMany({ where: { dimensionId: id } }),
    prisma.dimension.delete({ where: { id } }),
  ]);
}

// ─── Question admin ──────────────────────────────────────────────────────────

export async function createQuestion(input: {
  dimensionId: string;
  text: string;
}): Promise<Question> {
  const text = input.text.trim();
  if (!text) throw new ValidationError("Question text is required");
  const dim = await prisma.dimension.findUnique({
    where: { id: input.dimensionId },
  });
  if (!dim) throw new ValidationError(`No dimension with id ${input.dimensionId}`);
  return prisma.question.create({
    data: { dimensionId: input.dimensionId, text, active: true },
  });
}

export async function updateQuestion(
  id: string,
  patch: { text?: string; active?: boolean },
): Promise<Question> {
  const q = await prisma.question.findUnique({ where: { id } });
  if (!q) throw new NotFoundError(`Question ${id} not found`);

  const data: { text?: string; active?: boolean } = {};
  if (patch.text !== undefined) {
    const trimmed = patch.text.trim();
    if (!trimmed) throw new ValidationError("Question text cannot be empty");
    data.text = trimmed;
  }

  // Guard: an active dimension must keep at least one active question.
  if (patch.active === false && q.active) {
    const dim = await prisma.dimension.findUnique({
      where: { id: q.dimensionId },
    });
    if (dim?.active) {
      const otherActive = await prisma.question.count({
        where: { dimensionId: q.dimensionId, active: true, id: { not: id } },
      });
      if (otherActive === 0) {
        throw new ValidationError(
          "A dimension must keep at least one active question. Archive the whole dimension instead.",
        );
      }
    }
  }
  if (patch.active !== undefined) data.active = patch.active;

  return prisma.question.update({ where: { id }, data });
}

/** Hard-delete a question — only if it has no answers. */
export async function deleteQuestion(id: string): Promise<void> {
  const q = await prisma.question.findUnique({ where: { id } });
  if (!q) throw new NotFoundError(`Question ${id} not found`);
  const used = await prisma.monthlyEntryAnswer.count({
    where: { questionId: id },
  });
  if (used > 0) {
    throw new ConflictError(
      "This question has recorded ratings — archive it instead of deleting.",
    );
  }
  await prisma.question.delete({ where: { id } });
}

// ─── Monthly entries + answers ──────────────────────────────────────────────

export async function getEntriesForDeveloper(
  developerId: string,
  year?: number,
): Promise<MonthlyEntry[]> {
  const entries = await prisma.monthlyEntry.findMany({
    where: { developerId, ...(year !== undefined ? { year } : {}) },
  });
  return entries.map(toEntry);
}

export async function findEntry(
  developerId: string,
  month: number,
  year: number,
): Promise<MonthlyEntry | undefined> {
  const entry = await prisma.monthlyEntry.findUnique({
    where: { developerId_month_year: { developerId, month, year } },
  });
  return entry ? toEntry(entry) : undefined;
}

export async function getAnswersForEntries(
  entryIds: string[],
): Promise<MonthlyEntryAnswer[]> {
  if (entryIds.length === 0) return [];
  return prisma.monthlyEntryAnswer.findMany({
    where: { monthlyEntryId: { in: entryIds } },
  });
}

/** Create a monthly entry together with its answers (one transaction). */
export async function createMonthlyEntry(input: {
  developerId: string;
  month: number;
  year: number;
  answers: { questionId: string; grade: Grade }[];
}): Promise<MonthlyEntry> {
  const existing = await findEntry(input.developerId, input.month, input.year);
  if (existing) {
    throw new ConflictError(
      `An entry for developer ${input.developerId} already exists for ${input.month}/${input.year}`,
    );
  }
  const entry = await prisma.monthlyEntry.create({
    data: {
      developerId: input.developerId,
      month: input.month,
      year: input.year,
      answers: {
        create: input.answers.map((a) => ({
          questionId: a.questionId,
          grade: a.grade,
        })),
      },
    },
  });
  return toEntry(entry);
}

// ─── Appraisals ─────────────────────────────────────────────────────────────

export async function getAppraisals(): Promise<Appraisal[]> {
  const rows = await prisma.appraisal.findMany();
  return rows.map(toAppraisal);
}

export async function getAppraisalById(
  id: string,
): Promise<Appraisal | undefined> {
  const a = await prisma.appraisal.findUnique({ where: { id } });
  return a ? toAppraisal(a) : undefined;
}

export async function upsertAppraisal(input: {
  developerId: string;
  year: number;
  finalGrade: Grade;
}): Promise<Appraisal> {
  // Regenerating recomputes the grade but preserves any CTO decision/note.
  const a = await prisma.appraisal.upsert({
    where: {
      developerId_year: { developerId: input.developerId, year: input.year },
    },
    update: { finalGrade: input.finalGrade },
    create: {
      developerId: input.developerId,
      year: input.year,
      finalGrade: input.finalGrade,
      decision: "PENDING",
      ctoNote: null,
    },
  });
  return toAppraisal(a);
}

export async function decideAppraisal(
  id: string,
  decision: Decision,
  ctoNote: string | null,
): Promise<Appraisal> {
  const existing = await prisma.appraisal.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(`Appraisal ${id} not found`);
  const a = await prisma.appraisal.update({
    where: { id },
    data: { decision, ctoNote },
  });
  return toAppraisal(a);
}

// ─── Typed errors so API routes can map to HTTP status codes ─────────────────

export class NotFoundError extends Error {}
export class ConflictError extends Error {}
export class ValidationError extends Error {}

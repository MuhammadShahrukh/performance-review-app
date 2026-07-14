// Domain data-access layer.
//
// Everything above this line (API routes, grading, pages) depends ONLY on
// these functions — never on the JSON store directly. Swapping to Prisma
// later means reimplementing this file against the DB; nothing else changes.

import {
  readCollection,
  writeCollection,
  generateId,
  type Collection,
} from "./store";
import type {
  User,
  Dimension,
  Question,
  MonthlyEntry,
  MonthlyEntryAnswer,
  Appraisal,
  Grade,
  Decision,
} from "@/types";

// ─── Users ────────────────────────────────────────────────────────────────

export async function getUsers(): Promise<User[]> {
  return readCollection<User>("users");
}

export async function getEmployees(): Promise<User[]> {
  const users = await getUsers();
  return users.filter((u) => u.role === "EMPLOYEE");
}

export async function getUserById(id: string): Promise<User | undefined> {
  const users = await getUsers();
  return users.find((u) => u.id === id);
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const users = await getUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: User["role"];
}): Promise<User> {
  const users = await getUsers();
  if (users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
    throw new ConflictError(`A user with email ${input.email} already exists`);
  }
  const user: User = { id: generateId("usr"), ...input };
  users.push(user);
  await writeCollection("users", users);
  return user;
}

// ─── Dimensions & Questions (read-only reference data) ──────────────────────

export async function getDimensions(): Promise<Dimension[]> {
  return readCollection<Dimension>("dimensions");
}

export async function getQuestions(): Promise<Question[]> {
  return readCollection<Question>("questions");
}

// ─── Monthly entries + answers ──────────────────────────────────────────────

export async function getEntriesForDeveloper(
  developerId: string,
  year?: number,
): Promise<MonthlyEntry[]> {
  const entries = await readCollection<MonthlyEntry>("monthlyEntries");
  return entries.filter(
    (e) =>
      e.developerId === developerId && (year === undefined || e.year === year),
  );
}

export async function findEntry(
  developerId: string,
  month: number,
  year: number,
): Promise<MonthlyEntry | undefined> {
  const entries = await readCollection<MonthlyEntry>("monthlyEntries");
  return entries.find(
    (e) =>
      e.developerId === developerId && e.month === month && e.year === year,
  );
}

export async function getAnswersForEntries(
  entryIds: string[],
): Promise<MonthlyEntryAnswer[]> {
  const answers = await readCollection<MonthlyEntryAnswer>("answers");
  const set = new Set(entryIds);
  return answers.filter((a) => set.has(a.monthlyEntryId));
}

/**
 * Create a monthly entry together with its 12 answers, atomically-ish.
 * Enforces the [developerId, month, year] uniqueness constraint.
 */
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

  const entries = await readCollection<MonthlyEntry>("monthlyEntries");
  const allAnswers = await readCollection<MonthlyEntryAnswer>("answers");

  const entry: MonthlyEntry = {
    id: generateId("me"),
    developerId: input.developerId,
    month: input.month,
    year: input.year,
    createdAt: new Date().toISOString(),
  };

  const newAnswers: MonthlyEntryAnswer[] = input.answers.map((a) => ({
    id: generateId("ans"),
    monthlyEntryId: entry.id,
    questionId: a.questionId,
    grade: a.grade,
  }));

  entries.push(entry);
  allAnswers.push(...newAnswers);

  // Write answers first; if the entry write fails, we have orphan answers
  // (harmless — they're never read without their entry). Order chosen so a
  // successful entry always has its answers present.
  await writeCollection("answers", allAnswers);
  await writeCollection("monthlyEntries", entries);

  return entry;
}

// ─── Appraisals ─────────────────────────────────────────────────────────────

export async function getAppraisals(): Promise<Appraisal[]> {
  return readCollection<Appraisal>("appraisals");
}

export async function getAppraisalById(
  id: string,
): Promise<Appraisal | undefined> {
  const appraisals = await getAppraisals();
  return appraisals.find((a) => a.id === id);
}

export async function upsertAppraisal(input: {
  developerId: string;
  year: number;
  finalGrade: Grade;
}): Promise<Appraisal> {
  const appraisals = await getAppraisals();
  const existing = appraisals.find(
    (a) => a.developerId === input.developerId && a.year === input.year,
  );

  if (existing) {
    // Regenerating recomputes the grade but preserves any CTO decision/note.
    existing.finalGrade = input.finalGrade;
    await writeCollection("appraisals", appraisals);
    return existing;
  }

  const appraisal: Appraisal = {
    id: generateId("apr"),
    developerId: input.developerId,
    year: input.year,
    finalGrade: input.finalGrade,
    decision: "PENDING",
    ctoNote: null,
    createdAt: new Date().toISOString(),
  };
  appraisals.push(appraisal);
  await writeCollection("appraisals", appraisals);
  return appraisal;
}

export async function decideAppraisal(
  id: string,
  decision: Decision,
  ctoNote: string | null,
): Promise<Appraisal> {
  const appraisals = await getAppraisals();
  const appraisal = appraisals.find((a) => a.id === id);
  if (!appraisal) throw new NotFoundError(`Appraisal ${id} not found`);
  appraisal.decision = decision;
  appraisal.ctoNote = ctoNote;
  await writeCollection("appraisals", appraisals);
  return appraisal;
}

// ─── Typed errors so API routes can map to HTTP status codes ─────────────────

export class NotFoundError extends Error {}
export class ConflictError extends Error {}
export class ValidationError extends Error {}

// Re-export for callers that need the raw collection name type.
export type { Collection };

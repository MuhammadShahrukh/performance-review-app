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
  Team,
} from "@/types";

// ─── Users ────────────────────────────────────────────────────────────────

export async function getUsers(): Promise<User[]> {
  return readCollection<User>("users");
}

export async function getDevelopers(team?: Team): Promise<User[]> {
  const users = await getUsers();
  return users.filter(
    (u) => u.role === "DEVELOPER" && (team === undefined || u.team === team),
  );
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
  type: User["type"];
  role: User["role"];
  team: Team | null;
}): Promise<User> {
  const users = await getUsers();
  if (users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
    throw new ConflictError(`A user with email ${input.email} already exists`);
  }
  // Developers and team leads must belong to a team; the CTO must not.
  if (input.role === "CTO" && input.team !== null) {
    throw new ValidationError("The CTO is org-wide and cannot have a team");
  }
  if (input.role !== "CTO" && input.team === null) {
    throw new ValidationError(`A ${input.role} must belong to a team`);
  }
  const user: User = { id: generateId("usr"), ...input };
  users.push(user);
  await writeCollection("users", users);
  return user;
}

/**
 * Delete a user and cascade all of their review data:
 * their monthly entries, those entries' answers, and their appraisals.
 * Returns a summary of what was removed.
 */
export async function deleteUser(id: string): Promise<{
  entriesRemoved: number;
  answersRemoved: number;
  appraisalsRemoved: number;
}> {
  const users = await getUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) throw new NotFoundError(`User ${id} not found`);

  const entries = await readCollection<MonthlyEntry>("monthlyEntries");
  const answers = await readCollection<MonthlyEntryAnswer>("answers");
  const appraisals = await readCollection<Appraisal>("appraisals");

  const theirEntryIds = new Set(
    entries.filter((e) => e.developerId === id).map((e) => e.id),
  );

  const remainingEntries = entries.filter((e) => e.developerId !== id);
  const remainingAnswers = answers.filter(
    (a) => !theirEntryIds.has(a.monthlyEntryId),
  );
  const remainingAppraisals = appraisals.filter((a) => a.developerId !== id);

  const summary = {
    entriesRemoved: entries.length - remainingEntries.length,
    answersRemoved: answers.length - remainingAnswers.length,
    appraisalsRemoved: appraisals.length - remainingAppraisals.length,
  };

  // Remove children first, then the user. If a later write fails, we may drop
  // orphaned children — harmless (they're never read without their parent).
  users.splice(idx, 1);
  await writeCollection("answers", remainingAnswers);
  await writeCollection("monthlyEntries", remainingEntries);
  await writeCollection("appraisals", remainingAppraisals);
  await writeCollection("users", users);

  return summary;
}

// ─── Dimensions & Questions (reference data) ─────────────────────────────────
//
// getDimensions/getQuestions return EVERYTHING (active + archived) — the
// grading engine needs archived items so historical ratings keep their meaning.
// The active-only getters feed the entry form and other "current questionnaire"
// surfaces.

export async function getDimensions(): Promise<Dimension[]> {
  return readCollection<Dimension>("dimensions");
}

export async function getQuestions(): Promise<Question[]> {
  return readCollection<Question>("questions");
}

export async function getActiveDimensions(): Promise<Dimension[]> {
  return (await getDimensions()).filter((d) => d.active);
}

export async function getActiveQuestions(): Promise<Question[]> {
  return (await getQuestions()).filter((q) => q.active);
}

// ─── Dimension admin ─────────────────────────────────────────────────────────

export async function createDimension(name: string): Promise<Dimension> {
  const trimmed = name.trim();
  if (!trimmed) throw new ValidationError("Dimension name is required");
  const dimensions = await getDimensions();
  const dimension: Dimension = {
    id: generateId("dim"),
    name: trimmed,
    active: true,
  };
  dimensions.push(dimension);
  await writeCollection("dimensions", dimensions);
  return dimension;
}

export async function updateDimension(
  id: string,
  patch: { name?: string; active?: boolean },
): Promise<Dimension> {
  const dimensions = await getDimensions();
  const dim = dimensions.find((d) => d.id === id);
  if (!dim) throw new NotFoundError(`Dimension ${id} not found`);
  if (patch.name !== undefined) {
    const trimmed = patch.name.trim();
    if (!trimmed) throw new ValidationError("Dimension name cannot be empty");
    dim.name = trimmed;
  }
  if (patch.active !== undefined) dim.active = patch.active;
  await writeCollection("dimensions", dimensions);
  return dim;
}

/** Hard-delete a dimension — only if none of its questions have any answers. */
export async function deleteDimension(id: string): Promise<void> {
  const dimensions = await getDimensions();
  const dim = dimensions.find((d) => d.id === id);
  if (!dim) throw new NotFoundError(`Dimension ${id} not found`);

  const questions = await getQuestions();
  const dimQuestionIds = questions
    .filter((q) => q.dimensionId === id)
    .map((q) => q.id);
  const answers = await readCollection<MonthlyEntryAnswer>("answers");
  const used = answers.some((a) => dimQuestionIds.includes(a.questionId));
  if (used) {
    throw new ConflictError(
      "This dimension has recorded ratings — archive it instead of deleting.",
    );
  }

  await writeCollection(
    "questions",
    questions.filter((q) => q.dimensionId !== id),
  );
  await writeCollection(
    "dimensions",
    dimensions.filter((d) => d.id !== id),
  );
}

// ─── Question admin ──────────────────────────────────────────────────────────

export async function createQuestion(input: {
  dimensionId: string;
  text: string;
}): Promise<Question> {
  const text = input.text.trim();
  if (!text) throw new ValidationError("Question text is required");
  const dimensions = await getDimensions();
  if (!dimensions.some((d) => d.id === input.dimensionId)) {
    throw new ValidationError(`No dimension with id ${input.dimensionId}`);
  }
  const questions = await getQuestions();
  const question: Question = {
    id: generateId("q"),
    dimensionId: input.dimensionId,
    text,
    active: true,
  };
  questions.push(question);
  await writeCollection("questions", questions);
  return question;
}

export async function updateQuestion(
  id: string,
  patch: { text?: string; active?: boolean },
): Promise<Question> {
  const questions = await getQuestions();
  const q = questions.find((x) => x.id === id);
  if (!q) throw new NotFoundError(`Question ${id} not found`);

  if (patch.text !== undefined) {
    const trimmed = patch.text.trim();
    if (!trimmed) throw new ValidationError("Question text cannot be empty");
    q.text = trimmed;
  }

  // Guard: an active dimension must keep at least one active question.
  if (patch.active === false && q.active) {
    const dimensions = await getDimensions();
    const dim = dimensions.find((d) => d.id === q.dimensionId);
    if (dim?.active) {
      const otherActive = questions.some(
        (x) => x.dimensionId === q.dimensionId && x.id !== id && x.active,
      );
      if (!otherActive) {
        throw new ValidationError(
          "A dimension must keep at least one active question. Archive the whole dimension instead.",
        );
      }
    }
  }
  if (patch.active !== undefined) q.active = patch.active;

  await writeCollection("questions", questions);
  return q;
}

/** Hard-delete a question — only if it has no answers. */
export async function deleteQuestion(id: string): Promise<void> {
  const questions = await getQuestions();
  const q = questions.find((x) => x.id === id);
  if (!q) throw new NotFoundError(`Question ${id} not found`);

  const answers = await readCollection<MonthlyEntryAnswer>("answers");
  if (answers.some((a) => a.questionId === id)) {
    throw new ConflictError(
      "This question has recorded ratings — archive it instead of deleting.",
    );
  }
  await writeCollection(
    "questions",
    questions.filter((x) => x.id !== id),
  );
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

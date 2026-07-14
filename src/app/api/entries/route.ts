import { handle, ok, parseJson } from "@/lib/api";
import {
  getUserById,
  getQuestions,
  createMonthlyEntry,
  ValidationError,
} from "@/lib/data/repository";
import type { Grade } from "@/types";

const VALID_GRADES: Grade[] = ["EXCEEDS", "MEETS", "BELOW"];

interface AnswerInput {
  questionId?: string;
  grade?: string;
}
interface EntryInput {
  developerId?: string;
  month?: number;
  year?: number;
  answers?: AnswerInput[];
}

// POST /api/entries → submit a monthly entry (12 answers) for an employee
export async function POST(req: Request) {
  return handle(async () => {
    const body = await parseJson<EntryInput>(req);

    const { developerId, month, year, answers } = body;

    if (!developerId) throw new ValidationError("developerId is required");
    if (!Number.isInteger(month) || month! < 1 || month! > 12) {
      throw new ValidationError("month must be an integer 1-12");
    }
    if (!Number.isInteger(year) || year! < 2000 || year! > 2100) {
      throw new ValidationError("year must be a valid 4-digit year");
    }
    if (!Array.isArray(answers) || answers.length === 0) {
      throw new ValidationError("answers must be a non-empty array");
    }

    const developer = await getUserById(developerId);
    if (!developer) {
      throw new ValidationError(`No user with id ${developerId}`);
    }
    if (developer.role !== "EMPLOYEE") {
      throw new ValidationError("Ratings can only be recorded for employees");
    }

    const questions = await getQuestions();
    const questionIds = new Set(questions.map((q) => q.id));

    // Require exactly one answer per question, all questions covered.
    const seen = new Set<string>();
    for (const a of answers) {
      if (!a.questionId || !questionIds.has(a.questionId)) {
        throw new ValidationError(`Unknown questionId: ${a.questionId}`);
      }
      if (seen.has(a.questionId)) {
        throw new ValidationError(`Duplicate answer for ${a.questionId}`);
      }
      if (!a.grade || !VALID_GRADES.includes(a.grade as Grade)) {
        throw new ValidationError(
          `grade for ${a.questionId} must be one of ${VALID_GRADES.join(", ")}`,
        );
      }
      seen.add(a.questionId);
    }
    if (seen.size !== questions.length) {
      throw new ValidationError(
        `Expected an answer for all ${questions.length} questions, got ${seen.size}`,
      );
    }

    const entry = await createMonthlyEntry({
      developerId,
      month: month!,
      year: year!,
      answers: answers.map((a) => ({
        questionId: a.questionId!,
        grade: a.grade as Grade,
      })),
    });

    return ok(entry, 201);
  });
}

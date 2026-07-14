import { handle, ok, parseJson } from "@/lib/api";
import {
  getUserById,
  getEntriesForDeveloper,
  upsertAppraisal,
  ValidationError,
} from "@/lib/data/repository";
import { buildYearlySummary } from "@/lib/summary";

// POST /api/appraisals/generate → average monthly data into a yearly grade
// and persist (upsert) the appraisal. Body: { developerId, year }
export async function POST(req: Request) {
  return handle(async () => {
    const body = await parseJson<{ developerId?: string; year?: number }>(req);
    const { developerId, year } = body;

    if (!developerId) throw new ValidationError("developerId is required");
    if (!Number.isInteger(year)) throw new ValidationError("year is required");

    const developer = await getUserById(developerId);
    if (!developer || developer.role !== "DEVELOPER") {
      throw new ValidationError(`No developer with id ${developerId}`);
    }

    const entries = await getEntriesForDeveloper(developerId, year);
    if (entries.length === 0) {
      throw new ValidationError(
        `No monthly entries for ${developerId} in ${year} — nothing to average`,
      );
    }

    const summary = await buildYearlySummary(developerId, year!);
    const appraisal = await upsertAppraisal({
      developerId,
      year: year!,
      finalGrade: summary.finalGrade,
    });

    return ok({ appraisal, summary }, 201);
  });
}

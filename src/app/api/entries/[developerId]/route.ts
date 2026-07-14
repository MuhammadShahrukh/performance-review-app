import { handle, ok } from "@/lib/api";
import {
  getUserById,
  getEntriesForDeveloper,
  getAnswersForEntries,
  NotFoundError,
} from "@/lib/data/repository";

// GET /api/entries/[developerId] → all monthly entries (with answers) for an
// employee. Optional ?year=2026 filter.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ developerId: string }> },
) {
  return handle(async () => {
    const { developerId } = await params;
    const yearParam = new URL(req.url).searchParams.get("year");
    const year = yearParam ? Number(yearParam) : undefined;

    const developer = await getUserById(developerId);
    if (!developer) throw new NotFoundError(`No user with id ${developerId}`);

    const entries = await getEntriesForDeveloper(developerId, year);
    const answers = await getAnswersForEntries(entries.map((e) => e.id));

    // Attach each entry's answers for convenience.
    const withAnswers = entries
      .sort((a, b) => a.year - b.year || a.month - b.month)
      .map((e) => ({
        ...e,
        answers: answers.filter((a) => a.monthlyEntryId === e.id),
      }));

    return ok({
      developer: { id: developer.id, name: developer.name },
      entries: withAnswers,
    });
  });
}

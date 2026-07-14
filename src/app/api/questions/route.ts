import { handle, ok } from "@/lib/api";
import {
  getActiveDimensions,
  getActiveQuestions,
} from "@/lib/data/repository";

// GET /api/questions → the active dimensions, each with its active questions.
// Reference data for building the monthly entry form.
export async function GET() {
  return handle(async () => {
    const [dimensions, questions] = await Promise.all([
      getActiveDimensions(),
      getActiveQuestions(),
    ]);
    return ok(
      dimensions.map((d) => ({
        ...d,
        questions: questions.filter((q) => q.dimensionId === d.id),
      })),
    );
  });
}

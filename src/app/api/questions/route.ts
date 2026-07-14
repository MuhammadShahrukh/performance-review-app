import { handle, ok } from "@/lib/api";
import { getDimensions, getQuestions } from "@/lib/data/repository";

// GET /api/questions → the 4 dimensions, each with its 3 questions.
// Reference data for building the monthly entry form.
export async function GET() {
  return handle(async () => {
    const [dimensions, questions] = await Promise.all([
      getDimensions(),
      getQuestions(),
    ]);
    return ok(
      dimensions.map((d) => ({
        ...d,
        questions: questions.filter((q) => q.dimensionId === d.id),
      })),
    );
  });
}

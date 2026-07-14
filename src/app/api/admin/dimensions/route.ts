import { handle, ok, fail, parseJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import {
  getDimensions,
  getQuestions,
  createDimension,
} from "@/lib/data/repository";

// GET /api/admin/dimensions → all dimensions (active + archived) with their
// questions. Admin only.
export async function GET() {
  return handle(async () => {
    const me = await getCurrentUser();
    if (!me || me.type !== "ADMIN") return fail("Admin access required", 403);
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

// POST /api/admin/dimensions → create a dimension. Admin only.
export async function POST(req: Request) {
  return handle(async () => {
    const me = await getCurrentUser();
    if (!me || me.type !== "ADMIN") return fail("Admin access required", 403);
    const { name } = await parseJson<{ name?: string }>(req);
    const dimension = await createDimension(name ?? "");
    return ok(dimension, 201);
  });
}

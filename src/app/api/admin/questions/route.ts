import { handle, ok, fail, parseJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { createQuestion, ValidationError } from "@/lib/data/repository";

// POST /api/admin/questions → add a question to a dimension. Admin only.
export async function POST(req: Request) {
  return handle(async () => {
    const me = await getCurrentUser();
    if (!me || me.type !== "ADMIN") return fail("Admin access required", 403);
    const body = await parseJson<{ dimensionId?: string; text?: string }>(req);
    if (!body.dimensionId) throw new ValidationError("dimensionId is required");
    const question = await createQuestion({
      dimensionId: body.dimensionId,
      text: body.text ?? "",
    });
    return ok(question, 201);
  });
}

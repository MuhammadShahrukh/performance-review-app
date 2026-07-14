import { handle, ok, fail, parseJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { updateQuestion, deleteQuestion } from "@/lib/data/repository";

// PATCH /api/admin/questions/[id] → edit text and/or archive/restore. Admin only.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const me = await getCurrentUser();
    if (!me || me.type !== "ADMIN") return fail("Admin access required", 403);
    const { id } = await params;
    const body = await parseJson<{ text?: string; active?: boolean }>(req);
    const question = await updateQuestion(id, body);
    return ok(question);
  });
}

// DELETE /api/admin/questions/[id] → hard-delete (only if never rated). Admin only.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const me = await getCurrentUser();
    if (!me || me.type !== "ADMIN") return fail("Admin access required", 403);
    const { id } = await params;
    await deleteQuestion(id);
    return ok({ deleted: id });
  });
}

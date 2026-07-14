import { handle, ok, fail, parseJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { updateDimension, deleteDimension } from "@/lib/data/repository";

// PATCH /api/admin/dimensions/[id] → rename and/or archive/restore. Admin only.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const me = await getCurrentUser();
    if (!me || me.type !== "ADMIN") return fail("Admin access required", 403);
    const { id } = await params;
    const body = await parseJson<{ name?: string; active?: boolean }>(req);
    const dimension = await updateDimension(id, body);
    return ok(dimension);
  });
}

// DELETE /api/admin/dimensions/[id] → hard-delete (only if never rated). Admin only.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const me = await getCurrentUser();
    if (!me || me.type !== "ADMIN") return fail("Admin access required", 403);
    const { id } = await params;
    await deleteDimension(id);
    return ok({ deleted: id });
  });
}

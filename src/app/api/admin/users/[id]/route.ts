import { handle, ok, fail } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { deleteUser } from "@/lib/data/repository";

// DELETE /api/admin/users/[id] → delete a user and cascade their review data.
// Admin only; an admin cannot delete their own account.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const me = await getCurrentUser();
    if (!me || me.type !== "ADMIN") return fail("Admin access required", 403);

    const { id } = await params;
    if (id === me.id) {
      return fail("You cannot delete your own account", 400);
    }

    const summary = await deleteUser(id);
    return ok({ deleted: id, ...summary });
  });
}

import { requireAdmin } from "@/lib/auth";
import { getUsers } from "@/lib/data/repository";
import { UserAdmin } from "./user-admin";

export const metadata = { title: "Manage Users — Performance Review" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const me = await requireAdmin();
  const users = (await getUsers()).map(({ password: _pw, ...rest }) => rest);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Manage Users</h1>
        <p className="text-sm text-muted-foreground">
          Add or remove users. Deleting a user also removes all of their review
          data.
        </p>
      </div>
      <UserAdmin users={users} currentUserId={me.id} />
    </main>
  );
}

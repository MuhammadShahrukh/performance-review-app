import { cookies } from "next/headers";
import { handle, ok } from "@/lib/api";
import { SESSION_COOKIE } from "@/lib/auth";

// POST /api/auth/logout → clear the session cookie.
export async function POST() {
  return handle(async () => {
    const store = await cookies();
    store.delete(SESSION_COOKIE);
    return ok({ ok: true });
  });
}

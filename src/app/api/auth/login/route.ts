import { cookies } from "next/headers";
import { handle, ok, parseJson } from "@/lib/api";
import { verifyCredentials, SESSION_COOKIE } from "@/lib/auth";
import { fail } from "@/lib/api";

// POST /api/auth/login → validate credentials, set the session cookie.
export async function POST(req: Request) {
  return handle(async () => {
    const { email, password } = await parseJson<{
      email?: string;
      password?: string;
    }>(req);

    if (!email || !password) {
      return fail("email and password are required", 400);
    }

    const user = await verifyCredentials(email, password);
    if (!user) return fail("Invalid email or password", 401);

    const store = await cookies();
    store.set(SESSION_COOKIE, user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    return ok(user);
  });
}

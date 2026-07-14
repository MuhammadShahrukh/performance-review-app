import { handle, ok, fail, parseJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getUsers, createUser, ValidationError } from "@/lib/data/repository";
import { TEAMS } from "@/types";
import type { Role, UserType, Team } from "@/types";

const VALID_ROLES: Role[] = ["CTO", "TEAM_LEAD", "DEVELOPER"];
const VALID_TYPES: UserType[] = ["MEMBER", "ADMIN"];

// GET /api/admin/users → list ALL users (every role), admin only.
export async function GET() {
  return handle(async () => {
    const me = await getCurrentUser();
    if (!me || me.type !== "ADMIN") return fail("Admin access required", 403);
    const users = await getUsers();
    return ok(users.map(({ password: _pw, ...rest }) => rest));
  });
}

// POST /api/admin/users → create any user (admin only).
export async function POST(req: Request) {
  return handle(async () => {
    const me = await getCurrentUser();
    if (!me || me.type !== "ADMIN") return fail("Admin access required", 403);

    const body = await parseJson<{
      name?: string;
      email?: string;
      password?: string;
      type?: string;
      role?: string;
      team?: string | null;
    }>(req);

    if (!body.name?.trim()) throw new ValidationError("name is required");
    if (!body.email?.trim()) throw new ValidationError("email is required");
    if (!body.password) throw new ValidationError("password is required");
    if (!body.role || !VALID_ROLES.includes(body.role as Role)) {
      throw new ValidationError(`role must be one of ${VALID_ROLES.join(", ")}`);
    }
    const type: UserType = (body.type as UserType) ?? "MEMBER";
    if (!VALID_TYPES.includes(type)) {
      throw new ValidationError(`type must be one of ${VALID_TYPES.join(", ")}`);
    }

    let team: Team | null = null;
    if (body.team != null && body.team !== "") {
      if (!TEAMS.includes(body.team as Team)) {
        throw new ValidationError(`team must be one of ${TEAMS.join(", ")}`);
      }
      team = body.team as Team;
    }

    const user = await createUser({
      name: body.name.trim(),
      email: body.email.trim(),
      password: body.password,
      type,
      role: body.role as Role,
      team,
    });
    const { password: _pw, ...safe } = user;
    return ok(safe, 201);
  });
}

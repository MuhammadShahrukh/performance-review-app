import { handle, ok, parseJson } from "@/lib/api";
import { getEmployees, createUser } from "@/lib/data/repository";
import { ValidationError } from "@/lib/data/repository";
import type { Role } from "@/types";

const VALID_ROLES: Role[] = ["TEAM_LEAD", "CTO", "EMPLOYEE"];

// GET /api/users → list all employees (the people who get rated)
export async function GET() {
  return handle(async () => {
    const employees = await getEmployees();
    // Never leak password hashes.
    return ok(employees.map(({ password: _pw, ...rest }) => rest));
  });
}

// POST /api/users → create a new user
export async function POST(req: Request) {
  return handle(async () => {
    const body = await parseJson<{
      name?: string;
      email?: string;
      password?: string;
      role?: string;
    }>(req);

    if (!body.name?.trim()) throw new ValidationError("name is required");
    if (!body.email?.trim()) throw new ValidationError("email is required");
    if (!body.password) throw new ValidationError("password is required");
    if (!body.role || !VALID_ROLES.includes(body.role as Role)) {
      throw new ValidationError(
        `role must be one of ${VALID_ROLES.join(", ")}`,
      );
    }

    const user = await createUser({
      name: body.name.trim(),
      email: body.email.trim(),
      password: body.password,
      role: body.role as Role,
    });
    const { password: _pw, ...safe } = user;
    return ok(safe, 201);
  });
}

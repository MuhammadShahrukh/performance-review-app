// Lightweight cookie-based auth stub.
//
// This is intentionally simple: a signed-in user's id is stored in an httpOnly
// cookie, and getCurrentUser() looks it up in the repository. Passwords are
// compared in plaintext (fine for a local, DB-less demo).
//
// SWAP LATER: when NextAuth v5 is wired, replace getCurrentUser() with
// `auth()` from the NextAuth config and delete the login/logout API routes.
// Page-level role guards (requireRole) will keep working unchanged.

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserById, getUserByEmail } from "@/lib/data/repository";
import type { Role, User } from "@/types";

export const SESSION_COOKIE = "session_user";

export type SafeUser = Omit<User, "password">;

function toSafe(user: User): SafeUser {
  const { password: _pw, ...rest } = user;
  return rest;
}

/** Validate credentials. Returns the user (without password) or null. */
export async function verifyCredentials(
  email: string,
  password: string,
): Promise<SafeUser | null> {
  const user = await getUserByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.password)) return null;
  return toSafe(user);
}

/** Read the current session user from the cookie, or null if signed out. */
export async function getCurrentUser(): Promise<SafeUser | null> {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const user = await getUserById(id);
  return user ? toSafe(user) : null;
}

/** Require a signed-in user; redirect to /login otherwise. */
export async function requireUser(): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Require a signed-in user with one of the allowed roles.
 * Wrong role → bounced to their own home. Signed out → /login.
 */
export async function requireRole(...roles: Role[]): Promise<SafeUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect(homePathForRole(user.role));
  return user;
}

/** Where each role lands after login. */
export function homePathForRole(role: Role): string {
  switch (role) {
    case "TEAM_LEAD":
      return "/dashboard";
    case "CTO":
      return "/appraisals";
    case "DEVELOPER":
      return "/me";
  }
}

/** Whether a user has system-admin access (manage users, config, etc.). */
export function isAdmin(user: { type: SafeUser["type"] } | null): boolean {
  return user?.type === "ADMIN";
}

/** Require a signed-in ADMIN; non-admins are bounced to their own home. */
export async function requireAdmin(): Promise<SafeUser> {
  const user = await requireUser();
  if (user.type !== "ADMIN") redirect(homePathForRole(user.role));
  return user;
}

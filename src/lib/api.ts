// Shared helpers for route handlers: JSON responses and error→status mapping.

import { NextResponse } from "next/server";
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from "@/lib/data/repository";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Wrap a handler body so thrown typed errors become the right HTTP status.
 * Usage:
 *   export const POST = (req) => handle(async () => { ... return ok(x) })
 */
export async function handle(
  fn: () => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ValidationError) return fail(err.message, 400);
    if (err instanceof NotFoundError) return fail(err.message, 404);
    if (err instanceof ConflictError) return fail(err.message, 409);
    console.error("Unhandled API error:", err);
    return fail("Internal server error", 500);
  }
}

/** Parse a JSON body, throwing a ValidationError on malformed input. */
export async function parseJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ValidationError("Request body must be valid JSON");
  }
}

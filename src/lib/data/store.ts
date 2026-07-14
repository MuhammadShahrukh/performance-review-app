// Low-level JSON persistence.
//
// This is the ONLY module that touches the filesystem. The repository layer
// (repository.ts) builds domain operations on top of it. When we move to a
// real database, we replace repository.ts internals with Prisma calls and
// delete this file — API routes, grading, and pages stay untouched.

import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

export type Collection =
  | "users"
  | "dimensions"
  | "questions"
  | "monthlyEntries"
  | "answers"
  | "appraisals";

// Serialize writes per collection so concurrent requests don't clobber the
// file (read-modify-write is not atomic). Each write chains onto the previous.
const writeChains = new Map<Collection, Promise<unknown>>();

function filePath(name: Collection): string {
  return path.join(DATA_DIR, `${name}.json`);
}

export async function readCollection<T>(name: Collection): Promise<T[]> {
  try {
    const raw = await fs.readFile(filePath(name), "utf-8");
    return JSON.parse(raw) as T[];
  } catch (err: unknown) {
    // Missing file → empty collection (first write will create it).
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

export async function writeCollection<T>(
  name: Collection,
  rows: T[],
): Promise<void> {
  const prev = writeChains.get(name) ?? Promise.resolve();
  const next = prev
    .catch(() => {}) // don't let a prior failure break this write
    .then(async () => {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(filePath(name), JSON.stringify(rows, null, 2) + "\n");
    });
  writeChains.set(name, next);
  return next;
}

// Collision-resistant id: prefix + timestamp + random suffix.
// (Math.random is fine here — these ids are not security-sensitive.)
export function generateId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}${rand}`;
}

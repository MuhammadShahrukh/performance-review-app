// Repository-backed convenience wrapper around the pure grading engine.
// Pulls the records a developer's yearly summary needs, then delegates the
// math to computeYearlySummary.

import {
  getDimensions,
  getQuestions,
  getEntriesForDeveloper,
  getAnswersForEntries,
} from "@/lib/data/repository";
import { computeYearlySummary } from "@/lib/grading";
import type { YearlySummary } from "@/types";

export async function buildYearlySummary(
  developerId: string,
  year: number,
): Promise<YearlySummary> {
  const [dimensions, questions, entries] = await Promise.all([
    getDimensions(),
    getQuestions(),
    getEntriesForDeveloper(developerId, year),
  ]);
  const answers = await getAnswersForEntries(entries.map((e) => e.id));

  return computeYearlySummary({
    developerId,
    year,
    dimensions,
    questions,
    entries,
    answers,
  });
}

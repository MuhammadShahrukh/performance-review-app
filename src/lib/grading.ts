// Grading engine.
//
// Pure functions only — no I/O — so they're trivially testable. The algorithm
// follows README.md → "How the Final Grade is Calculated":
//
//   Step 1: For each question, average its scores across available months.
//   Step 2: For each dimension, average its question averages → dimension grade.
//   Step 3: Average all dimension grades → final yearly score.
//   Step 4: Map the final score to a descriptive grade via thresholds.
//
// Missing months are simply absent from the data, so they never enter an
// average — no penalty. Dimensions with zero answers are excluded from the
// final average rather than counted as zero.

import {
  GRADE_SCORE,
  type Grade,
  type Question,
  type MonthlyEntry,
  type MonthlyEntryAnswer,
  type Dimension,
  type DimensionBreakdown,
  type YearlySummary,
  type Recommendation,
} from "@/types";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Threshold map: 2.5–3.0 → EXCEEDS, 1.5–2.49 → MEETS, 1.0–1.49 → BELOW. */
export function scoreToGrade(score: number): Grade {
  if (score >= 2.5) return "EXCEEDS";
  if (score >= 1.5) return "MEETS";
  return "BELOW";
}

/** System recommendation derived from the final grade. */
export function gradeToRecommendation(grade: Grade): Recommendation {
  switch (grade) {
    case "EXCEEDS":
      return "STRONGLY_RECOMMEND";
    case "MEETS":
      return "RECOMMEND";
    case "BELOW":
      return "DO_NOT_RECOMMEND";
  }
}

const average = (nums: number[]): number =>
  nums.reduce((s, n) => s + n, 0) / nums.length;

/**
 * Compute a developer's yearly summary from raw records.
 *
 * @param entries  monthly entries for ONE developer in ONE year
 * @param answers  answers belonging to those entries
 */
export function computeYearlySummary(params: {
  developerId: string;
  year: number;
  dimensions: Dimension[];
  questions: Question[];
  entries: MonthlyEntry[];
  answers: MonthlyEntryAnswer[];
}): YearlySummary {
  const { developerId, year, dimensions, questions, entries, answers } = params;

  const entryIds = new Set(entries.map((e) => e.id));
  const relevant = answers.filter((a) => entryIds.has(a.monthlyEntryId));

  // Step 1: average each question's score across the months it was answered.
  const scoresByQuestion = new Map<string, number[]>();
  for (const ans of relevant) {
    const arr = scoresByQuestion.get(ans.questionId) ?? [];
    arr.push(GRADE_SCORE[ans.grade]);
    scoresByQuestion.set(ans.questionId, arr);
  }
  const questionAverages = new Map<string, number>();
  for (const [qId, scores] of scoresByQuestion) {
    questionAverages.set(qId, average(scores));
  }

  // Step 2: per-dimension average of its answered questions.
  // Keep the raw (unrounded) average alongside the display-rounded one so the
  // final score doesn't compound rounding error.
  const breakdown: DimensionBreakdown[] = [];
  const dimRawAverages: number[] = [];
  for (const dim of dimensions) {
    const dimQuestionIds = questions
      .filter((q) => q.dimensionId === dim.id)
      .map((q) => q.id);
    const answeredAverages = dimQuestionIds
      .map((qId) => questionAverages.get(qId))
      .filter((v): v is number => v !== undefined);

    if (answeredAverages.length === 0) continue; // no data for this dimension

    const raw = average(answeredAverages);
    dimRawAverages.push(raw);
    breakdown.push({
      dimensionId: dim.id,
      dimensionName: dim.name,
      average: round2(raw),
    });
  }

  // Step 3 + 4: average the RAW dimension grades, then map to descriptive grade.
  const finalScore = dimRawAverages.length ? round2(average(dimRawAverages)) : 0;
  const finalGrade = scoreToGrade(finalScore);

  const monthsIncluded = [...new Set(entries.map((e) => e.month))].sort(
    (a, b) => a - b,
  );

  return {
    developerId,
    year,
    monthsIncluded,
    dimensions: breakdown,
    finalScore,
    finalGrade,
    recommendation: gradeToRecommendation(finalGrade),
  };
}

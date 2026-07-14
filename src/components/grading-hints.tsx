// Small, reusable explainer panels for how grading works.
// Used inline on the entry/appraisal screens and inside the full /guide page.

import { GradeBadge } from "@/components/grade-badge";
import type { Grade } from "@/types";

const GRADE_MEANING: { grade: Grade; score: number; blurb: string }[] = [
  {
    grade: "EXCEEDS",
    score: 3,
    blurb: "Consistently goes beyond what the role expects.",
  },
  {
    grade: "MEETS",
    score: 2,
    blurb: "Solidly delivers what the role expects.",
  },
  {
    grade: "BELOW",
    score: 1,
    blurb: "Falls short this month; needs improvement.",
  },
];

const THRESHOLDS: {
  range: string;
  grade: Grade;
  recommendation: string;
}[] = [
  { range: "2.50 – 3.00", grade: "EXCEEDS", recommendation: "Strongly Recommend Appraisal" },
  { range: "1.50 – 2.49", grade: "MEETS", recommendation: "Recommend Appraisal" },
  { range: "1.00 – 1.49", grade: "BELOW", recommendation: "Do Not Recommend" },
];

/** The 3-point scale — shown where a rater picks grades (entry form). */
export function GradeScaleHint() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="mb-3 text-sm font-medium">What the grades mean</p>
      <ul className="flex flex-col gap-2.5">
        {GRADE_MEANING.map((g) => (
          <li key={g.grade} className="flex items-center gap-3 text-sm">
            <GradeBadge grade={g.grade} short />
            <span className="text-muted-foreground">
              <span className="font-mono text-foreground">= {g.score}</span> ·{" "}
              {g.blurb}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        Answer all 12 questions to submit the month. One entry per person per
        month.
      </p>
    </div>
  );
}

/** Thresholds + recommendation mapping — shown on the appraisal detail. */
export function ThresholdHint() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="mb-3 text-sm font-medium">How the final grade is decided</p>
      <div className="flex flex-col gap-2">
        {THRESHOLDS.map((t) => (
          <div key={t.grade} className="flex items-center gap-3 text-sm">
            <span className="w-24 font-mono text-muted-foreground">
              {t.range}
            </span>
            <GradeBadge grade={t.grade} short />
            <span className="text-xs text-muted-foreground">
              → {t.recommendation}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        The score is the average of the four dimension scores, which are each
        the average of their questions across all submitted months. Missing
        months are excluded.
      </p>
    </div>
  );
}

export { GRADE_MEANING, THRESHOLDS };

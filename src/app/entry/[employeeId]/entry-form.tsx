"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { GRADE_SHORT, MONTH_NAMES } from "@/lib/labels";
import type { Grade } from "@/types";

interface DimensionWithQuestions {
  id: string;
  name: string;
  questions: { id: string; text: string }[];
}
interface ExistingEntry {
  month: number;
  year: number;
  grades: Record<string, Grade>;
}

const GRADES: Grade[] = ["EXCEEDS", "MEETS", "BELOW"];
const GRADE_BTN: Record<Grade, string> = {
  EXCEEDS:
    "data-[on=true]:bg-emerald-600 data-[on=true]:text-white data-[on=true]:border-emerald-600",
  MEETS:
    "data-[on=true]:bg-sky-600 data-[on=true]:text-white data-[on=true]:border-sky-600",
  BELOW:
    "data-[on=true]:bg-amber-600 data-[on=true]:text-white data-[on=true]:border-amber-600",
};

export function EntryForm({
  employeeId,
  dimensions,
  existing,
  defaultMonth,
  defaultYear,
}: {
  employeeId: string;
  dimensions: DimensionWithQuestions[];
  existing: ExistingEntry[];
  defaultMonth: number;
  defaultYear: number;
}) {
  const router = useRouter();
  const [month, setMonth] = useState(defaultMonth);
  const [year] = useState(defaultYear);
  const [grades, setGrades] = useState<Record<string, Grade>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const allQuestions = useMemo(
    () => dimensions.flatMap((d) => d.questions),
    [dimensions],
  );

  // Is this month/year already submitted? If so, render it read-only.
  const submitted = existing.find((e) => e.month === month && e.year === year);
  const readOnly = Boolean(submitted);
  const effectiveGrades = submitted ? submitted.grades : grades;

  const answeredCount = Object.keys(effectiveGrades).length;
  const complete = answeredCount === allQuestions.length;

  function setGrade(questionId: string, grade: Grade) {
    if (readOnly) return;
    setGrades((prev) => ({ ...prev, [questionId]: grade }));
  }

  async function submit() {
    setError(null);
    if (!complete) {
      setError("Please answer all 12 questions before submitting.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          developerId: employeeId,
          month,
          year,
          answers: allQuestions.map((q) => ({
            questionId: q.id,
            grade: grades[q.id],
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to submit entry");
        return;
      }
      router.push(`/developer/${employeeId}`);
      router.refresh();
    } catch {
      setError("Network error — is the server running?");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Period selector */}
      <div className="flex items-center gap-3 rounded-lg border bg-white p-4 dark:bg-zinc-950">
        <label className="text-sm font-medium">Period</label>
        <select
          value={month}
          onChange={(e) => {
            setMonth(Number(e.target.value));
            setGrades({});
            setError(null);
          }}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        >
          {MONTH_NAMES.map((name, i) => (
            <option key={i} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
        <span className="text-sm text-zinc-600 dark:text-zinc-400">{year}</span>
        {readOnly && (
          <span className="ml-auto rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            Already submitted — read only
          </span>
        )}
      </div>

      {dimensions.map((dim) => (
        <Card key={dim.id}>
          <CardHeader>
            <CardTitle className="text-base">{dim.name}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {dim.questions.map((q) => (
              <div
                key={q.id}
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-sm">{q.text}</span>
                <div className="flex shrink-0 gap-1">
                  {GRADES.map((g) => {
                    const on = effectiveGrades[q.id] === g;
                    return (
                      <button
                        key={g}
                        type="button"
                        data-on={on}
                        disabled={readOnly}
                        onClick={() => setGrade(q.id, g)}
                        className={cn(
                          "h-8 rounded-md border px-3 text-xs font-medium transition-colors",
                          "disabled:cursor-default",
                          !on &&
                            "border-input text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
                          GRADE_BTN[g],
                        )}
                      >
                        {GRADE_SHORT[g]}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {error && (
        <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
      )}

      {!readOnly && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-500">
            {answeredCount} / {allQuestions.length} answered
          </span>
          <Button onClick={submit} disabled={saving || !complete}>
            {saving ? "Submitting…" : "Submit entry"}
          </Button>
        </div>
      )}
    </div>
  );
}

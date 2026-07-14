import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { GRADE_LABEL, GRADE_SHORT, DECISION_LABEL } from "@/lib/labels";
import type { Grade, Decision } from "@/types";

const GRADE_CLASSES: Record<Grade, string> = {
  EXCEEDS:
    "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  MEETS:
    "border-transparent bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  BELOW:
    "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

export function GradeBadge({
  grade,
  short = false,
  className,
}: {
  grade: Grade;
  short?: boolean;
  className?: string;
}) {
  return (
    <Badge className={cn(GRADE_CLASSES[grade], className)}>
      {short ? GRADE_SHORT[grade] : GRADE_LABEL[grade]}
    </Badge>
  );
}

const DECISION_CLASSES: Record<Decision, string> = {
  PENDING:
    "border-transparent bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  APPROVED:
    "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  REJECTED:
    "border-transparent bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
};

export function DecisionBadge({ decision }: { decision: Decision }) {
  return (
    <Badge className={DECISION_CLASSES[decision]}>
      {DECISION_LABEL[decision]}
    </Badge>
  );
}

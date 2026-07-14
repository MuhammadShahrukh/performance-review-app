import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { GRADE_LABEL, GRADE_SHORT, DECISION_LABEL, TEAM_LABEL } from "@/lib/labels";
import type { Grade, Decision, Team } from "@/types";

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

const TEAM_CLASSES: Record<Team, string> = {
  API: "border-transparent bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  CRM: "border-transparent bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
  HRM: "border-transparent bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  UI: "border-transparent bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300",
};

export function TeamBadge({ team }: { team: Team | null }) {
  if (!team) {
    return (
      <Badge className="border-transparent bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
        —
      </Badge>
    );
  }
  return <Badge className={TEAM_CLASSES[team]}>{TEAM_LABEL[team]}</Badge>;
}

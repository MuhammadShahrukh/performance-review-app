import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getAppraisalById, getUserById } from "@/lib/data/repository";
import { buildYearlySummary } from "@/lib/summary";
import { GradeBadge, DecisionBadge } from "@/components/grade-badge";
import { ThresholdHint } from "@/components/grading-hints";
import { DecisionForm } from "./decision-form";
import { ButtonLink } from "@/components/ui/button-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RECOMMENDATION_LABEL, monthName } from "@/lib/labels";

export const metadata = { title: "Appraisal — Performance Review" };
export const dynamic = "force-dynamic";

export default async function AppraisalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("CTO");
  const { id } = await params;

  const appraisal = await getAppraisalById(id);
  if (!appraisal) notFound();

  const [employee, summary] = await Promise.all([
    getUserById(appraisal.developerId),
    buildYearlySummary(appraisal.developerId, appraisal.year),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{employee?.name}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {appraisal.year} appraisal
          </p>
        </div>
        <ButtonLink href="/appraisals" variant="ghost" size="sm">
          ← Back
        </ButtonLink>
      </div>

      <div className="flex flex-col gap-6">
        {/* Final grade + breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Yearly Grade</CardTitle>
            <CardDescription>
              Averaged over {summary.monthsIncluded.length} month
              {summary.monthsIncluded.length === 1 ? "" : "s"}
              {summary.monthsIncluded.length > 0 &&
                `: ${summary.monthsIncluded.map(monthName).join(", ")}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 flex items-center gap-4">
              <div className="bg-gradient-to-br from-indigo-600 to-violet-600 bg-clip-text text-4xl font-bold tabular-nums text-transparent dark:from-indigo-400 dark:to-violet-400">
                {summary.finalScore.toFixed(2)}
              </div>
              <div className="flex flex-col gap-1">
                <GradeBadge grade={summary.finalGrade} />
                <span className="text-xs text-zinc-500">
                  System: {RECOMMENDATION_LABEL[summary.recommendation]}
                </span>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dimension</TableHead>
                  <TableHead className="text-right">Average</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.dimensions.map((d) => (
                  <TableRow key={d.dimensionId}>
                    <TableCell>{d.dimensionName}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {d.average.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-5">
              <ThresholdHint />
            </div>
          </CardContent>
        </Card>

        {/* Decision */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Decision</CardTitle>
            <CardDescription className="flex items-center gap-2">
              Current status: <DecisionBadge decision={appraisal.decision} />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DecisionForm
              appraisalId={appraisal.id}
              currentDecision={appraisal.decision}
              currentNote={appraisal.ctoNote}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

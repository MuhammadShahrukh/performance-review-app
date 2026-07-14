import { requireRole } from "@/lib/auth";
import { getEmployees, getAppraisals } from "@/lib/data/repository";
import { buildYearlySummary } from "@/lib/summary";
import { ButtonLink } from "@/components/ui/button-link";
import { GradeBadge, DecisionBadge } from "@/components/grade-badge";
import { GenerateButton } from "./generate-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RECOMMENDATION_LABEL } from "@/lib/labels";

export const metadata = { title: "Appraisals — Performance Review" };
export const dynamic = "force-dynamic";

export default async function AppraisalsPage() {
  await requireRole("CTO");

  const year = new Date().getFullYear();
  const [employees, appraisals] = await Promise.all([
    getEmployees(),
    getAppraisals(),
  ]);

  const rows = await Promise.all(
    employees.map(async (emp) => {
      const summary = await buildYearlySummary(emp.id, year);
      const appraisal =
        appraisals.find((a) => a.developerId === emp.id && a.year === year) ??
        null;
      return { emp, summary, appraisal };
    }),
  );

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Appraisals {year}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Yearly grades computed from monthly data. Review and decide.
        </p>
      </div>

      <div className="rounded-lg border bg-white dark:bg-zinc-950">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Recommendation</TableHead>
              <TableHead>Decision</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ emp, summary, appraisal }) => {
              const hasData = summary.monthsIncluded.length > 0;
              return (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">{emp.name}</TableCell>
                  <TableCell className="tabular-nums">
                    {hasData ? summary.finalScore.toFixed(2) : "—"}
                  </TableCell>
                  <TableCell>
                    {hasData ? <GradeBadge grade={summary.finalGrade} short /> : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                    {hasData ? RECOMMENDATION_LABEL[summary.recommendation] : "No data"}
                  </TableCell>
                  <TableCell>
                    {appraisal ? (
                      <DecisionBadge decision={appraisal.decision} />
                    ) : (
                      <span className="text-xs text-zinc-500">Not generated</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {appraisal ? (
                      <ButtonLink href={`/appraisals/${appraisal.id}`} size="sm">
                        Review
                      </ButtonLink>
                    ) : hasData ? (
                      <GenerateButton developerId={emp.id} year={year} />
                    ) : (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-sm text-zinc-500"
                >
                  No employees yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}

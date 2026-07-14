import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import {
  getUserById,
  getDimensions,
  getQuestions,
  getEntriesForDeveloper,
  getAnswersForEntries,
} from "@/lib/data/repository";
import { computeYearlySummary } from "@/lib/grading";
import { GradeBadge } from "@/components/grade-badge";
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

export const metadata = { title: "Employee History — Performance Review" };
export const dynamic = "force-dynamic";

export default async function DeveloperPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("TEAM_LEAD", "CTO");
  const { id } = await params;

  const employee = await getUserById(id);
  if (!employee || employee.role !== "EMPLOYEE") notFound();

  const year = new Date().getFullYear();
  const [dimensions, questions, entries] = await Promise.all([
    getDimensions(),
    getQuestions(),
    getEntriesForDeveloper(id, year),
  ]);
  const answers = await getAnswersForEntries(entries.map((e) => e.id));

  const summary = computeYearlySummary({
    developerId: id,
    year,
    dimensions,
    questions,
    entries,
    answers,
  });

  // Per-month overall grade (reuse the engine on a single month's data).
  const monthly = entries
    .slice()
    .sort((a, b) => a.month - b.month)
    .map((e) => {
      const s = computeYearlySummary({
        developerId: id,
        year,
        dimensions,
        questions,
        entries: [e],
        answers,
      });
      return { month: e.month, summary: s };
    });

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{employee.name}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {employee.email} · {year} review
          </p>
        </div>
        <ButtonLink href="/dashboard" variant="ghost" size="sm">
          ← Back
        </ButtonLink>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-zinc-500">
            No monthly entries recorded for {year} yet.
            <div className="mt-4">
              <ButtonLink href={`/entry/${id}`} size="sm">
                Add first entry
              </ButtonLink>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Yearly summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Yearly Summary</CardTitle>
              <CardDescription>
                Averaged over {summary.monthsIncluded.length} month
                {summary.monthsIncluded.length === 1 ? "" : "s"}:{" "}
                {summary.monthsIncluded.map(monthName).join(", ")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 flex items-center gap-4">
                <div className="text-3xl font-semibold tabular-nums">
                  {summary.finalScore.toFixed(2)}
                </div>
                <div className="flex flex-col gap-1">
                  <GradeBadge grade={summary.finalGrade} />
                  <span className="text-xs text-zinc-500">
                    {RECOMMENDATION_LABEL[summary.recommendation]}
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
            </CardContent>
          </Card>

          {/* Month-by-month */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monthly Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead className="text-right">Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthly.map(({ month, summary: s }) => (
                    <TableRow key={month}>
                      <TableCell>{monthName(month)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {s.finalScore.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <GradeBadge grade={s.finalGrade} short />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}

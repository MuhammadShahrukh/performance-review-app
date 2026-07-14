import { requireRole } from "@/lib/auth";
import {
  getDimensions,
  getQuestions,
  getEntriesForDeveloper,
  getAnswersForEntries,
} from "@/lib/data/repository";
import { computeYearlySummary } from "@/lib/grading";
import { GradeBadge } from "@/components/grade-badge";
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

export const metadata = { title: "My Reviews — Performance Review" };
export const dynamic = "force-dynamic";

// Minimal employee self-view (future role). Read-only summary of own ratings.
export default async function MyReviewsPage() {
  const user = await requireRole("DEVELOPER");

  const year = new Date().getFullYear();
  const [dimensions, questions, entries] = await Promise.all([
    getDimensions(),
    getQuestions(),
    getEntriesForDeveloper(user.id, year),
  ]);
  const answers = await getAnswersForEntries(entries.map((e) => e.id));
  const summary = computeYearlySummary({
    developerId: user.id,
    year,
    dimensions,
    questions,
    entries,
    answers,
  });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">My Reviews</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {user.name} · {year}
        </p>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-zinc-500">
            No ratings recorded for {year} yet.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Yearly Summary</CardTitle>
            <CardDescription>
              Based on {summary.monthsIncluded.length} month
              {summary.monthsIncluded.length === 1 ? "" : "s"}:{" "}
              {summary.monthsIncluded.map(monthName).join(", ")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 flex items-center gap-4">
              <div className="bg-gradient-to-br from-sky-600 to-blue-600 bg-clip-text text-4xl font-bold tabular-nums text-transparent dark:from-sky-400 dark:to-blue-400">
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
      )}
    </main>
  );
}

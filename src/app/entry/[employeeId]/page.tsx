import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { canAccessEmployee } from "@/lib/access";
import {
  getUserById,
  getActiveDimensions,
  getActiveQuestions,
  getEntriesForDeveloper,
  getAnswersForEntries,
} from "@/lib/data/repository";
import { EntryForm } from "./entry-form";
import { ButtonLink } from "@/components/ui/button-link";

export const metadata = { title: "Monthly Entry — Performance Review" };
export const dynamic = "force-dynamic";

export default async function EntryPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const user = await requireRole("TEAM_LEAD");
  const { employeeId } = await params;

  const employee = await getUserById(employeeId);
  if (!employee || employee.role !== "DEVELOPER") notFound();
  // A Team Lead may only rate their own team's employees.
  if (!canAccessEmployee(user, employee)) redirect("/dashboard");

  const now = new Date();
  const year = now.getFullYear();

  const [dimensions, questions, entries] = await Promise.all([
    getActiveDimensions(),
    getActiveQuestions(),
    getEntriesForDeveloper(employeeId, year),
  ]);
  const answers = await getAnswersForEntries(entries.map((e) => e.id));

  // Build the set of already-submitted months (with their grades) for this year.
  const existing = entries.map((e) => ({
    month: e.month,
    year: e.year,
    grades: Object.fromEntries(
      answers
        .filter((a) => a.monthlyEntryId === e.id)
        .map((a) => [a.questionId, a.grade]),
    ),
  }));

  const dimensionsWithQuestions = dimensions.map((d) => ({
    ...d,
    questions: questions.filter((q) => q.dimensionId === d.id),
  }));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Monthly Rating</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {employee.name}
          </p>
        </div>
        <ButtonLink href="/dashboard" variant="ghost" size="sm">
          ← Back to dashboard
        </ButtonLink>
      </div>

      <EntryForm
        employeeId={employee.id}
        dimensions={dimensionsWithQuestions}
        existing={existing}
        defaultMonth={now.getMonth() + 1}
        defaultYear={year}
      />
    </main>
  );
}

import { requireAdmin } from "@/lib/auth";
import { getDimensions, getQuestions } from "@/lib/data/repository";
import { QuestionnaireAdmin } from "./questionnaire-admin";

export const metadata = { title: "Questionnaire — Performance Review" };
export const dynamic = "force-dynamic";

export default async function AdminQuestionsPage() {
  await requireAdmin();
  const [dimensions, questions] = await Promise.all([
    getDimensions(),
    getQuestions(),
  ]);

  const data = dimensions.map((d) => ({
    ...d,
    questions: questions.filter((q) => q.dimensionId === d.id),
  }));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Questionnaire</h1>
        <p className="text-sm text-muted-foreground">
          Manage the dimensions and questions used in monthly ratings. Archiving
          hides an item from new entries but keeps past ratings intact.
        </p>
      </div>
      <QuestionnaireAdmin dimensions={data} />
    </main>
  );
}

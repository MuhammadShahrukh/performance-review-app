import { handle, ok } from "@/lib/api";
import { getDevelopers, getAppraisals } from "@/lib/data/repository";
import { buildYearlySummary } from "@/lib/summary";

// GET /api/appraisals?year=2026 → every employee with their computed yearly
// summary and the stored appraisal (decision) if one has been generated.
export async function GET(req: Request) {
  return handle(async () => {
    const yearParam = new URL(req.url).searchParams.get("year");
    const year = yearParam ? Number(yearParam) : new Date().getFullYear();

    const [employees, appraisals] = await Promise.all([
      getDevelopers(),
      getAppraisals(),
    ]);

    const rows = await Promise.all(
      employees.map(async (emp) => {
        const summary = await buildYearlySummary(emp.id, year);
        const appraisal =
          appraisals.find(
            (a) => a.developerId === emp.id && a.year === year,
          ) ?? null;
        return {
          employee: { id: emp.id, name: emp.name, email: emp.email },
          summary,
          appraisal,
        };
      }),
    );

    return ok({ year, rows });
  });
}

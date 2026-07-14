import { handle, ok, parseJson } from "@/lib/api";
import {
  getAppraisalById,
  getUserById,
  decideAppraisal,
  ValidationError,
  NotFoundError,
} from "@/lib/data/repository";
import { buildYearlySummary } from "@/lib/summary";
import type { Decision } from "@/types";

// GET /api/appraisals/[id] → full detail: appraisal + employee + dimension
// breakdown (recomputed live from monthly data).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const { id } = await params;
    const appraisal = await getAppraisalById(id);
    if (!appraisal) throw new NotFoundError(`Appraisal ${id} not found`);

    const [employee, summary] = await Promise.all([
      getUserById(appraisal.developerId),
      buildYearlySummary(appraisal.developerId, appraisal.year),
    ]);

    return ok({
      appraisal,
      employee: employee
        ? { id: employee.id, name: employee.name, email: employee.email }
        : null,
      summary,
    });
  });
}

// PUT /api/appraisals/[id] → CTO approves or rejects with an optional note.
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const { id } = await params;
    const body = await parseJson<{ decision?: string; ctoNote?: string }>(req);

    const decision = body.decision as Decision;
    if (decision !== "APPROVED" && decision !== "REJECTED") {
      throw new ValidationError("decision must be APPROVED or REJECTED");
    }

    const updated = await decideAppraisal(
      id,
      decision,
      body.ctoNote?.trim() || null,
    );
    return ok(updated);
  });
}

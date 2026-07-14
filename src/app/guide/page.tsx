import { requireUser } from "@/lib/auth";
import {
  getActiveDimensions,
  getActiveQuestions,
} from "@/lib/data/repository";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GradeScaleHint, ThresholdHint } from "@/components/grading-hints";
import { ROLE_LABEL } from "@/lib/labels";

export const metadata = { title: "Guide — Performance Review" };
export const dynamic = "force-dynamic";

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-xs font-semibold text-indigo-400">
        {n}
      </span>
      <span className="text-sm text-muted-foreground">{children}</span>
    </li>
  );
}

export default async function GuidePage() {
  const user = await requireUser();
  const [dimensions, questions] = await Promise.all([
    getActiveDimensions(),
    getActiveQuestions(),
  ]);

  const isAdmin = user.type === "ADMIN";
  const isCTO = user.role === "CTO";
  const isTeamLead = user.role === "TEAM_LEAD";
  const isDeveloper = user.role === "DEVELOPER";

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Guide</h1>
        <p className="text-sm text-muted-foreground">
          How performance ratings work · viewing as {ROLE_LABEL[user.role]}
          {isAdmin ? " · Admin" : ""}
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {/* ── Shared: how rating works ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How rating works</CardTitle>
            <CardDescription>
              Every developer is rated monthly across 4 dimensions, 3 questions
              each — 12 questions in total. At year end those months are averaged
              into a single yearly grade.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <GradeScaleHint />

            <div>
              <p className="mb-3 text-sm font-medium">
                The 4 dimensions &amp; their questions
              </p>
              <div className="flex flex-col gap-4">
                {dimensions.map((dim) => (
                  <div key={dim.id}>
                    <p className="text-sm font-medium text-indigo-400">
                      {dim.name}
                    </p>
                    <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
                      {questions
                        .filter((q) => q.dimensionId === dim.id)
                        .map((q) => (
                          <li key={q.id}>{q.text}</li>
                        ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-medium">
                From monthly answers to a yearly grade
              </p>
              <ol className="flex flex-col gap-2">
                <Step n={1}>
                  Each <strong className="text-foreground">question</strong> is
                  averaged across every month it was answered.
                </Step>
                <Step n={2}>
                  Each <strong className="text-foreground">dimension</strong> is
                  the average of its 3 questions.
                </Step>
                <Step n={3}>
                  The <strong className="text-foreground">final score</strong> is
                  the average of the 4 dimensions (all equal weight).
                </Step>
                <Step n={4}>
                  The score maps to a descriptive grade using the thresholds
                  below.
                </Step>
              </ol>
              <p className="mt-3 text-xs text-muted-foreground">
                Missing months are simply left out of the averages — no penalty
                is applied.
              </p>
            </div>

            <ThresholdHint />
          </CardContent>
        </Card>

        {/* ── Team Lead ── */}
        {isTeamLead && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">For Team Leads</CardTitle>
              <CardDescription>Entering monthly ratings</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col gap-2">
                <Step n={1}>
                  Your <strong className="text-foreground">Dashboard</strong>{" "}
                  lists only the developers on your team, with each person&apos;s
                  status for the current month.
                </Step>
                <Step n={2}>
                  Click <strong className="text-foreground">Rate</strong> to open
                  the 12-question form, choose a grade for each question, and
                  submit.
                </Step>
                <Step n={3}>
                  A submitted month becomes{" "}
                  <strong className="text-foreground">read-only</strong> — one
                  entry per person per month. Use{" "}
                  <strong className="text-foreground">History</strong> to review
                  the full breakdown and monthly trend.
                </Step>
              </ol>
            </CardContent>
          </Card>
        )}

        {/* ── CTO ── */}
        {isCTO && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">For the CTO</CardTitle>
              <CardDescription>Reviewing appraisals</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col gap-2">
                <Step n={1}>
                  <strong className="text-foreground">Appraisals</strong> shows
                  every developer across all teams with their computed yearly
                  grade and the system recommendation.
                </Step>
                <Step n={2}>
                  Generate an appraisal to lock in the yearly grade, then open{" "}
                  <strong className="text-foreground">Review</strong> to see the
                  per-dimension breakdown.
                </Step>
                <Step n={3}>
                  <strong className="text-foreground">Approve</strong> or{" "}
                  <strong className="text-foreground">Reject</strong> with an
                  optional note. The recommendation is guidance only — your
                  decision is final.
                </Step>
              </ol>
            </CardContent>
          </Card>
        )}

        {/* ── Admin ── */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">For Admins</CardTitle>
              <CardDescription>Managing users</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col gap-2">
                <Step n={1}>
                  <strong className="text-foreground">Users</strong> lets you add
                  people. Set their <strong className="text-foreground">role</strong>{" "}
                  (CTO, Team Lead, Developer), <strong className="text-foreground">access type</strong>{" "}
                  (Member or Admin), and <strong className="text-foreground">team</strong>.
                </Step>
                <Step n={2}>
                  Role drives the workflow (Team Leads rate, the CTO approves);
                  Admin is a separate super-power for managing users. The CTO is
                  org-wide and has no team.
                </Step>
                <Step n={3}>
                  <strong className="text-rose-400">Deleting a user is permanent</strong>{" "}
                  and also removes all of their review data — monthly entries and
                  appraisals. You can&apos;t delete your own account.
                </Step>
              </ol>
            </CardContent>
          </Card>
        )}

        {/* ── Developer ── */}
        {isDeveloper && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">For You</CardTitle>
              <CardDescription>Viewing your reviews</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">My Reviews</strong> shows your
                own yearly summary and dimension breakdown once your Team Lead has
                recorded ratings for you.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}

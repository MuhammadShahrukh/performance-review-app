import { requireRole } from "@/lib/auth";
import {
  getDevelopers,
  getEntriesForDeveloper,
  findEntry,
} from "@/lib/data/repository";
import { ButtonLink } from "@/components/ui/button-link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TeamBadge } from "@/components/grade-badge";
import { monthName, TEAM_LABEL } from "@/lib/labels";

export const metadata = { title: "Dashboard — Performance Review" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireRole("TEAM_LEAD");

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // A Team Lead only sees the developers on their own team.
  const employees = await getDevelopers(user.team ?? undefined);
  const rows = await Promise.all(
    employees.map(async (emp) => {
      const [thisMonth, allEntries] = await Promise.all([
        findEntry(emp.id, month, year),
        getEntriesForDeveloper(emp.id, year),
      ]);
      return {
        emp,
        submittedThisMonth: Boolean(thisMonth),
        entriesThisYear: allEntries.length,
      };
    }),
  );

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">
          {user.team ? `${TEAM_LABEL[user.team]} Team` : "Team"} Dashboard
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Monthly ratings for {monthName(month)} {year}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>{monthName(month)} status</TableHead>
              <TableHead>Entries in {year}</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ emp, submittedThisMonth, entriesThisYear }) => (
              <TableRow key={emp.id}>
                <TableCell>
                  <div className="font-medium">{emp.name}</div>
                  <div className="text-xs text-zinc-500">{emp.email}</div>
                </TableCell>
                <TableCell>
                  <TeamBadge team={emp.team} />
                </TableCell>
                <TableCell>
                  {submittedThisMonth ? (
                    <Badge className="border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      Submitted
                    </Badge>
                  ) : (
                    <Badge className="border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      Not yet
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{entriesThisYear}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <ButtonLink href={`/developer/${emp.id}`} variant="outline" size="sm">
                      History
                    </ButtonLink>
                    <ButtonLink href={`/entry/${emp.id}`} size="sm">
                      {submittedThisMonth ? "View entry" : "Rate"}
                    </ButtonLink>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-sm text-zinc-500"
                >
                  No employees on your team yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}

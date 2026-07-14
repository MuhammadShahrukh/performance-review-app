// Team-based visibility rules, in one place.
//
//   CTO       → sees every developer, all teams
//   TEAM_LEAD → sees only developers on their own team
//   DEVELOPER → sees only themselves
//
// Kept independent of auth/repository so both server components and the
// repository can use it.

import type { Role, Team, User } from "@/types";

interface Viewer {
  id: string;
  role: Role;
  team: Team | null;
}
interface Employee {
  id: string;
  team: Team | null;
}

/** Filter a list of employees down to the ones `viewer` may see. */
export function visibleEmployees<T extends Employee>(
  viewer: Viewer,
  employees: T[],
): T[] {
  switch (viewer.role) {
    case "CTO":
      return employees;
    case "TEAM_LEAD":
      return employees.filter((e) => e.team === viewer.team);
    case "DEVELOPER":
      return employees.filter((e) => e.id === viewer.id);
  }
}

/** Whether `viewer` may view/act on a single employee. */
export function canAccessEmployee(viewer: Viewer, employee: Employee): boolean {
  switch (viewer.role) {
    case "CTO":
      return true;
    case "TEAM_LEAD":
      return employee.team === viewer.team;
    case "DEVELOPER":
      return employee.id === viewer.id;
  }
}

// Convenience for callers holding a full User.
export type { User };

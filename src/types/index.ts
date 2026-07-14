// Domain types for the Performance Review app.
// These mirror prisma/schema.prisma so the JSON layer can be swapped for
// Prisma later without changing consumers (API routes, grading, pages).

// A user's job/position in the company. Extensible (add QA, DESIGNER, …).
export type Role = "CTO" | "TEAM_LEAD" | "DEVELOPER";

// A user's system access tier — orthogonal to their job role.
// MEMBER = regular access; ADMIN = can administer the app (manage users, etc.).
export type UserType = "MEMBER" | "ADMIN";

export type Team = "API" | "CRM" | "HRM" | "UI";

// All teams, for validation and select options.
export const TEAMS: Team[] = ["API", "CRM", "HRM", "UI"];

export type Grade = "EXCEEDS" | "MEETS" | "BELOW";

export type Decision = "PENDING" | "APPROVED" | "REJECTED";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  type: UserType;
  role: Role;
  // The team this user belongs to. DEVELOPER and TEAM_LEAD have one; the CTO is
  // org-wide, so null.
  team: Team | null;
}

export interface Dimension {
  id: string;
  name: string;
  // Archived dimensions/questions stay in the data (so historical ratings keep
  // their meaning) but are hidden from new monthly entry forms.
  active: boolean;
}

export interface Question {
  id: string;
  text: string;
  dimensionId: string;
  active: boolean;
}

export interface MonthlyEntryAnswer {
  id: string;
  monthlyEntryId: string;
  questionId: string;
  grade: Grade;
}

export interface MonthlyEntry {
  id: string;
  developerId: string;
  month: number; // 1-12
  year: number;
  createdAt: string; // ISO string
}

export interface Appraisal {
  id: string;
  developerId: string;
  year: number;
  finalGrade: Grade;
  decision: Decision;
  ctoNote: string | null;
  createdAt: string; // ISO string
}

// ─── Numeric scoring ────────────────────────────────────────────────────────

export const GRADE_SCORE: Record<Grade, number> = {
  EXCEEDS: 3,
  MEETS: 2,
  BELOW: 1,
};

// ─── Derived / computed shapes returned by the grading engine and APIs ────────

export interface DimensionBreakdown {
  dimensionId: string;
  dimensionName: string;
  average: number; // average across its 3 questions over available months
}

export interface YearlySummary {
  developerId: string;
  year: number;
  monthsIncluded: number[]; // which months contributed
  dimensions: DimensionBreakdown[];
  finalScore: number; // average of the 4 dimension averages
  finalGrade: Grade;
  recommendation: Recommendation;
}

export type Recommendation =
  | "STRONGLY_RECOMMEND"
  | "RECOMMEND"
  | "DO_NOT_RECOMMEND";

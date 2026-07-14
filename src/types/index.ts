// Domain types for the Performance Review app.
// These mirror prisma/schema.prisma so the JSON layer can be swapped for
// Prisma later without changing consumers (API routes, grading, pages).

export type Role = "TEAM_LEAD" | "CTO" | "EMPLOYEE";

export type Grade = "EXCEEDS" | "MEETS" | "BELOW";

export type Decision = "PENDING" | "APPROVED" | "REJECTED";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
}

export interface Dimension {
  id: string;
  name: string;
}

export interface Question {
  id: string;
  text: string;
  dimensionId: string;
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

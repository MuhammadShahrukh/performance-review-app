// Display-label helpers. Keep all user-facing text mappings in one place.

import type { Grade, Decision, Recommendation, Role } from "@/types";

export const GRADE_LABEL: Record<Grade, string> = {
  EXCEEDS: "Exceeds Expectations",
  MEETS: "Meets Expectations",
  BELOW: "Below Expectations",
};

export const GRADE_SHORT: Record<Grade, string> = {
  EXCEEDS: "Exceeds",
  MEETS: "Meets",
  BELOW: "Below",
};

export const DECISION_LABEL: Record<Decision, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const RECOMMENDATION_LABEL: Record<Recommendation, string> = {
  STRONGLY_RECOMMEND: "Strongly Recommend Appraisal",
  RECOMMEND: "Recommend Appraisal",
  DO_NOT_RECOMMEND: "Do Not Recommend",
};

export const ROLE_LABEL: Record<Role, string> = {
  TEAM_LEAD: "Team Lead",
  CTO: "CTO",
  EMPLOYEE: "Employee",
};

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? String(month);
}

// Display-label helpers. Keep all user-facing text mappings in one place.

import type {
  Grade,
  Decision,
  Recommendation,
  Role,
  UserType,
  Team,
} from "@/types";

export const TEAM_LABEL: Record<Team, string> = {
  API: "API",
  CRM: "CRM",
  HRM: "HRM",
  UI: "UI",
};

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
  CTO: "CTO",
  TEAM_LEAD: "Team Lead",
  DEVELOPER: "Developer",
};

export const TYPE_LABEL: Record<UserType, string> = {
  MEMBER: "Member",
  ADMIN: "Admin",
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

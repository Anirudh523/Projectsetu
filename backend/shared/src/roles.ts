export const ROLES = ["admin", "officer", "student", "pal"] as const;
export type Role = (typeof ROLES)[number];
export const WRITER_ROLES: readonly Role[] = ["student", "pal"];
export const STAFF_ROLES: readonly Role[] = ["admin", "officer"];
export const isRole = (v: unknown): v is Role =>
  typeof v === "string" && (ROLES as readonly string[]).includes(v);
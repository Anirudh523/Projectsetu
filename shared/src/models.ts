import type { Role } from "./roles.js";
export type Ts = { toMillis(): number }; // works with web and Admin Timestamps

export const COL = {
  users: "users", identities: "identities", pairs: "pairs", letters: "letters",
  drafts: "drafts", reports: "reports", audit: "audit",
} as const;

export interface UserDoc {      // users/{uid}: safe for the person and their pal
  displayName: string;
  role: Role | null;            // null until an admin approves
  status: "pending" | "approved" | "disabled";
  pairId: string | null;
  createdAt: Ts;
}
export interface IdentityDoc {  // identities/{uid}: staff only
  legalName: string;
  school: string | null;
  guardianName: string | null;
  guardianContact: string | null;
  consent: boolean;
}
export interface PairDoc {
  studentUid: string;
  palUid: string;
  members: [string, string];    // rules check membership with this
  status: "active" | "paused" | "ended";
  createdAt: Ts;
}
export interface LetterDoc {    // written only by Cloud Functions
  pairId: string;
  authorUid: string;
  recipientUid: string;
  body: string;
  status: "in_review" | "approved" | "returned";
  createdAt: Ts;
  reviewedBy: string | null;
  returnNote: string | null;
  priority: number;
}
export type Role = 'student' | 'pal' | 'officer' | 'admin';

export type Ts = { toMillis(): number }; // works with web and Admin Timestamps

export const COL = {
  users: 'users',
  identities: 'identities',
  pairs: 'pairs',
  letters: 'letters',
  drafts: 'drafts',
  reports: 'reports',
  audit: 'audit',
} as const;

export interface UserDoc {
  displayName: string;
  role: Role | null;
  status: 'pending' | 'approved' | 'disabled';
  pairId: string | null;
  createdAt: Ts;
}

export interface IdentityDoc {
  legalName: string;
  school: string | null;
  guardianName: string | null;
  guardianContact: string | null;
  consent: boolean;
}

export interface PairDoc {
  studentUid: string;
  palUid: string;
  members: [string, string];
  status: 'active' | 'paused' | 'ended';
  createdAt: Ts;
}

export interface LetterDoc {
  pairId: string;
  authorUid: string;
  recipientUid: string;
  body: string;
  status: 'in_review' | 'approved' | 'returned';
  createdAt: Ts;
  submittedAt: Ts;
  reviewedBy: string | null;
  reviewedAt: Ts | null;
  returnNote: string | null;
  priority: number;
}

export interface ReportDoc {
  pairId: string;
  reporterUid: string;
  reason: string;
  status: 'open';
  createdAt: Ts;
}

export interface AuditDoc {
  actor: string;
  action: string;
  target: string;
  timestamp: Ts;
}

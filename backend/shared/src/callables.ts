import type { Role } from "./roles.js";
export interface Callables {
  adminApproveUser: { req: { uid: string; role: Role }; res: { ok: true } };
  adminSetRole:     { req: { uid: string; role: Role }; res: { ok: true } };
  signOutEverywhere:{ req: Record<string, never>; res: { ok: true } };
  adminCreatePair:  { req: { studentUid: string; palUid: string }; res: { pairId: string } };
  submitLetter:     { req: { pairId: string; body: string; letterId?: string };
                      res: { letterId: string; status: "in_review" } };
  reviewLetter:     { req: { letterId: string; action: "approve" | "return"; note?: string };
                      res: { ok: true } };
  reportPair:       { req: { pairId: string; reason: string }; res: { reportId: string } };
  adminUnpausePair: { req: { pairId: string }; res: { ok: true } };
}
export type CallableName = keyof Callables;
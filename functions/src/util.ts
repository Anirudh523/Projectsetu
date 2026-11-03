import { HttpsError, onCall, type CallableRequest } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { COL, REGION, isRole, type Callables, type CallableName, type ErrorReason, type Role } from "@setu/shared";

export function fail(code: ConstructorParameters<typeof HttpsError>[0], reason: ErrorReason, message: string): never {
  throw new HttpsError(code, message, { reason });
}

export async function requireCaller(req: CallableRequest, roles?: readonly Role[]) {
  if (!req.auth) fail("unauthenticated", "NOT_SIGNED_IN", "Sign in first.");
  const user = await getFirestore().collection(COL.users).doc(req.auth.uid).get();
  const data = user.data();
  const role = user.exists && data?.status === "approved" && isRole(data.role) ? data.role : null;
  if (roles && (!role || !roles.includes(role))) fail("permission-denied", "NOT_AUTHORIZED", "You can't do that.");
  return { uid: req.auth.uid, role };
}

export function callable<N extends CallableName>(
  _name: N,
  handler: (data: Callables[N]["req"], req: CallableRequest<Callables[N]["req"]>) => Promise<Callables[N]["res"]>,
) {
  return onCall<Callables[N]["req"], Promise<Callables[N]["res"]>>({ region: REGION }, (req) => handler(req.data, req));
}

export function stub<N extends CallableName>(name: N, roles?: readonly Role[]) {
  return callable(name, async (_data, req) => {
    await requireCaller(req, roles);
    throw new HttpsError("unimplemented", `${name} is not built yet.`);
  });
}
import { HttpsError, onCall, type CallableRequest } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/logger";
import {
  COL, ERROR_REASONS, REGION, isRole,
  type Callables, type CallableName, type ErrorReason, type Role,
} from "@setu/shared";

export function fail(code: ConstructorParameters<typeof HttpsError>[0], reason: ErrorReason, message: string): never {
  throw new HttpsError(code, message, { reason });
}

function hasErrorReason(details: unknown): details is { reason: ErrorReason } {
  if (typeof details !== "object" || details === null || !("reason" in details)) return false;
  const reason = details.reason;
  return typeof reason === "string" && (ERROR_REASONS as readonly string[]).includes(reason);
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
  name: N,
  handler: (data: Callables[N]["req"], req: CallableRequest<Callables[N]["req"]>) => Promise<Callables[N]["res"]>,
) {
  return onCall<Callables[N]["req"], Promise<Callables[N]["res"]>>({ region: REGION }, async (req) => {
    try {
      return await handler(req.data, req);
    } catch (error) {
      if (error instanceof HttpsError) {
        if (hasErrorReason(error.details)) throw error;
        throw new HttpsError(error.code, error.message, { reason: "INTERNAL_ERROR" });
      }
      logger.error(`Callable ${name} failed unexpectedly.`, { error });
      throw new HttpsError("internal", "An unexpected error occurred.", { reason: "INTERNAL_ERROR" });
    }
  });
}

export function stub<N extends CallableName>(name: N, roles?: readonly Role[]) {
  return callable(name, async (_data, req) => {
    await requireCaller(req, roles);
    throw new HttpsError("unimplemented", `${name} is not built yet.`, { reason: "NOT_IMPLEMENTED" });
  });
}
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { onUserCreated } from "firebase-functions/v2/identity";
import { HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/logger";
import { COL, STAFF_ROLES, WRITER_ROLES, isRole, type Role } from "@setu/shared";
import { callable, fail, requireCaller, stub } from "./util.js";

initializeApp();

const auth = getAuth();
const db = getFirestore();

export const onAuthUserCreated = onUserCreated(async (event) => {
  const user = event.data;
  const userRef = db.collection(COL.users).doc(user.uid);
  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(userRef);
    if (existing.exists) return;
    transaction.create(userRef, {
      displayName: user.displayName?.trim() || "New user",
      role: null,
      status: "pending",
      pairId: null,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
});

async function assignRole(uid: string, role: Role, expectedStatus: "pending" | "approved") {
  const target = await auth.getUser(uid);
  const previousClaims = target.customClaims ?? {};
  await auth.setCustomUserClaims(uid, { ...previousClaims, role });

  try {
    await db.runTransaction(async (transaction) => {
      const userRef = db.collection(COL.users).doc(uid);
      const user = await transaction.get(userRef);
      if (!user.exists) fail("not-found", "NOT_FOUND", "That user has no account profile.");
      if (user.get("status") !== expectedStatus) {
        fail("failed-precondition", "INVALID_STATE", "That account is not in the expected state.");
      }
      transaction.update(userRef, { role, status: "approved" });
    });
  } catch (error) {
    try {
      await auth.setCustomUserClaims(uid, previousClaims);
    } catch (rollbackError) {
      logger.error("Failed to restore custom claims after a role update failed.", {
        uid, error, rollbackError,
      });
      throw new HttpsError(
        "internal",
        "The role update failed and the previous custom claims could not be restored.",
      );
    }
    throw error;
  }
}

function validateRoleRequest(uid: unknown, role: unknown): void {
  if (typeof uid !== "string" || !uid.trim() || !isRole(role)) {
    fail("invalid-argument", "INVALID_INPUT", "A valid user ID and role are required.");
  }
}

export const adminApproveUser = callable("adminApproveUser", async ({ uid, role }, req) => {
  await requireCaller(req, ["admin"]);
  validateRoleRequest(uid, role);
  await assignRole(uid, role, "pending");
  return { ok: true };
});

export const adminSetRole = callable("adminSetRole", async ({ uid, role }, req) => {
  await requireCaller(req, ["admin"]);
  validateRoleRequest(uid, role);
  await assignRole(uid, role, "approved");
  return { ok: true };
});

export const signOutEverywhere = stub("signOutEverywhere");
export const adminCreatePair   = stub("adminCreatePair", ["admin"]);
export const submitLetter      = stub("submitLetter", WRITER_ROLES);
export const reviewLetter      = stub("reviewLetter", STAFF_ROLES);
export const reportPair        = stub("reportPair", WRITER_ROLES);
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { onUserCreated } from "firebase-functions/v2/identity";
import { HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/logger";
import {
  COL, LIMITS, WRITER_ROLES, containsPii, isRole, type Role,
} from "@setu/shared";
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

export const adminCreatePair = callable("adminCreatePair", async ({ studentUid, palUid }, req) => {
  const caller = await requireCaller(req, ["admin"]);
  if (
    typeof studentUid !== "string" || !studentUid.trim()
    || typeof palUid !== "string" || !palUid.trim()
    || studentUid === palUid
  ) {
    fail("invalid-argument", "INVALID_INPUT", "A distinct student and pal are required.");
  }

  const studentRef = db.collection(COL.users).doc(studentUid);
  const palRef = db.collection(COL.users).doc(palUid);
  const identityRef = db.collection(COL.identities).doc(studentUid);
  const pairRef = db.collection(COL.pairs).doc();
  const auditRef = db.collection(COL.audit).doc();

  await db.runTransaction(async (transaction) => {
    const [student, pal, identity] = await Promise.all([
      transaction.get(studentRef),
      transaction.get(palRef),
      transaction.get(identityRef),
    ]);

    if (!student.exists || !pal.exists) {
      fail("not-found", "NOT_FOUND", "The student or pal account was not found.");
    }
    if (
      student.get("role") !== "student" || student.get("status") !== "approved"
      || pal.get("role") !== "pal" || pal.get("status") !== "approved"
    ) {
      fail("failed-precondition", "USER_NOT_APPROVED", "The student and pal must both be approved accounts.");
    }
    if (!identity.exists || identity.get("consent") !== true) {
      fail("failed-precondition", "CONSENT_MISSING", "The student's consent is required before pairing.");
    }
    if (student.get("pairId") != null || pal.get("pairId") != null) {
      fail("failed-precondition", "ALREADY_PAIRED", "Neither person can already belong to a pair.");
    }

    const createdAt = FieldValue.serverTimestamp();
    transaction.create(pairRef, {
      studentUid, palUid, members: [studentUid, palUid], status: "active", createdAt,
    });
    transaction.update(studentRef, { pairId: pairRef.id });
    transaction.update(palRef, { pairId: pairRef.id });
    transaction.create(auditRef, {
      actor: caller.uid,
      action: "pair_created",
      target: pairRef.id,
      timestamp: createdAt,
      studentUid,
      palUid,
    });
  });

  return { pairId: pairRef.id };
});

export const submitLetter = callable("submitLetter", async ({ pairId, body, letterId }, req) => {
  const caller = await requireCaller(req);
  if (
    typeof pairId !== "string" || !pairId.trim()
    || typeof body !== "string"
    || (letterId !== undefined && (typeof letterId !== "string" || !letterId.trim()))
  ) {
    fail("invalid-argument", "INVALID_INPUT", "A pair, letter body, and valid optional letter ID are required.");
  }

  const normalizedBody = body.trim();
  if (normalizedBody.length < LIMITS.letterMinChars) {
    fail("invalid-argument", "TOO_SHORT", `Letters must be at least ${LIMITS.letterMinChars} characters.`);
  }
  if (normalizedBody.length > LIMITS.letterMaxChars) {
    fail("invalid-argument", "TOO_LONG", `Letters must be no more than ${LIMITS.letterMaxChars} characters.`);
  }
  if (containsPii(normalizedBody)) {
    fail("invalid-argument", "PII_BLOCKED", "Letters cannot include contact information.");
  }

  const userRef = db.collection(COL.users).doc(caller.uid);
  const pairRef = db.collection(COL.pairs).doc(pairId);
  const letterRef = letterId ? db.collection(COL.letters).doc(letterId) : db.collection(COL.letters).doc();
  const weekStart = Date.now() - LIMITS.weekMs;
  const recentLetters = db.collection(COL.letters)
    .where("authorUid", "==", caller.uid)
    .where("submittedAt", ">=", new Date(weekStart));

  await db.runTransaction(async (transaction) => {
    const [user, pair, existingLetter, weekly] = await Promise.all([
      transaction.get(userRef),
      transaction.get(pairRef),
      letterId ? transaction.get(letterRef) : Promise.resolve(null),
      transaction.get(recentLetters),
    ]);

    if (!user.exists) fail("permission-denied", "NOT_AUTHORIZED", "Only approved students and pals can submit letters.");
    const role = user.get("role");
    if (user.get("status") !== "approved" || !isRole(role) || !WRITER_ROLES.includes(role)) {
      fail("permission-denied", "NOT_AUTHORIZED", "Only approved students and pals can submit letters.");
    }
    if (!pair.exists) fail("not-found", "NOT_FOUND", "That pair was not found.");
    if (pair.get("status") !== "active") {
      fail("failed-precondition", "PAIR_PAUSED", "Letters can only be submitted while the pair is active.");
    }
    const studentUid = pair.get("studentUid");
    const palUid = pair.get("palUid");
    const members = pair.get("members");
    if (
      typeof studentUid !== "string" || typeof palUid !== "string"
      || studentUid === palUid
      || !Array.isArray(members) || !members.includes(studentUid) || !members.includes(palUid)
      || !members.includes(caller.uid) || user.get("pairId") !== pairId
      || (caller.uid === studentUid && role !== "student")
      || (caller.uid === palUid && role !== "pal")
      || (caller.uid !== studentUid && caller.uid !== palUid)
    ) {
      fail("permission-denied", "NOT_AUTHORIZED", "You are not an active member of that pair.");
    }
    const recipientUid = caller.uid === studentUid ? palUid : studentUid;
    const recipientRef = db.collection(COL.users).doc(recipientUid);
    const recipient = await transaction.get(recipientRef);
    const recipientRole = recipient.get("role");
    if (
      !recipient.exists || recipient.get("status") !== "approved"
      || !isRole(recipientRole)
      || recipientRole !== (recipientUid === studentUid ? "student" : "pal")
      || recipient.get("pairId") !== pairId
    ) {
      fail("failed-precondition", "INVALID_STATE", "The other pair member is no longer eligible.");
    }

    if (letterId) {
      if (!existingLetter || !existingLetter.exists) fail("not-found", "NOT_FOUND", "That letter was not found.");
      if (
        existingLetter.get("authorUid") !== caller.uid
        || existingLetter.get("pairId") !== pairId
        || existingLetter.get("status") !== "returned"
      ) {
        fail("failed-precondition", "INVALID_STATE", "Only your returned letter in this pair can be resubmitted.");
      }
    }

    if (weekly.size >= LIMITS.lettersPerWeek) {
      fail("resource-exhausted", "WEEKLY_LIMIT", "You have reached the weekly letter limit.");
    }

    const timestamp = FieldValue.serverTimestamp();
    if (letterId) {
      transaction.update(letterRef, {
        body: normalizedBody,
        status: "in_review",
        recipientUid,
        submittedAt: timestamp,
        reviewedBy: null,
        reviewedAt: null,
        returnNote: null,
      });
    } else {
      transaction.create(letterRef, {
        pairId,
        authorUid: caller.uid,
        recipientUid,
        body: normalizedBody,
        status: "in_review",
        createdAt: timestamp,
        submittedAt: timestamp,
        reviewedBy: null,
        reviewedAt: null,
        returnNote: null,
        priority: 0,
      });
    }
  });

  return { letterId: letterRef.id, status: "in_review" };
});

export const reviewLetter = callable("reviewLetter", async ({ letterId, action, note }, req) => {
  const caller = await requireCaller(req, ["officer"]);
  if (
    typeof letterId !== "string" || !letterId.trim()
    || (action !== "approve" && action !== "return")
    || (note !== undefined && typeof note !== "string")
  ) {
    fail("invalid-argument", "INVALID_INPUT", "A letter ID and valid review action are required.");
  }
  const returnNote = typeof note === "string" ? note.trim() : "";
  if (action === "return" && !returnNote) {
    fail("invalid-argument", "NOTE_REQUIRED", "A note is required when returning a letter.");
  }
  if (returnNote.length > LIMITS.returnNoteMaxChars) {
    fail("invalid-argument", "TOO_LONG", `Review notes must be no more than ${LIMITS.returnNoteMaxChars} characters.`);
  }

  const letterRef = db.collection(COL.letters).doc(letterId);
  const auditRef = db.collection(COL.audit).doc();
  await db.runTransaction(async (transaction) => {
    const letter = await transaction.get(letterRef);
    if (!letter.exists) fail("not-found", "NOT_FOUND", "That letter was not found.");
    if (letter.get("status") !== "in_review") {
      fail("failed-precondition", "INVALID_STATE", "Only letters in review can be reviewed.");
    }

    const reviewedAt = FieldValue.serverTimestamp();
    transaction.update(letterRef, {
      status: action === "approve" ? "approved" : "returned",
      reviewedBy: caller.uid,
      reviewedAt,
      returnNote: action === "return" ? returnNote : null,
    });
    transaction.create(auditRef, {
      actor: caller.uid,
      action: action === "approve" ? "letter_approved" : "letter_returned",
      target: letterId,
      timestamp: reviewedAt,
    });
  });
  return { ok: true };
});

export const reportPair = callable("reportPair", async ({ pairId, reason }, req) => {
  const caller = await requireCaller(req);
  if (
    typeof pairId !== "string" || !pairId.trim()
    || typeof reason !== "string" || !reason.trim() || reason.trim().length > 1000
  ) {
    fail("invalid-argument", "INVALID_INPUT", "A pair ID and report reason of at most 1000 characters are required.");
  }
  const normalizedReason = reason.trim();
  const pairRef = db.collection(COL.pairs).doc(pairId);
  const userRef = db.collection(COL.users).doc(caller.uid);
  const reportRef = db.collection(COL.reports).doc();
  const auditRef = db.collection(COL.audit).doc();

  await db.runTransaction(async (transaction) => {
    const [pair, user] = await Promise.all([
      transaction.get(pairRef),
      transaction.get(userRef),
    ]);
    if (!pair.exists) fail("not-found", "NOT_FOUND", "That pair was not found.");
    if (!user.exists) fail("permission-denied", "NOT_AUTHORIZED", "Only an approved pair member can report a pair.");
    const role = user.get("role");
    const memberUids = [pair.get("studentUid"), pair.get("palUid")];
    const members = pair.get("members");
    if (
      user.get("status") !== "approved"
      || !isRole(role) || !WRITER_ROLES.includes(role)
      || !memberUids.includes(caller.uid)
      || !Array.isArray(members) || !members.includes(caller.uid)
      || user.get("pairId") !== pairId
      || (pair.get("studentUid") === caller.uid && role !== "student")
      || (pair.get("palUid") === caller.uid && role !== "pal")
    ) {
      fail("permission-denied", "NOT_AUTHORIZED", "Only an approved member of that pair can report it.");
    }
    if (pair.get("status") !== "active") {
      fail("failed-precondition", "PAIR_PAUSED", "That pair has already been paused.");
    }

    const timestamp = FieldValue.serverTimestamp();
    transaction.create(reportRef, {
      pairId,
      reporterUid: caller.uid,
      reason: normalizedReason,
      status: "open",
      createdAt: timestamp,
    });
    transaction.update(pairRef, { status: "paused", pausedAt: timestamp, pausedBy: caller.uid });
    transaction.create(auditRef, {
      actor: caller.uid,
      action: "pair_reported",
      target: pairId,
      timestamp,
      reportId: reportRef.id,
    });
  });

  return { reportId: reportRef.id };
});

export const adminUnpausePair = callable("adminUnpausePair", async ({ pairId }, req) => {
  const caller = await requireCaller(req, ["admin"]);
  if (typeof pairId !== "string" || !pairId.trim()) {
    fail("invalid-argument", "INVALID_INPUT", "A valid pair ID is required.");
  }
  const pairRef = db.collection(COL.pairs).doc(pairId);
  const auditRef = db.collection(COL.audit).doc();
  await db.runTransaction(async (transaction) => {
    const pair = await transaction.get(pairRef);
    if (!pair.exists) fail("not-found", "NOT_FOUND", "That pair was not found.");
    if (pair.get("status") !== "paused") {
      fail("failed-precondition", "INVALID_STATE", "Only a paused pair can be unpaused.");
    }

    const timestamp = FieldValue.serverTimestamp();
    transaction.update(pairRef, { status: "active", unpausedAt: timestamp, unpausedBy: caller.uid });
    transaction.create(auditRef, {
      actor: caller.uid,
      action: "pair_unpaused",
      target: pairId,
      timestamp,
    });
  });
  return { ok: true };
});
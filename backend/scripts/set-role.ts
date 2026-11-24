import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { COL, isRole } from "@setu/shared";

const args = process.argv.slice(2);
const projectFlag = args.indexOf("--project");
const projectId = projectFlag >= 0 ? args[projectFlag + 1] : undefined;
const positional = projectFlag >= 0
  ? args.filter((_arg, index) => index !== projectFlag && index !== projectFlag + 1)
  : args;

if (!projectId || positional.length !== 2) {
  throw new Error("Usage: set-role <uid-or-email> <role> --project <project-id>");
}

const [target, roleArg] = positional;
if (!isRole(roleArg)) {
  throw new Error(`Invalid role "${roleArg}". Choose admin, officer, student, or pal.`);
}

initializeApp({ projectId });
const auth = getAuth();
const db = getFirestore();
const user = target.includes("@")
  ? await auth.getUserByEmail(target)
  : await auth.getUser(target);
const previousClaims = user.customClaims ?? {};
await auth.setCustomUserClaims(user.uid, { ...previousClaims, role: roleArg });

try {
  await db.runTransaction(async (transaction) => {
    const userRef = db.collection(COL.users).doc(user.uid);
    const profile = await transaction.get(userRef);
    const storedName = profile.get("displayName");
    const storedPairId = profile.get("pairId");
    transaction.set(userRef, {
      displayName: typeof storedName === "string" ? storedName : user.displayName?.trim() || "New user",
      role: roleArg,
      status: "approved",
      pairId: typeof storedPairId === "string" ? storedPairId : null,
      createdAt: profile.get("createdAt") ?? FieldValue.serverTimestamp(),
    }, { merge: true });
  });
} catch (error) {
  await auth.setCustomUserClaims(user.uid, previousClaims);
  throw error;
}

console.info(`Assigned ${roleArg} role to ${user.uid} in ${projectId}.`);

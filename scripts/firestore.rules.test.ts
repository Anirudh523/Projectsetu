import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

const rules = readFileSync(resolve(fileURLToPath(new URL("../firestore.rules", import.meta.url))), "utf8");
let testEnv: RulesTestEnvironment;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-setu",
    firestore: { rules },
  });
});

after(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, "users/student1"), {
        displayName: "Riya", role: "student", status: "approved", pairId: "pair1",
      }),
      setDoc(doc(db, "users/pal1"), {
        displayName: "Arjun", role: "pal", status: "approved", pairId: "pair1",
      }),
      setDoc(doc(db, "users/other"), {
        displayName: "Other", role: "student", status: "approved", pairId: null,
      }),
      setDoc(doc(db, "users/admin1"), {
        displayName: "Admin", role: "admin", status: "approved", pairId: null,
      }),
      setDoc(doc(db, "users/officer1"), {
        displayName: "Officer", role: "officer", status: "approved", pairId: null,
      }),
      setDoc(doc(db, "users/pending-admin"), {
        displayName: "Pending", role: "admin", status: "pending", pairId: null,
      }),
      setDoc(doc(db, "pairs/pair1"), {
        studentUid: "student1", palUid: "pal1", members: ["student1", "pal1"], status: "active",
      }),
      setDoc(doc(db, "identities/student1"), { legalName: "Riya Legal", consent: true }),
      setDoc(doc(db, "identities/other"), { legalName: "Other Legal", consent: false }),
    ]);
  });
});

test("users are readable by the person and their paired pal only", async () => {
  await assertSucceeds(getDoc(doc(testEnv.authenticatedContext("student1").firestore(), "users/student1")));
  await assertSucceeds(getDoc(doc(testEnv.authenticatedContext("pal1").firestore(), "users/student1")));
  await assertFails(getDoc(doc(testEnv.authenticatedContext("other").firestore(), "users/student1")));
  await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), "users/student1")));
});

test("staff can read user profiles", async () => {
  await assertSucceeds(getDoc(doc(testEnv.authenticatedContext("admin1").firestore(), "users/other")));
  await assertSucceeds(getDoc(doc(testEnv.authenticatedContext("officer1").firestore(), "users/other")));
});

test("only approved admins and officers can read identities", async () => {
  await assertSucceeds(getDoc(doc(testEnv.authenticatedContext("admin1").firestore(), "identities/student1")));
  await assertSucceeds(getDoc(doc(testEnv.authenticatedContext("officer1").firestore(), "identities/student1")));
  await assertFails(getDoc(doc(testEnv.authenticatedContext("student1").firestore(), "identities/student1")));
  await assertFails(getDoc(doc(testEnv.authenticatedContext("other").firestore(), "identities/student1")));
  await assertFails(getDoc(doc(testEnv.authenticatedContext("pending-admin").firestore(), "identities/student1")));
  await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), "identities/student1")));
});

test("clients cannot write user or identity documents", async () => {
  const adminDb = testEnv.authenticatedContext("admin1").firestore();
  const studentDb = testEnv.authenticatedContext("student1").firestore();
  await assertFails(setDoc(doc(studentDb, "users/student1"), { role: "admin" }));
  await assertFails(setDoc(doc(adminDb, "identities/student1"), { legalName: "Changed" }));
});
